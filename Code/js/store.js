const STORAGE_KEY = "failmate_v1";

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultState() {
  return {
    projects: [],
    comments: {},
    claims: [],
    notifications: [],
    revivalTeams: [],
    pendingJoinRequests: [],
    terminalLogs: [
      { user: "@SYSTEM", action: "CLAIMED", target: "#D098", color: "primary" },
      { user: "@User_X", action: "UPVOTED", target: "Crypto-Dust", color: "secondary" },
    ],
    user: { username: "GUEST", karma: 0, burials: 0 },
    activeClaimProjectId: null,
    viewed: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      projects: parsed.projects?.length ? parsed.projects : base.projects,
      user: { ...base.user, ...parsed.user },
      activeClaimProjectId: parsed.activeClaimProjectId ?? base.activeClaimProjectId,
    };
  } catch {
    return defaultState();
  }
}

function saveStateLocal(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = defaultState();
let storeReady = false;
let unsubscribeProjects = null;

function getState() {
  return state;
}

function setState(updater) {
  state = typeof updater === "function" ? updater(state) : updater;
  saveStateLocal(state);
  return state;
}

function normalizeProjectId(id) {
  if (id == null || id === "") return "";
  try {
    return decodeURIComponent(String(id).trim());
  } catch {
    return String(id).trim();
  }
}

function getCurrentUsername() {
  const authUser = FailMateAuth?.getUser();
  if (authUser?.displayName) return authUser.displayName;
  return state.user.username || "GUEST";
}

function isClaimOwnedByUser(project) {
  if (!project?.claimedBy) return false;
  const username = getCurrentUsername();
  const uid = FailMateAuth?.getUser()?.uid;
  if (project.claimedByUid && uid) return project.claimedByUid === uid;
  return project.claimedBy === username;
}

function syncActiveClaimFromProjects() {
  if (!state.activeClaimProjectId) {
    const username = getCurrentUsername();
    const uid = FailMateAuth?.getUser()?.uid;
    const owned = state.projects.find(
      (p) => p.claimedBy && (p.claimedByUid === uid || p.claimedBy === username)
    );
    if (owned) state.activeClaimProjectId = owned.id;
    return;
  }
  const p = getProject(state.activeClaimProjectId);
  if (!p || !isClaimOwnedByUser(p)) state.activeClaimProjectId = null;
}

function getActiveClaimProject() {
  syncActiveClaimFromProjects();
  return state.activeClaimProjectId ? getProject(state.activeClaimProjectId) : null;
}

function userHasActiveClaim() {
  return !!getActiveClaimProject();
}

async function persistUserPrivate() {
  const uid = FailMateAuth?.getUser()?.uid;
  if (!uid || !FailMateDB?.isEnabled()) return;
  await FailMateDB.saveUserPrivate(uid, {
    username: state.user.username,
    karma: state.user.karma,
    burials: state.user.burials,
    notifications: state.notifications,
    revivalTeams: state.revivalTeams || [],
    pendingJoinRequests: state.pendingJoinRequests || [],
    claims: state.claims,
    activeClaimProjectId: state.activeClaimProjectId || null,
    viewed: state.viewed,
  });
}

async function persistProject(project) {
  if (!FailMateDB?.isEnabled() || !project) return;
  await FailMateDB.saveProject(project);
}

async function persistComments(projectId) {
  if (!FailMateDB?.isEnabled()) return;
  await FailMateDB.saveComments(projectId, state.comments[projectId] || []);
}

async function persistTerminalLogs() {
  if (!FailMateDB?.isEnabled()) return;
  await FailMateDB.saveTerminalLogs(state.terminalLogs);
}

function waitForAuth() {
  return new Promise((resolve) => FailMateAuth.onReady(resolve));
}

async function initStore() {
  if (storeReady) return state;

  if (!FailMateFirebase?.isEnabled()) {
    state = loadState();
    storeReady = true;
    initAutopsyLinkClicks();
    initRevivalTeamLinkClicks();
    return state;
  }

  await waitForAuth();
  const fbUser = FailMateAuth.getUser();
  if (fbUser) {
    try {
      await fbUser.getIdToken(true);
    } catch (e) {
      console.warn("[FailMate] Could not refresh auth token", e);
    }
  }

  try {
    await FailMateDB.initDatabase();
    if (fbUser) await FailMateDB.initDatabaseAfterAuth();
  } catch (e) {
    console.warn("[FailMate] Database init:", e.message);
  }

  const [projects, comments, terminalLogs] = await Promise.all([
    FailMateDB.loadProjects(),
    FailMateDB.loadComments(),
    FailMateDB.loadTerminalLogs(),
  ]);

  state = {
    ...defaultState(),
    projects,
    comments,
    terminalLogs,
  };

  const user = FailMateAuth.getUser();
  if (user) {
    try {
      const profile = await FailMateDB.loadUserProfile(user.uid);
      if (profile) {
        state.user = {
          username: profile.username || user.displayName || "OPERATOR",
          karma: profile.karma ?? 0,
          burials: profile.burials ?? 0,
        };
        state.notifications = profile.notifications || [];
        state.claims = profile.claims || [];
        state.viewed = profile.viewed || [];
        state.activeClaimProjectId = profile.activeClaimProjectId || null;
        try {
          const inbox = await FailMateDB.loadInbox(user.uid);
          const map = new Map();
          [...inbox, ...(profile.notifications || [])].forEach((n) => {
            if (n?.id) map.set(n.id, n);
          });
          state.notifications = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 80);
          state.revivalTeams = profile.revivalTeams || [];
          state.pendingJoinRequests = profile.pendingJoinRequests || [];
        } catch {
          state.notifications = profile.notifications || [];
          state.revivalTeams = profile.revivalTeams || [];
          state.pendingJoinRequests = profile.pendingJoinRequests || [];
        }
      } else {
        const username = user.displayName || user.email.split("@")[0].toUpperCase();
        state.user = { username, karma: 0, burials: 0 };
        await FailMateDB.createUserProfile(user.uid, { username, email: user.email, karma: 0, burials: 0 });
      }
    } catch (e) {
      console.warn("[FailMate] Profile load failed:", e.message);
      const username = user.displayName || user.email?.split("@")[0]?.toUpperCase() || "OPERATOR";
      state.user = { username, karma: 0, burials: 0 };
    }
  }

  syncActiveClaimFromProjects();

  if (unsubscribeProjects) unsubscribeProjects();
  unsubscribeProjects = FailMateDB.subscribeProjects((projects) => {
    setState((s) => ({ ...s, projects }));
    syncActiveClaimFromProjects();
    if (typeof FailMateSidebar !== "undefined") FailMateSidebar.scheduleRefresh();
  });

  storeReady = true;
  FailMateAuth.updateAuthUI();
  initAutopsyLinkClicks();
  initRevivalTeamLinkClicks();
  return state;
}

function deathToll() {
  return state.projects.length;
}

function addNotification(type, message, link) {
  const me = FailMateAuth?.getUser()?.uid;
  return notifyUser(me, type, message, link);
}

async function notifyUser(targetUid, type, message, link) {
  const notif = {
    id: createId(),
    type,
    message,
    link: link || "#",
    isRead: false,
    createdAt: Date.now(),
  };
  const me = FailMateAuth?.getUser()?.uid;
  if (!targetUid || targetUid === me) {
    setState((s) => ({
      ...s,
      notifications: [notif, ...(s.notifications || [])].slice(0, 80),
    }));
    await persistUserPrivate();
  }
  if (targetUid && targetUid !== me && FailMateDB?.isEnabled()) {
    try {
      await FailMateDB.pushInboxNotification(targetUid, notif);
    } catch (e) {
      console.warn("[FailMate] notifyUser:", e.message);
    }
  }
  if (typeof FailMateNotify !== "undefined") FailMateNotify.renderNotificationList?.();
  if (targetUid === me || !targetUid) {
    const toastType =
      type === "accepted"
        ? "success"
        : type === "join" || type === "github" || type === "dm"
          ? "notification"
          : "info";
    showToast(message, toastType);
  }
  if (type === "accepted" && typeof FailMateSidebar !== "undefined") {
    FailMateSidebar.scheduleRefresh();
  }
  return notif;
}

function safeExternalUrl(url) {
  if (!url) return "";
  let u = String(url).trim();
  if (!u) return "";
  if (/^github\.com\//i.test(u) || (u.includes("github.com") && !/^https?:\/\//i.test(u))) {
    return normalizeGithubUrl(u) || `https://${u.replace(/^\/+/, "")}`;
  }
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

function normalizeGithubUrl(url) {
  if (url == null || url === "") return "";
  let u = String(url).trim();
  if (!u) return "";
  u = u.replace(/^git\+https:\/\//i, "https://");
  if (/^github\.com\//i.test(u)) u = `https://${u}`;
  if (!/^https?:\/\//i.test(u)) {
    if (/github\.com/i.test(u)) u = `https://${u.replace(/^\/+/, "")}`;
    else return "";
  }
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.replace(/^www\./, "").includes("github.com")) return u;
    let path = parsed.pathname.replace(/\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) path = `/${parts[0]}/${parts[1]}`;
    return `${parsed.protocol}//${parsed.hostname}${path}`;
  } catch {
    return u.includes("github.com") && !u.startsWith("http") ? `https://${u}` : u;
  }
}

function showToast(message, type = "info") {
  playNotifySound(type);

  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }

  const icons = { info: "terminal", success: "check_circle", error: "error", notification: "notifications" };
    const toast = document.createElement("div");
    toast.className = `fm-toast fm-toast-${type}${type === "success" ? " fm-toast-accepted" : ""}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined fm-toast-icon">${icons[type] || icons.info}</span>
    <p class="fm-toast-text">${escapeHtml(message)}</p>
    <button type="button" class="fm-toast-close material-symbols-outlined" aria-label="Dismiss">close</button>`;

  toast.querySelector(".fm-toast-close")?.addEventListener("click", () => dismissToast(toast));
  host.prepend(toast);
  requestAnimationFrame(() => toast.classList.add("fm-toast-visible"));

  const ttl = type === "error" ? 5500 : 4200;
  const timer = setTimeout(() => dismissToast(toast), ttl);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.remove("fm-toast-visible");
  toast.classList.add("fm-toast-exit");
  setTimeout(() => toast.remove(), 380);
}

function playNotifySound(type = "info") {
  try {
    const ctx = window._fmAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    window._fmAudioCtx = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freq = type === "error" ? 420 : type === "success" ? 920 : type === "notification" ? 740 : 660;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.start(now);
    osc.stop(now + 0.24);

    if (type === "notification" || type === "success") {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.25, now + 0.1);
      gain2.gain.setValueAtTime(0.0001, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);
    }
  } catch {
    /* audio optional */
  }
}

function unreadCount() {
  return state.notifications.filter((n) => !n.isRead).length;
}

function getProject(id) {
  const want = normalizeProjectId(id);
  if (!want) return null;
  return state.projects.find((p) => normalizeProjectId(p.id) === want);
}

function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cacheProjectLocally(project) {
  try {
    sessionStorage.setItem(`failmate_project_${project.id}`, JSON.stringify(project));
    sessionStorage.setItem("failmate_autopsy_view", JSON.stringify(project));
  } catch {
    /* ignore quota errors */
  }
}

/** Open autopsy with full project data (does not rely on Firebase lookup). */
function navigateToAutopsy(project) {
  if (!project?.id) return;
  cacheProjectLocally(project);
  window.location.href = `autopsy.html?id=${encodeURIComponent(project.id)}`;
}

function loadAutopsyFromSession(id) {
  const want = normalizeProjectId(id);
  try {
    const view = sessionStorage.getItem("failmate_autopsy_view");
    if (view) {
      const p = JSON.parse(view);
      if (!want || normalizeProjectId(p.id) === want) return p;
    }
  } catch {
    /* ignore */
  }
  if (want) {
    try {
      const raw = sessionStorage.getItem(`failmate_project_${want}`);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function initAutopsyLinkClicks() {
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest("a[data-autopsy-id]");
      if (!link) return;
      e.preventDefault();
      const pid = normalizeProjectId(link.getAttribute("data-autopsy-id"));
      const project = getProject(pid);
      if (project) {
        navigateToAutopsy(project);
        return;
      }
      window.location.href = link.getAttribute("href") || `autopsy.html?id=${encodeURIComponent(pid)}`;
    },
    true
  );
}

function mergeProjectIntoState(project) {
  if (!project?.id) return;
  setState((s) => {
    if (s.projects.some((x) => x.id === project.id)) {
      return {
        ...s,
        projects: s.projects.map((x) => (x.id === project.id ? { ...x, ...project } : x)),
      };
    }
    return { ...s, projects: [project, ...s.projects] };
  });
}

/** Find project in memory, session cache, or Firestore (with short retry after burial). */
async function resolveProject(id) {
  const want = normalizeProjectId(id);
  if (!want) return null;

  let p = getProject(want);
  if (p) return p;

  try {
    const raw = sessionStorage.getItem(`failmate_project_${want}`);
    if (raw) {
      p = JSON.parse(raw);
      mergeProjectIntoState(p);
      p = getProject(want) || p;
      if (p) return p;
    }
  } catch {
    /* ignore */
  }

  if (FailMateDB?.isEnabled()) {
    let loaded = await FailMateDB.loadProject(want);
    if (loaded) {
      mergeProjectIntoState(loaded);
      return getProject(want) || loaded;
    }

    const all = await FailMateDB.loadProjects();
    mergeProjectsIntoState(all);
    p = getProject(want);
    if (p) return p;

    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((r) => setTimeout(r, 400));
      loaded = await FailMateDB.loadProject(want);
      if (loaded) {
        mergeProjectIntoState(loaded);
        return getProject(want) || loaded;
      }
    }
  }

  return getProject(want) || null;
}

function mergeProjectsIntoState(projects) {
  if (!projects?.length) return;
  setState((s) => {
    const map = new Map(s.projects.map((p) => [normalizeProjectId(p.id), p]));
    projects.forEach((p) => map.set(normalizeProjectId(p.id), { ...map.get(normalizeProjectId(p.id)), ...p, id: p.id }));
    return { ...s, projects: [...map.values()] };
  });
}

function filterProjects({ search = "", cause = null, category = null } = {}) {
  let list = [...state.projects].sort((a, b) => b.upvotes + b.views * 0.1 - (a.upvotes + a.views * 0.1));
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (cause) list = list.filter((p) => p.causeOfDeath === cause);
  if (category) list = list.filter((p) => p.techCategory === category);
  return list;
}

function upvoteProject(id) {
  if (!FailMateAuth.requireAuthForAction("upvote")) return;
  setState((s) => ({
    ...s,
    projects: s.projects.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p)),
    user: { ...s.user, karma: s.user.karma + 5 },
  }));
  persistProject(getProject(id));
  persistUserPrivate();
  showToast("Corpse upvoted. Karma transferred.");
}

async function claimProject(id) {
  if (!FailMateAuth.requireAuthForAction("claim a revival")) return false;
  const p = getProject(id);
  if (!p) return false;

  const username = getCurrentUsername();
  const uid = FailMateAuth.getUser()?.uid;

  if (p.claimedBy && !isClaimOwnedByUser(p)) {
    showToast(`Already claimed by ${p.claimedBy}. Pick another corpse.`);
    return false;
  }

  if (isClaimOwnedByUser(p)) {
    showToast(`You are already reviving "${p.name}".`);
    return false;
  }

  const active = getActiveClaimProject();
  if (active && active.id !== id) {
    showToast(`One revival at a time. Finish "${active.name}" before claiming another.`);
    return false;
  }

  setState((s) => ({
    ...s,
    activeClaimProjectId: id,
    projects: s.projects.map((x) =>
      x.id === id
        ? { ...x, claimedBy: username, claimedByUid: uid || null, claimedAt: Date.now(), revivalProgress: 0 }
        : x
    ),
    claims: [{ id: createId(), projectId: id, at: Date.now() }, ...s.claims],
    terminalLogs: [
      { user: `@${username}`, action: "CLAIMED", target: p.name, color: "primary" },
      ...s.terminalLogs,
    ].slice(0, 20),
    user: { ...s.user, karma: s.user.karma + 25 },
  }));
  const updated = getProject(id);
  await persistProject(updated);
  await persistUserPrivate();
  await persistTerminalLogs();

  if (typeof FailMateTeams !== "undefined" && uid && FailMateDB?.isEnabled()) {
    try {
      await FailMateTeams.createTeamForClaim(updated, uid, username);
      if (typeof FailMateSidebar !== "undefined") FailMateSidebar.scheduleRefresh();
    } catch (e) {
      console.warn("[FailMate] Revival team create:", e.message);
    }
  }

  addNotification("claim", `You claimed '${p.name}' to revive`, revivalTeamUrl(id));
  showToast(`Revival claim registered. Open Revival Team from the left panel.`, "success");
  return true;
}

function addComment(projectId, text) {
  if (!FailMateAuth.requireAuthForAction("comment")) return;
  if (!text.trim()) return;
  const author = `@${getCurrentUsername().toLowerCase()}`;
  setState((s) => {
    const list = s.comments[projectId] || [];
    return {
      ...s,
      comments: {
        ...s.comments,
        [projectId]: [...list, { author, text: text.trim(), hoursAgo: 0 }],
      },
    };
  });
  persistComments(projectId);
  showToast("Post-mortem note logged.");
}

function viewProject(id) {
  setState((s) => ({
    ...s,
    projects: s.projects.map((p) => (p.id === id ? { ...p, views: p.views + 1 } : p)),
  }));
  persistProject(getProject(id));
}

async function buryProject(data) {
  if (!FailMateAuth.requireAuthForAction("bury a project")) return null;
  const slug =
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "project";
  const id = `${slug}-${createId().slice(0, 6)}`;
  const username = getCurrentUsername();
  const uid = FailMateAuth.getUser()?.uid;
  const gh = data.githubAnalysis || null;

  const autopsyFailures = gh?.autopsyFailures?.length
    ? gh.autopsyFailures
    : [{ cause: data.causeOfDeath, title: "Primary Failure", description: data.description, severity: "error" }];

  const project = {
    id,
    code: `CF-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name,
    description: data.description,
    causeOfDeath: data.causeOfDeath,
    techCategory: data.techCategory,
    techStack: data.techStack,
    deceasedDate: data.deceasedDate,
    githubUrl: normalizeGithubUrl(data.githubUrl) || data.githubUrl,
    githubAnalysis: gh,
    buriedBy: username,
    buriedByUid: uid || null,
    upvotes: 0,
    views: 1,
    createdAt: Date.now(),
    autopsyFailures,
    reanimationPhases: gh
      ? [
          { title: "Phase 01 — Audit Codebase", description: `Review ${gh.techStack?.slice(0, 3).join(", ") || "stack"} and remove dead code.`, progress: 1 },
          { title: "Phase 02 — Fix Critical Issues", description: `${gh.openIssues || 0} open issues to triage from GitHub scan.`, progress: 0 },
          { title: "Phase 03 — Relaunch MVP", description: "Ship smallest viable revival based on autopsy findings.", progress: 0, locked: true },
        ]
      : [{ title: "Awaiting Autopsy", description: "Run analysis to generate protocol.", progress: 0 }],
  };

  setState((s) => ({
    ...s,
    projects: [project, ...s.projects],
    user: { ...s.user, karma: s.user.karma + 50, burials: s.user.burials + 1 },
    terminalLogs: [{ user: `@${username}`, action: "BURIED", target: data.name, color: "secondary" }, ...s.terminalLogs].slice(0, 20),
  }));

  try {
    await persistProject(project);
    await persistUserPrivate();
    await persistTerminalLogs();
    cacheProjectLocally(project);
    sessionStorage.setItem("failmate_autopsy_view", JSON.stringify(project));
    showToast(`'${data.name}' buried & saved to Firebase.`);
  } catch (e) {
    console.error("[FailMate] Save failed:", e);
    cacheProjectLocally(project);
    showToast("Saved locally but Firebase write failed. Check login & rules.");
  }
  return id;
}

async function generateAutopsy(projectId) {
  if (!FailMateAuth.requireAuthForAction("generate autopsy")) return;
  const p = getProject(projectId);
  if (!p) return;
  showToast("AI autopsy in progress...");
  await new Promise((r) => setTimeout(r, 1500));
  const postMortem = `[AI_POST_MORTEM]
Project "${p.name}" flatlined due to ${p.causeOfDeath.replace(/_/g, " ")}.
Root cause: market timing + technical debt after pivot #3.
Recommendation: strip non-core features and target a 500-user niche.`;
  const phases = [
    { title: "Phase 01 — Strip Fat", description: `Remove bloat from ${p.name}; ship read-only MVP in 14 days.`, progress: 2 },
    { title: "Phase 02 — Phoenix Pivot", description: "Migrate off centralized cloud; cut infra 80%.", progress: 1 },
    { title: "Phase 03 — Alpha Re-Ignition", description: "Community quorum vote before relaunch.", progress: 0, locked: true },
  ];
  setState((s) => ({
    ...s,
    projects: s.projects.map((x) => (x.id === projectId ? { ...x, postMortem, reanimationPhases: phases } : x)),
  }));
  await persistProject(getProject(projectId));
  showToast("Autopsy report generated.");
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const REVIVAL_TEAM_SESSION_KEY = "failmate_revival_team_id";

function saveRevivalTeamProjectId(id) {
  const pid = normalizeProjectId(id);
  if (pid) sessionStorage.setItem(REVIVAL_TEAM_SESSION_KEY, pid);
}

/** Resolve project id for revival-team.html from URL, session, or active claim. */
function getRevivalTeamProjectId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("id") || params.get("projectId") || params.get("project");
  if (fromUrl) {
    const pid = normalizeProjectId(fromUrl);
    saveRevivalTeamProjectId(pid);
    return pid;
  }
  try {
    const stored = sessionStorage.getItem(REVIVAL_TEAM_SESSION_KEY);
    if (stored) return normalizeProjectId(stored);
  } catch {
    /* ignore */
  }
  const active = getActiveClaimProject();
  if (active?.id) {
    saveRevivalTeamProjectId(active.id);
    return active.id;
  }
  return "";
}

function revivalTeamUrl(projectId) {
  const pid = normalizeProjectId(projectId);
  saveRevivalTeamProjectId(pid);
  return `revival-team.html?id=${encodeURIComponent(pid)}`;
}

function initRevivalTeamLinkClicks() {
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest("a[href*='revival-team.html']");
      if (!link) return;
      try {
        const href = link.getAttribute("href") || "";
        const url = new URL(href, window.location.href);
        const id = url.searchParams.get("id");
        if (id) saveRevivalTeamProjectId(id);
      } catch {
        /* ignore */
      }
    },
    true
  );
}

function setActiveNav(page) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const nav = el.getAttribute("data-nav");
    const active = nav === page;
    el.classList.toggle("text-primary", active);
    el.classList.toggle("font-bold", active);
    el.classList.toggle("border-b-2", active);
    el.classList.toggle("border-primary", active);
    el.classList.toggle("text-on-surface-variant", !active);
  });
}

function renderDeathToll() {
  document.querySelectorAll("[data-death-toll]").forEach((el) => {
    el.textContent = deathToll().toLocaleString();
  });
}

function initNotifications() {
  const bell = document.getElementById("notif-bell");
  const panel = document.getElementById("notif-panel");
  const list = document.getElementById("notif-list");
  const dot = document.getElementById("notif-dot");
  if (!bell) return;
  if (bell._notifInited) return;
  bell._notifInited = true;

  function render() {
    const count = unreadCount();
    if (dot) dot.classList.toggle("hidden", count === 0);
    if (!list) return;
    if (!state.notifications.length) {
      list.innerHTML = '<p class="p-4 text-data-sm text-on-surface-variant/60">No signals detected.</p>';
      return;
    }
    list.innerHTML = state.notifications
      .map(
        (n) => `
      <a href="${n.link}" class="block p-4 hover:bg-surface-variant/20 border-l-2 ${n.isRead ? "border-transparent" : "border-primary-container"}">
        <p class="text-data-sm text-on-surface-variant">${n.message}</p>
      </a>`
      )
      .join("");
  }

  const backdrop = document.getElementById("notif-backdrop");
  bell.addEventListener("click", () => {
    panel?.classList.toggle("hidden");
    const isOpen = panel && !panel.classList.contains("hidden");
    if (backdrop) backdrop.classList.toggle("hidden", !isOpen);
    if (isOpen) {
      setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, isRead: true })) }));
      persistUserPrivate();
      render();
    }
  });
  backdrop?.addEventListener("click", () => {
    panel?.classList.add("hidden");
    backdrop.classList.add("hidden");
  });
  render();
}

function initGlassHover() {
  document.querySelectorAll(".glass-panel").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-4px)";
      card.style.boxShadow = "0 0 20px rgba(0, 255, 65, 0.05)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.boxShadow = "";
    });
  });
}
