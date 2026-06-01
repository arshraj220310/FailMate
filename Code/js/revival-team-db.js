const FailMateTeams = (() => {
  function db() {
    return FailMateFirebase.getDb();
  }

  function teamRef(projectId) {
    return db().collection("revivalTeams").doc(projectId);
  }

  async function waitAuth() {
    await FailMateDB.waitForAuthToken();
  }

  function firestoreError(err) {
    const msg = err?.message || String(err);
    if (/permission|insufficient/i.test(msg)) {
      return new Error(
        "Firestore blocked this action. Publish firestore.rules from this project in Firebase Console."
      );
    }
    return err instanceof Error ? err : new Error(msg);
  }

  function currentUser() {
    const u = FailMateAuth.getUser();
    if (!u) throw new Error("Sign in required");
    return u;
  }

  function parseGithubRepo(url) {
    const normalized = normalizeGithubUrl(url);
    if (!normalized) return null;
    try {
      if (typeof GitHubAnalyzer !== "undefined") return GitHubAnalyzer.parseRepoUrl(normalized);
    } catch {
      /* fallback */
    }
    const m = normalized.match(/github\.com\/([^/\s?#]+)\/([^/\s?#.]+)/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, ""), full: `${m[1]}/${m[2].replace(/\.git$/, "")}` };
  }

  function githubCollaboratorInviteUrl(repoUrl) {
    const p = parseGithubRepo(normalizeGithubUrl(repoUrl));
    if (!p) return "https://github.com/settings/repositories";
    return `https://github.com/${p.owner}/${p.repo}/settings/access`;
  }

  function githubNewBranchUrl(repoUrl, branch) {
    const p = parseGithubRepo(repoUrl);
    if (!p) return repoUrl;
    const b = encodeURIComponent(branch || "revival-work");
    return `https://github.com/${p.owner}/${p.repo}/branches`;
  }

  function directChatId(uidA, uidB) {
    return [uidA, uidB].sort().join("_");
  }

  async function resolveProjectForTeam(projectId) {
    let project = getProject(projectId);
    if (project) return project;
    if (FailMateDB.isEnabled()) {
      project = await FailMateDB.loadProject(projectId);
      if (project) mergeProjectIntoState(project);
    }
    return project;
  }

  async function getTeam(projectId) {
    try {
      const snap = await teamRef(projectId).get();
      return snap.exists ? { projectId, ...snap.data() } : null;
    } catch (e) {
      throw firestoreError(e);
    }
  }

  async function createTeamForClaim(project, ownerUid, ownerUsername) {
    if (!FailMateDB.isEnabled()) return null;
    await waitAuth();
    const ref = teamRef(project.id);
    try {
      const existing = await ref.get();
      if (existing.exists) return { projectId: project.id, ...existing.data() };
      const githubUrl = normalizeGithubUrl(project.githubUrl || project.githubAnalysis?.htmlUrl || "");
      await ref.set({
        projectId: project.id,
        projectName: project.name,
        ownerUid,
        ownerUsername,
        githubUrl,
        githubRepo: parseGithubRepo(githubUrl)?.full || "",
        revivalProgress: project.revivalProgress || 0,
        createdAt: Date.now(),
      });
      await ref.collection("members").doc(ownerUid).set({
        uid: ownerUid,
        username: ownerUsername,
        role: "owner",
        githubUsername: "",
        collaboratorStatus: "owner",
        joinedAt: Date.now(),
      });
      if (FailMateDB.isEnabled()) {
        await FailMateDB.addTeamMembership(ownerUid, {
          projectId: project.id,
          projectName: project.name,
          role: "owner",
        });
      }
      return getTeam(project.id);
    } catch (e) {
      throw firestoreError(e);
    }
  }

  async function ensureTeamExists(project) {
    let team = await getTeam(project.id);
    if (team) return team;
    if (project.claimedByUid) {
      return createTeamForClaim(project, project.claimedByUid, project.claimedBy || "OWNER");
    }
    if (isClaimOwnedByUser(project)) {
      const u = FailMateAuth.getUser();
      return createTeamForClaim(project, u.uid, getCurrentUsername());
    }
    return null;
  }

  async function getMembers(projectId) {
    const snap = await teamRef(projectId).collection("members").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function isMember(projectId, uid) {
    const snap = await teamRef(projectId).collection("members").doc(uid).get();
    return snap.exists;
  }

  async function isOwner(projectId, uid) {
    const team = await getTeam(projectId);
    return !!(team && team.ownerUid === uid);
  }

  async function updateMemberGithub(projectId, githubUsername) {
    await waitAuth();
    const user = currentUser();
    if (!(await isMember(projectId, user.uid))) throw new Error("Join the team first.");
    const clean = (githubUsername || "").trim().replace(/^@/, "");
    if (!clean) throw new Error("Enter your GitHub username (no @).");
    await teamRef(projectId).collection("members").doc(user.uid).set({ githubUsername: clean }, { merge: true });
    return clean;
  }

  async function requestCollaboratorAccess(projectId, githubUsernameFromForm) {
    await waitAuth();
    const user = currentUser();
    const memberRef = teamRef(projectId).collection("members").doc(user.uid);
    const snap = await memberRef.get();
    if (!snap.exists) throw new Error("You must be an approved team member.");

    let gh = (githubUsernameFromForm || snap.data().githubUsername || "").trim().replace(/^@/, "");
    if (!gh) throw new Error("Enter your GitHub username in the field above, then click Request Collaborator.");

    await memberRef.set({ githubUsername: gh, collaboratorStatus: "pending", collaboratorRequestedAt: Date.now() }, { merge: true });

    const team = await getTeam(projectId);
    const repoUrl = normalizeGithubUrl(team?.githubUrl || "");
    await notifyUser(
      team.ownerUid,
      "github",
      `${getCurrentUsername()} (@${gh}) requests GitHub collaborator access for ${team.projectName}`,
      revivalTeamUrl(projectId)
    );

    await teamRef(projectId).collection("messages").add({
      uid: "system",
      username: "SYSTEM",
      text: `${getCurrentUsername()} (@${gh}) requested collaborator access on GitHub.`,
      createdAt: Date.now(),
    });

    return { inviteSettingsUrl: githubCollaboratorInviteUrl(repoUrl) };
  }

  async function markCollaboratorInvited(projectId, memberUid) {
    await waitAuth();
    if (!(await isOwner(projectId, currentUser().uid))) throw new Error("Only the claimer can confirm invites.");
    await teamRef(projectId).collection("members").doc(memberUid).set(
      { collaboratorStatus: "invited", collaboratorInvitedAt: Date.now() },
      { merge: true }
    );
    const m = (await teamRef(projectId).collection("members").doc(memberUid).get()).data();
    await notifyUser(
      memberUid,
      "github",
      `You were invited as collaborator on ${(await getTeam(projectId))?.projectName}. Create a branch and push your work.`,
      revivalTeamUrl(projectId)
    );
    return m;
  }

  async function requestJoin(projectId, message, githubUsername) {
    await waitAuth();
    const user = currentUser();
    const username = getCurrentUsername();
    if (await isMember(projectId, user.uid)) throw new Error("You are already on this team.");

    let team = await getTeam(projectId);
    if (!team) {
      const project = await resolveProjectForTeam(projectId);
      if (!project?.claimedBy) throw new Error("This project is not claimed yet.");
      team = await ensureTeamExists(project);
    }
    if (!team) throw new Error("Could not create revival team.");
    if (team.ownerUid === user.uid) throw new Error("You own this revival team.");

    const gh = (githubUsername || "").trim().replace(/^@/, "");
    const reqRef = teamRef(projectId).collection("joinRequests").doc(user.uid);
    try {
      const existing = await reqRef.get();
      if (existing.exists && existing.data().status === "pending") {
        throw new Error("Join request already pending.");
      }
      await reqRef.set({
        uid: user.uid,
        username,
        githubUsername: gh,
        message: (message || "").trim(),
        status: "pending",
        createdAt: Date.now(),
      });
    } catch (e) {
      if (e.message?.includes("Firestore blocked")) throw e;
      throw firestoreError(e);
    }

    await notifyUser(
      team.ownerUid,
      "join",
      `${username}${gh ? ` (@${gh})` : ""} wants to join revival: ${team.projectName}`,
      revivalTeamUrl(projectId)
    );

    if (FailMateDB.isEnabled()) {
      const pending = await FailMateDB.addPendingJoinRequest(user.uid, {
        projectId,
        projectName: team.projectName,
      });
      setState((s) => ({ ...s, pendingJoinRequests: pending }));
    }
    if (typeof FailMateSidebar !== "undefined") FailMateSidebar.scheduleRefresh();
    return true;
  }

  async function getJoinRequests(projectId, status = "pending") {
    const snap = await teamRef(projectId).collection("joinRequests").get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => !status || r.status === status);
  }

  async function approveJoin(projectId, requestUid, githubUsername) {
    await waitAuth();
    const user = currentUser();
    if (!(await isOwner(projectId, user.uid))) throw new Error("Only the claimer can approve members.");

    const reqRef = teamRef(projectId).collection("joinRequests").doc(requestUid);
    const req = await reqRef.get();
    if (!req.exists) throw new Error("Request not found");
    const data = req.data();
    const gh = (githubUsername || data.githubUsername || "").trim().replace(/^@/, "");

    await teamRef(projectId).collection("members").doc(requestUid).set({
      uid: requestUid,
      username: data.username,
      githubUsername: gh,
      role: "member",
      collaboratorStatus: gh ? "needs_invite" : "unknown",
      joinedAt: Date.now(),
    });

    await reqRef.update({ status: "approved", resolvedAt: Date.now() });
    await teamRef(projectId).collection("messages").add({
      uid: "system",
      username: "SYSTEM",
      text: `${data.username}${gh ? ` (@${gh})` : ""} joined the revival team. Claimer: invite them on GitHub.`,
      createdAt: Date.now(),
    });

    const team = await getTeam(projectId);
    const teamUrl = revivalTeamUrl(projectId);

    await notifyUser(
      requestUid,
      "accepted",
      `You're in! Accepted to "${team.projectName}" — open Revival Team to collaborate.`,
      teamUrl
    );

    if (FailMateDB.isEnabled()) {
      const teams = await FailMateDB.addTeamMembership(requestUid, {
        projectId,
        projectName: team.projectName,
        role: "member",
        justAccepted: true,
      });
      const pending = await FailMateDB.removePendingJoinRequest(requestUid, projectId);
      setState((s) => ({ ...s, revivalTeams: teams, pendingJoinRequests: pending }));
    }
    if (typeof FailMateSidebar !== "undefined") {
      FailMateSidebar.markTeamAccepted(projectId);
      FailMateSidebar.scheduleRefresh();
    }
    return true;
  }

  async function rejectJoin(projectId, requestUid) {
    await waitAuth();
    if (!(await isOwner(projectId, currentUser().uid))) throw new Error("Only the claimer can reject.");
    await teamRef(projectId).collection("joinRequests").doc(requestUid).update({
      status: "rejected",
      resolvedAt: Date.now(),
    });
    if (FailMateDB.isEnabled()) {
      const pending = await FailMateDB.removePendingJoinRequest(requestUid, projectId);
      setState((s) => ({ ...s, pendingJoinRequests: pending }));
    }
    await notifyUser(requestUid, "join", `Your join request was declined. Try another revival project.`, "index.html");
    if (typeof FailMateSidebar !== "undefined") FailMateSidebar.scheduleRefresh();
    return true;
  }

  async function sendMessage(projectId, text) {
    await waitAuth();
    const user = currentUser();
    if (!(await isMember(projectId, user.uid))) throw new Error("Join the team to chat.");
    await teamRef(projectId).collection("messages").add({
      uid: user.uid,
      username: getCurrentUsername(),
      text: text.trim(),
      createdAt: Date.now(),
    });
  }

  function subscribeMessages(projectId, onChange) {
    return teamRef(projectId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limitToLast(100)
      .onSnapshot((snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  async function sendPrivateMessage(projectId, toUid, text) {
    await waitAuth();
    const user = currentUser();
    if (!(await isMember(projectId, user.uid))) throw new Error("Join the team to DM.");
    if (!(await isMember(projectId, toUid))) throw new Error("Invalid recipient.");
    const chatId = directChatId(user.uid, toUid);
    const ref = teamRef(projectId).collection("directMessages").doc(chatId);
    await ref.collection("messages").add({
      fromUid: user.uid,
      toUid,
      username: getCurrentUsername(),
      text: text.trim(),
      createdAt: Date.now(),
    });
    await ref.set(
      {
        chatId,
        participants: [user.uid, toUid].sort(),
        lastMessageAt: Date.now(),
        lastPreview: text.trim().slice(0, 120),
      },
      { merge: true }
    );
    await notifyUser(
      toUid,
      "dm",
      `Private message from ${getCurrentUsername()} (${(await getTeam(projectId))?.projectName})`,
      `${revivalTeamUrl(projectId)}&dm=${encodeURIComponent(toUid)}`
    );
  }

  function subscribePrivateMessages(projectId, peerUid, onChange) {
    const user = FailMateAuth.getUser();
    if (!user) return () => {};
    const chatId = directChatId(user.uid, peerUid);
    return teamRef(projectId)
      .collection("directMessages")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limitToLast(100)
      .onSnapshot((snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  async function submitGithubWork(projectId, data) {
    await waitAuth();
    const user = currentUser();
    if (!(await isMember(projectId, user.uid))) throw new Error("Join the team first.");
    const branch = (data.branchName || "").trim();
    const summary = (data.summary || "").trim();
    if (!branch || !summary) throw new Error("Branch name and summary are required.");

    const progressDelta = Math.min(20, 8 + Math.floor(summary.length / 80) + (data.prUrl ? 5 : 0));
    const doc = await teamRef(projectId).collection("githubSubmissions").add({
      uid: user.uid,
      username: getCurrentUsername(),
      githubUsername: data.githubUsername || "",
      branchName: branch,
      prUrl: (data.prUrl || "").trim(),
      compareUrl: (data.compareUrl || "").trim(),
      summary,
      filesChanged: (data.filesChanged || "").trim(),
      status: "pending",
      notified: false,
      progressDelta,
      createdAt: Date.now(),
    });
    return { id: doc.id, progressDelta };
  }

  async function notifyClaimerOfWork(projectId, submissionId) {
    await waitAuth();
    const user = currentUser();
    const subRef = teamRef(projectId).collection("githubSubmissions").doc(submissionId);
    const snap = await subRef.get();
    if (!snap.exists) throw new Error("Submission not found");
    const sub = snap.data();
    if (sub.uid !== user.uid) throw new Error("Only the author can notify the claimer.");

    await subRef.update({ notified: true, notifiedAt: Date.now(), status: "awaiting_review" });
    const team = await getTeam(projectId);
    const link = sub.prUrl || sub.compareUrl || team.githubUrl || revivalTeamUrl(projectId);
    await notifyUser(
      team.ownerUid,
      "github",
      `${sub.username} ready for review: branch "${sub.branchName}" — ${sub.summary.slice(0, 80)}`,
      link
    );
    await recalculateProgress(projectId);
    return true;
  }

  async function reviewSubmission(projectId, submissionId, status) {
    await waitAuth();
    if (!(await isOwner(projectId, currentUser().uid))) throw new Error("Only claimer can review.");
    const valid = ["reviewed", "merged", "changes_requested"];
    if (!valid.includes(status)) throw new Error("Invalid status");
    const subRef = teamRef(projectId).collection("githubSubmissions").doc(submissionId);
    const snap = await subRef.get();
    if (!snap.exists) throw new Error("Not found");
    await subRef.update({ status, reviewedAt: Date.now() });
    const sub = snap.data();
    await notifyUser(
      sub.uid,
      "github",
      `Your branch "${sub.branchName}" was marked ${status.toUpperCase()} by the claimer.`,
      revivalTeamUrl(projectId)
    );
    if (status === "merged") await recalculateProgress(projectId);
    return true;
  }

  async function getGithubSubmissions(projectId) {
    const snap = await teamRef(projectId).collection("githubSubmissions").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function addWorkLog(projectId, title, description) {
    await waitAuth();
    const user = currentUser();
    if (!(await isMember(projectId, user.uid))) throw new Error("Join the team to log work.");
    const progressDelta = Math.min(10, 4 + Math.floor((description || "").length / 150));
    await teamRef(projectId).collection("workLogs").add({
      uid: user.uid,
      username: getCurrentUsername(),
      title: title.trim(),
      description: description.trim(),
      progressDelta,
      createdAt: Date.now(),
    });
    return recalculateProgress(projectId);
  }

  async function getWorkLogs(projectId) {
    const snap = await teamRef(projectId).collection("workLogs").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  function updatePhasesFromProgress(phases, pct) {
    const list = phases.length
      ? [...phases]
      : [
          { title: "Phase 01 — Team Assembly", description: "Invite collaborators on GitHub.", progress: 0 },
          { title: "Phase 02 — Branch Work", description: "Team pushes to feature branches.", progress: 0 },
          { title: "Phase 03 — Merge & Relaunch", description: "Claimer merges PRs to main.", progress: 0, locked: true },
        ];
    const p1 = Math.min(5, Math.round((pct / 100) * 5));
    const p2 = Math.min(5, Math.max(0, Math.round(((pct - 30) / 70) * 5)));
    const p3 = pct >= 90 ? 1 : 0;
    if (list[0]) list[0] = { ...list[0], progress: p1 };
    if (list[1]) list[1] = { ...list[1], progress: p2 };
    if (list[2]) list[2] = { ...list[2], progress: p3, locked: pct < 90 };
    return list;
  }

  async function recalculateProgress(projectId) {
    const team = await getTeam(projectId);
    if (!team) return 0;
    const [logs, subs] = await Promise.all([getWorkLogs(projectId), getGithubSubmissions(projectId)]);
    let total = 0;
    logs.forEach((l) => {
      total += l.progressDelta || 0;
    });
    subs.forEach((s) => {
      if (s.status === "merged") total += s.progressDelta || 15;
      else if (s.notified || s.status === "awaiting_review") total += Math.round((s.progressDelta || 10) * 0.7);
      else total += Math.round((s.progressDelta || 8) * 0.4);
    });
    const revivalProgress = Math.min(100, Math.round(total));
    await teamRef(projectId).update({ revivalProgress, updatedAt: Date.now() });
    const project = getProject(projectId);
    if (project) {
      const phases = updatePhasesFromProgress(project.reanimationPhases || [], revivalProgress);
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, revivalProgress, reanimationPhases: phases } : p
        ),
      }));
      const updated = getProject(projectId);
      if (updated) await FailMateDB.saveProject(updated);
    }
    return revivalProgress;
  }

  function subscribeTeam(projectId, onChange) {
    return teamRef(projectId).onSnapshot((snap) => {
      onChange(snap.exists ? { projectId, ...snap.data() } : null);
    });
  }

  /** Merge profile teams + live Firestore membership scan (claimed projects). */
  async function discoverUserTeams(uid) {
    if (!uid || !FailMateDB.isEnabled()) return getState().revivalTeams || [];

    const map = new Map();

    function add(entry) {
      if (!entry?.projectId) return;
      const prev = map.get(entry.projectId);
      map.set(entry.projectId, { ...prev, ...entry, projectId: entry.projectId });
    }

    try {
      const profile = await FailMateDB.loadUserProfile(uid);
      (profile?.revivalTeams || []).forEach(add);
    } catch {
      (getState().revivalTeams || []).forEach(add);
    }

    const active = getActiveClaimProject();
    if (active && isClaimOwnedByUser(active)) {
      add({
        projectId: active.id,
        projectName: active.name,
        role: "owner",
      });
    }

    const claimed = getState().projects.filter((p) => p.claimedBy);
    await Promise.all(
      claimed.slice(0, 40).map(async (p) => {
        try {
          if (await isMember(p.id, uid)) {
            const team = await getTeam(p.id);
            add({
              projectId: p.id,
              projectName: p.name || team?.projectName || p.id,
              role: team?.ownerUid === uid ? "owner" : "member",
            });
          }
        } catch {
          /* skip */
        }
      })
    );

    const merged = Array.from(map.values()).sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));

    if (merged.length && FailMateDB.isEnabled()) {
      try {
        await FailMateDB.syncUserTeams(uid, merged);
        setState((s) => ({ ...s, revivalTeams: merged }));
      } catch {
        setState((s) => ({ ...s, revivalTeams: merged }));
      }
    }

    return merged;
  }

  return {
    getTeam,
    createTeamForClaim,
    ensureTeamExists,
    getMembers,
    isMember,
    isOwner,
    parseGithubRepo,
    githubCollaboratorInviteUrl,
    githubNewBranchUrl,
    updateMemberGithub,
    requestCollaboratorAccess,
    markCollaboratorInvited,
    requestJoin,
    getJoinRequests,
    approveJoin,
    rejectJoin,
    sendMessage,
    subscribeMessages,
    sendPrivateMessage,
    subscribePrivateMessages,
    submitGithubWork,
    notifyClaimerOfWork,
    reviewSubmission,
    getGithubSubmissions,
    addWorkLog,
    getWorkLogs,
    recalculateProgress,
    subscribeTeam,
    discoverUserTeams,
  };
})();
