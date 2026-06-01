let teamUnsub = null;
let msgUnsub = null;
let dmUnsub = null;
let currentProjectId = null;
let currentProject = null;
let currentTeam = null;
let isTeamOwner = false;
let isTeamMember = false;
let myMember = null;
let teamMembers = [];

document.addEventListener("DOMContentLoaded", () => {
  FailMateApp.boot(async () => {
    if (!FailMateAuth.requireAuth()) return;

    currentProjectId = getRevivalTeamProjectId();
    if (!currentProjectId) {
      showRoomError("NO PROJECT SELECTED", "Open from Autopsy or Dashboard → Revival Team.");
      return;
    }
    saveRevivalTeamProjectId(currentProjectId);

    currentProject = getProject(currentProjectId) || (await resolveProject(currentProjectId));
    if (!currentProject) {
      showRoomError("PROJECT NOT FOUND", "Return to the graveyard.");
      return;
    }
    if (!currentProject.claimedBy) {
      showRoomError("NOT CLAIMED", "Claim this project first from the autopsy log.");
      return;
    }

    document.getElementById("room-project-name").textContent = currentProject.name;
    document.getElementById("room-project-code").textContent = currentProject.code || "";
    const autopsyLink = document.getElementById("sidebar-autopsy-link");
    if (autopsyLink) autopsyLink.href = `autopsy.html?id=${encodeURIComponent(currentProject.id)}`;

    try {
      currentTeam = await FailMateTeams.ensureTeamExists(currentProject);
      if (!currentTeam) {
        showRoomError("TEAM NOT READY", "Could not load revival team.");
        return;
      }
      const fixedGh = normalizeGithubUrl(currentTeam.githubUrl || "");
      if (fixedGh && fixedGh !== currentTeam.githubUrl) {
        currentTeam.githubUrl = fixedGh;
      }
    } catch (e) {
      showRoomError("TEAM ERROR", e.message);
      return;
    }

    setupRepoLinks();

    const uid = FailMateAuth.getUser().uid;
    isTeamOwner = currentTeam.ownerUid === uid;
    isTeamMember = isTeamOwner || (await FailMateTeams.isMember(currentProjectId, uid));
    teamMembers = await FailMateTeams.getMembers(currentProjectId);
    myMember = teamMembers.find((m) => m.uid === uid) || null;

    if (!isTeamMember) {
      renderGuestJoinPanel(currentProject);
      return;
    }

    document.getElementById("room-guest").classList.add("hidden");
    document.getElementById("room-main").classList.remove("hidden");

    if (isTeamOwner) {
      document.getElementById("tab-commander").classList.remove("hidden");
      document.getElementById("owner-badge").classList.remove("hidden");
      document.getElementById("github-username-box")?.classList.add("hidden");
    }

    bindTabs();
    bindChat();
    bindDm();
    bindGithub();
    renderJoinRequestsPanel();
    refreshProgress();
    refreshGithubSubmissions();
    if (isTeamOwner) renderCommanderPanel();

    if (myMember?.githubUsername) syncGithubInputs(myMember.githubUsername);
    updateCollabStatus();

    teamUnsub = FailMateTeams.subscribeTeam(currentProjectId, (team) => {
      currentTeam = team;
      refreshProgress();
    });
    msgUnsub = FailMateTeams.subscribeMessages(currentProjectId, renderChatMessages);

    const dmPeer = new URLSearchParams(location.search).get("dm");
    if (dmPeer) {
      switchTab("dm");
      const sel = document.getElementById("dm-peer");
      if (sel) sel.value = dmPeer;
      startDmSubscription();
    }

    FailMateAuth.updateAuthUI();
    initGlassHover();
  });
});

function setupRepoLinks() {
  const url = normalizeGithubUrl(
    currentTeam?.githubUrl || currentProject.githubUrl || currentProject.githubAnalysis?.htmlUrl || ""
  );
  const link = document.getElementById("repo-link");
  const text = document.getElementById("repo-link-text");
  const openRepo = document.getElementById("btn-open-repo");
  if (url && link) {
    link.href = url;
    link.classList.remove("hidden");
    if (text) text.textContent = url.replace(/^https?:\/\//, "");
  }
  if (openRepo) {
    openRepo.href = url || "https://github.com";
    if (!url) openRepo.classList.add("opacity-50");
  }
}

function showRoomError(title, hint) {
  document.getElementById("room-guest")?.classList.add("hidden");
  document.getElementById("room-main")?.classList.add("hidden");
  const el = document.getElementById("room-error");
  el.classList.remove("hidden");
  el.querySelector("h2").textContent = title;
  el.querySelector("p").textContent = hint;
}

function renderGuestJoinPanel(project) {
  document.getElementById("room-main").classList.add("hidden");
  document.getElementById("room-error").classList.add("hidden");
  const guest = document.getElementById("room-guest");
  guest.classList.remove("hidden");
  guest.innerHTML = `
    <div class="glass-panel p-8 max-w-lg mx-auto border-l-4 border-primary">
      <h2 class="text-headline-md text-primary mb-2">JOIN REVIVAL TEAM</h2>
      <p class="text-data-sm text-on-surface-variant mb-4">Claimed by <strong class="text-primary-container">${escapeHtml(project.claimedBy)}</strong>. Work happens on <strong>GitHub branches</strong> — no file uploads.</p>
      <input id="join-github" class="w-full mb-3 bg-surface-container-low border border-outline-variant/40 px-3 py-2 text-data-sm" placeholder="Your GitHub username (required)" />
      <textarea id="join-message" rows="3" class="w-full bg-surface-container-low border border-outline-variant/40 p-3 text-data-sm mb-4" placeholder="Why join?"></textarea>
      <button type="button" id="btn-request-join" class="w-full px-6 py-2 bg-primary-container text-on-primary-container text-label-caps">REQUEST TO JOIN</button>
      <a href="${revivalTeamUrl(project.id)}" class="block mt-4 text-center text-label-caps text-on-surface-variant hover:text-primary text-[10px]">Refresh after approval</a>
    </div>`;
  document.getElementById("btn-request-join").addEventListener("click", async () => {
    try {
      const gh = document.getElementById("join-github").value;
      const msg = document.getElementById("join-message").value;
      await FailMateTeams.ensureTeamExists(project);
      await FailMateTeams.requestJoin(currentProjectId, msg, gh);
      showToast("Request sent. Claimer will see it in notifications.");
    } catch (e) {
      showToast(e.message);
    }
  });
}

function switchTab(tab) {
  document.querySelectorAll("[data-team-tab]").forEach((b) => {
    const on = b.getAttribute("data-team-tab") === tab;
    b.classList.toggle("border-primary", on);
    b.classList.toggle("text-primary", on);
    b.classList.toggle("border-transparent", !on);
    b.classList.toggle("text-on-surface-variant", !on);
  });
  document.querySelectorAll("[data-team-panel]").forEach((p) => p.classList.add("hidden"));
  document.getElementById(`panel-${tab}`)?.classList.remove("hidden");
  if (tab === "commander" && isTeamOwner) renderCommanderPanel();
  if (tab === "dm") startDmSubscription();
}

function bindTabs() {
  document.querySelectorAll("[data-team-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-team-tab")));
  });
}

function bindChat() {
  document.getElementById("btn-send-chat")?.addEventListener("click", sendSquadMessage);
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendSquadMessage();
    }
  });
  document.getElementById("btn-save-github")?.addEventListener("click", async () => {
    try {
      const gh =
        document.getElementById("member-github")?.value?.trim() ||
        document.getElementById("member-github-gh")?.value?.trim();
      const saved = await FailMateTeams.updateMemberGithub(currentProjectId, gh);
      showToast(`GitHub username saved: @${saved}`, "success");
      myMember = { ...myMember, githubUsername: saved };
      syncGithubInputs(saved);
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

async function sendSquadMessage() {
  const input = document.getElementById("chat-input");
  const text = input?.value.trim();
  if (!text) return;
  try {
    await FailMateTeams.sendMessage(currentProjectId, text);
    input.value = "";
  } catch (e) {
    showToast(e.message);
  }
}

function renderChatMessages(msgs) {
  const box = document.getElementById("chat-messages");
  if (!box) return;
  box.innerHTML = msgs
    .map(
      (m) => `
    <div class="p-3 ${m.uid === "system" ? "bg-primary/5 border-l-2 border-primary/30" : "border-b border-outline-variant/10"}">
      <div class="flex justify-between text-[10px] text-on-surface-variant/60 mb-1">
        <span class="text-primary-container">${escapeHtml(m.username)}</span>
        <span>${formatTime(m.createdAt)}</span>
      </div>
      <p class="text-data-sm whitespace-pre-wrap">${escapeHtml(m.text)}</p>
    </div>`
    )
    .join("");
  box.scrollTop = box.scrollHeight;
}

function bindDm() {
  const sel = document.getElementById("dm-peer");
  if (!sel) return;
  const me = FailMateAuth.getUser().uid;
  const peers = teamMembers.filter((m) => m.uid !== me);
  sel.innerHTML = peers
    .map(
      (m) =>
        `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.username)}${m.githubUsername ? ` (@${escapeHtml(m.githubUsername)})` : ""}${m.role === "owner" ? " — claimer" : ""}</option>`
    )
    .join("");
  sel.addEventListener("change", startDmSubscription);
  document.getElementById("btn-send-dm")?.addEventListener("click", sendDm);
  document.getElementById("dm-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendDm();
    }
  });
}

function startDmSubscription() {
  if (dmUnsub) dmUnsub();
  const peer = document.getElementById("dm-peer")?.value;
  if (!peer) return;
  dmUnsub = FailMateTeams.subscribePrivateMessages(currentProjectId, peer, renderDmMessages);
}

function renderDmMessages(msgs) {
  const box = document.getElementById("dm-messages");
  const me = FailMateAuth.getUser().uid;
  if (!box) return;
  box.innerHTML = msgs
    .map(
      (m) => `
    <div class="p-3 ${m.fromUid === me ? "text-right" : ""}">
      <p class="text-[10px] text-on-surface-variant/50 mb-1">${escapeHtml(m.username)} · ${formatTime(m.createdAt)}</p>
      <p class="text-data-sm inline-block px-3 py-2 rounded ${m.fromUid === me ? "bg-primary/20 text-primary" : "bg-surface-container-high"}">${escapeHtml(m.text)}</p>
    </div>`
    )
    .join("");
  box.scrollTop = box.scrollHeight;
}

async function sendDm() {
  const peer = document.getElementById("dm-peer")?.value;
  const text = document.getElementById("dm-input")?.value.trim();
  if (!peer || !text) return;
  try {
    await FailMateTeams.sendPrivateMessage(currentProjectId, peer, text);
    document.getElementById("dm-input").value = "";
  } catch (e) {
    showToast(e.message);
  }
}

function syncGithubInputs(value) {
  const v = (value || "").replace(/^@/, "");
  ["member-github", "member-github-gh"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  });
}

function updateCollabStatus() {
  const el = document.getElementById("collab-status");
  if (!el || !myMember) return;
  const s = myMember.collaboratorStatus || "unknown";
  const map = {
    owner: "You are the claimer — invite members on GitHub.",
    invited: "Collaborator invite confirmed. Create a branch and push work.",
    pending: "Waiting for claimer to invite you on GitHub…",
    needs_invite: "Request collaborator access below.",
    unknown: "Save GitHub username, then request collaborator access.",
  };
  el.textContent = map[s] || map.unknown;
}

function bindGithub() {
  document.getElementById("btn-save-github-gh")?.addEventListener("click", () => {
    document.getElementById("btn-save-github")?.click();
  });
  document.getElementById("btn-request-collab")?.addEventListener("click", async () => {
    try {
      const ghInput =
        document.getElementById("member-github-gh")?.value?.trim() ||
        document.getElementById("member-github")?.value?.trim() ||
        myMember?.githubUsername ||
        "";
      if (!ghInput) {
        showToast("Type your GitHub username in the field above first.", "error");
        document.getElementById("member-github-gh")?.focus();
        return;
      }
      const r = await FailMateTeams.requestCollaboratorAccess(currentProjectId, ghInput);
      showToast("Claimer notified. They should invite you on GitHub.", "success");
      if (r.inviteSettingsUrl) window.open(r.inviteSettingsUrl, "_blank");
      myMember = { ...myMember, githubUsername: ghInput.replace(/^@/, ""), collaboratorStatus: "pending" };
      syncGithubInputs(ghInput);
      updateCollabStatus();
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  document.getElementById("btn-submit-gh")?.addEventListener("click", async () => {
    try {
      const gh = document.getElementById("member-github")?.value || myMember?.githubUsername;
      const result = await FailMateTeams.submitGithubWork(currentProjectId, {
        branchName: document.getElementById("gh-branch").value,
        prUrl: document.getElementById("gh-pr").value,
        compareUrl: document.getElementById("gh-compare").value,
        summary: document.getElementById("gh-summary").value,
        filesChanged: document.getElementById("gh-files").value,
        githubUsername: gh,
      });
      showToast("Submission saved. Press NOTIFY CLAIMER when ready.");
      document.getElementById("gh-branch").value = "";
      document.getElementById("gh-pr").value = "";
      document.getElementById("gh-compare").value = "";
      document.getElementById("gh-summary").value = "";
      document.getElementById("gh-files").value = "";
      refreshGithubSubmissions();
      refreshProgress();
      window._lastSubmissionId = result?.id;
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

async function refreshGithubSubmissions() {
  const el = document.getElementById("github-submissions-list");
  if (!el) return;
  const subs = await FailMateTeams.getGithubSubmissions(currentProjectId);
  const me = FailMateAuth.getUser().uid;

  if (!subs.length) {
    el.innerHTML = '<p class="text-data-sm text-on-surface-variant/50">No GitHub submissions yet.</p>';
    return;
  }

  el.innerHTML = subs
    .map((s) => {
      const links = [
        s.prUrl ? `<a href="${escapeHtml(safeExternalUrl(s.prUrl))}" target="_blank" rel="noopener" class="text-label-caps text-primary hover:underline">PR</a>` : "",
        s.compareUrl ? `<a href="${escapeHtml(safeExternalUrl(s.compareUrl))}" target="_blank" rel="noopener" class="text-label-caps text-primary hover:underline ml-2">COMPARE</a>` : "",
      ]
        .filter(Boolean)
        .join("");
      const notifyBtn =
        s.uid === me && !s.notified
          ? `<button type="button" class="btn-notify-claimer mt-2 px-3 py-1 bg-primary-container text-on-primary-container text-label-caps" data-id="${escapeHtml(s.id)}">NOTIFY CLAIMER</button>`
          : s.notified
            ? `<span class="text-[10px] text-primary mt-2 block">Claimer notified · ${escapeHtml(s.status || "pending")}</span>`
            : "";
      return `
      <div class="glass-panel p-4 border-l-2 border-secondary/40">
        <div class="flex justify-between flex-wrap gap-2">
          <p class="text-data-sm text-primary">${escapeHtml(s.branchName)}</p>
          <span class="text-[10px] text-on-surface-variant">${escapeHtml(s.username)} · ${formatTime(s.createdAt)}</span>
        </div>
        <p class="text-data-sm text-on-surface-variant mt-2">${escapeHtml(s.summary)}</p>
        ${s.filesChanged ? `<p class="text-[10px] text-on-surface-variant/60 mt-1">Files: ${escapeHtml(s.filesChanged)}</p>` : ""}
        <div class="mt-2">${links}</div>
        ${notifyBtn}
      </div>`;
    })
    .join("");

  el.querySelectorAll(".btn-notify-claimer").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await FailMateTeams.notifyClaimerOfWork(currentProjectId, btn.dataset.id);
        showToast("Claimer notified — they can review on GitHub and merge.");
        refreshGithubSubmissions();
        refreshProgress();
        if (isTeamOwner) renderCommanderPanel();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

async function refreshProgress() {
  const team = currentTeam || (await FailMateTeams.getTeam(currentProjectId));
  const pct = team?.revivalProgress ?? 0;
  document.getElementById("revival-pct").textContent = `${pct}%`;
  const bar = document.getElementById("revival-bar");
  if (bar) bar.style.width = `${pct}%`;
  const label = document.getElementById("revival-label");
  if (label) {
    if (pct >= 100) label.textContent = "Revival complete — ship to production on GitHub.";
    else if (pct >= 90) label.textContent = "Phase 03 unlocked — merge remaining PRs.";
    else label.textContent = "Progress from GitHub branch work + claimer merges.";
  }
}

async function renderJoinRequestsPanel() {
  const el = document.getElementById("join-requests-inline");
  if (!el || !isTeamOwner) {
    if (el && !isTeamOwner) el.innerHTML = '<p class="text-[10px] text-on-surface-variant/50">Only claimer sees requests here.</p>';
    return;
  }
  const requests = await FailMateTeams.getJoinRequests(currentProjectId, "pending");
  if (!requests.length) {
    el.innerHTML = '<p class="text-data-sm text-on-surface-variant/50">No pending requests.</p>';
    return;
  }
  el.innerHTML = requests
    .map(
      (r) => `
    <div class="p-3 border border-outline-variant/30 rounded">
      <p class="text-data-sm text-primary">${escapeHtml(r.username)} ${r.githubUsername ? `(@${escapeHtml(r.githubUsername)})` : ""}</p>
      <p class="text-[10px] text-on-surface-variant mt-1">${escapeHtml(r.message || "")}</p>
      <input type="text" class="approve-gh w-full mt-2 bg-surface-container-low border border-outline-variant/40 px-2 py-1 text-[10px]" placeholder="GitHub username" value="${escapeHtml(r.githubUsername || "")}" data-uid="${escapeHtml(r.uid)}" />
      <div class="flex gap-1 mt-2">
        <button type="button" class="btn-approve flex-1 text-[10px] py-1 bg-primary-container text-on-primary-container" data-uid="${escapeHtml(r.uid)}">APPROVE</button>
        <button type="button" class="btn-reject flex-1 text-[10px] py-1 border border-error/40 text-error" data-uid="${escapeHtml(r.uid)}">REJECT</button>
      </div>
    </div>`
    )
    .join("");

  el.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const ghInput = el.querySelector(`.approve-gh[data-uid="${uid}"]`);
      try {
        await FailMateTeams.approveJoin(currentProjectId, uid, ghInput?.value);
        showToast("Member approved — they get a notification & sidebar link.", "success");
        teamMembers = await FailMateTeams.getMembers(currentProjectId);
        renderJoinRequestsPanel();
        bindDm();
        if (typeof FailMateSidebar !== "undefined") FailMateSidebar.scheduleRefresh();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
  el.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await FailMateTeams.rejectJoin(currentProjectId, btn.dataset.uid);
        renderJoinRequestsPanel();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

async function renderCommanderPanel() {
  const el = document.getElementById("commander-feed");
  if (!el) return;

  const [subs, members] = await Promise.all([
    FailMateTeams.getGithubSubmissions(currentProjectId),
    FailMateTeams.getMembers(currentProjectId),
  ]);
  const repoUrl = normalizeGithubUrl(currentTeam?.githubUrl || "");
  const inviteUrl = FailMateTeams.githubCollaboratorInviteUrl(repoUrl);

  const pendingCollab = members.filter((m) => m.role !== "owner" && m.collaboratorStatus === "pending");

  el.innerHTML = `
    <div class="glass-panel p-4 mb-4 border-l-4 border-primary">
      <h3 class="text-label-caps text-primary mb-2">GITHUB — INVITE COLLABORATORS</h3>
      <p class="text-data-sm text-on-surface-variant mb-2">Open repo settings → Add people → invite each member's GitHub username.</p>
      <a href="${escapeHtml(inviteUrl)}" target="_blank" rel="noopener" class="inline-block px-4 py-2 bg-primary-container text-on-primary-container text-label-caps">OPEN GITHUB ACCESS SETTINGS</a>
      ${
        pendingCollab.length
          ? `<ul class="mt-3 space-y-2">${pendingCollab
              .map(
                (m) => `
            <li class="flex flex-wrap justify-between gap-2 items-center text-data-sm">
              <span>${escapeHtml(m.username)} @${escapeHtml(m.githubUsername || "?")}</span>
              <button type="button" class="btn-mark-invited px-2 py-1 text-[10px] border border-primary-container text-primary-container" data-uid="${escapeHtml(m.uid)}">MARK INVITED</button>
            </li>`
              )
              .join("")}</ul>`
          : '<p class="text-[10px] text-on-surface-variant/50 mt-2">No pending collaborator requests.</p>'
      }
    </div>
    <h3 class="text-label-caps text-primary mb-3">BRANCH / PR REVIEW QUEUE</h3>
    ${
      subs.length
        ? subs
            .map((s) => {
              const links = [
                s.prUrl ? `<a href="${escapeHtml(safeExternalUrl(s.prUrl))}" target="_blank" class="text-primary text-label-caps">View PR</a>` : "",
                s.compareUrl ? `<a href="${escapeHtml(safeExternalUrl(s.compareUrl))}" target="_blank" class="text-primary text-label-caps ml-2">Compare</a>` : "",
              ].join("");
              return `
        <div class="glass-panel p-4 mb-3 border-l-2 ${s.notified ? "border-secondary" : "border-outline-variant/30"}">
          <div class="flex justify-between">
            <p class="text-data-sm text-primary">${escapeHtml(s.branchName)} · ${escapeHtml(s.username)}</p>
            <span class="text-[10px] uppercase">${escapeHtml(s.status || "pending")}</span>
          </div>
          <p class="text-data-sm text-on-surface-variant mt-1">${escapeHtml(s.summary)}</p>
          <p class="text-[10px] mt-1">${links}</p>
          <div class="flex flex-wrap gap-2 mt-3">
            <button type="button" class="btn-review px-2 py-1 text-[10px] bg-primary-container text-on-primary-container" data-id="${escapeHtml(s.id)}" data-status="merged">MARK MERGED</button>
            <button type="button" class="btn-review px-2 py-1 text-[10px] border border-primary-container text-primary-container" data-id="${escapeHtml(s.id)}" data-status="reviewed">REVIEWED</button>
            <button type="button" class="btn-review px-2 py-1 text-[10px] border border-error/40 text-error" data-id="${escapeHtml(s.id)}" data-status="changes_requested">CHANGES</button>
          </div>
        </div>`;
            })
            .join("")
        : '<p class="text-data-sm text-on-surface-variant/50">No branch submissions yet.</p>'
    }`;

  el.querySelectorAll(".btn-mark-invited").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await FailMateTeams.markCollaboratorInvited(currentProjectId, btn.dataset.uid);
        showToast("Member marked as invited on GitHub.");
        renderCommanderPanel();
      } catch (e) {
        showToast(e.message);
      }
    });
  });

  el.querySelectorAll(".btn-review").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await FailMateTeams.reviewSubmission(currentProjectId, btn.dataset.id, btn.dataset.status);
        showToast(`Marked as ${btn.dataset.status}.`);
        refreshGithubSubmissions();
        refreshProgress();
        renderCommanderPanel();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}
