const STORAGE_KEY = "failmate_v1";

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultState() {
  return {
    projects: structuredClone(SEED_PROJECTS),
    comments: structuredClone(SEED_COMMENTS),
    claims: [],
    notifications: [],
    terminalLogs: [
      { user: "@SYSTEM", action: "CLAIMED", target: "#D098", color: "primary" },
      { user: "@User_X", action: "UPVOTED", target: "Crypto-Dust", color: "secondary" },
    ],
    user: { username: "GUEST", karma: 0, burials: 0 },
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
  if (!FailMateFirebase?.isEnabled()) saveStateLocal(state);
  return state;
}

function getCurrentUsername() {
  const authUser = FailMateAuth?.getUser();
  if (authUser?.displayName) return authUser.displayName;
  return state.user.username || "GUEST";
}

async function persistUserPrivate() {
  const uid = FailMateAuth?.getUser()?.uid;
  if (!uid || !FailMateDB?.isEnabled()) return;
  await FailMateDB.saveUserPrivate(uid, {
    username: state.user.username,
    karma: state.user.karma,
    burials: state.user.burials,
    notifications: state.notifications,
    claims: state.claims,
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
    await FailMateDB.seedIfNeeded();
  } catch (e) {
    console.warn("[FailMate] Database seed skipped:", e.message);
    if (e.code === "permission-denied" || /permission/i.test(e.message)) {
      console.warn(
        "[FailMate] Deploy Firestore rules: Firebase Console → Firestore → Rules → paste firestore.rules → Publish"
      );
    }
  }

  const [projects, comments, terminalLogs] = await Promise.all([
    FailMateDB.loadProjects(),
    FailMateDB.loadComments(),
    FailMateDB.loadTerminalLogs(),
  ]);

  state = {
    ...defaultState(),
    projects: projects.length ? projects : structuredClone(SEED_PROJECTS),
    comments,
    terminalLogs: terminalLogs.length ? terminalLogs : defaultState().terminalLogs,
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

  if (unsubscribeProjects) unsubscribeProjects();
  unsubscribeProjects = FailMateDB.subscribeProjects((projects) => {
    state = { ...state, projects };
  });

  storeReady = true;
  FailMateAuth.updateAuthUI();
  return state;
}

function deathToll() {
  return DEATH_TOLL_BASE + state.projects.length;
}

function addNotification(type, message, link) {
  setState((s) => ({
    ...s,
    notifications: [
      { id: createId(), type, message, link, isRead: false, createdAt: Date.now() },
      ...s.notifications,
    ].slice(0, 50),
  }));
  persistUserPrivate();
}

function showToast(message) {
  const el = document.getElementById("toast");
  const msg = document.getElementById("toast-message");
  if (!el || !msg) return;
  msg.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 4000);
}

function unreadCount() {
  return state.notifications.filter((n) => !n.isRead).length;
}

function getProject(id) {
  return state.projects.find((p) => p.id === id);
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

function claimProject(id) {
  if (!FailMateAuth.requireAuthForAction("claim a revival")) return;
  const p = getProject(id);
  if (!p || p.claimedBy) return;
  const username = getCurrentUsername();
  setState((s) => ({
    ...s,
    projects: s.projects.map((x) => (x.id === id ? { ...x, claimedBy: username } : x)),
    claims: [{ id: createId(), projectId: id, at: Date.now() }, ...s.claims],
    terminalLogs: [
      { user: `@${username}`, action: "CLAIMED", target: p.name, color: "primary" },
      ...s.terminalLogs,
    ].slice(0, 20),
    user: { ...s.user, karma: s.user.karma + 25 },
  }));
  persistProject(getProject(id));
  persistUserPrivate();
  persistTerminalLogs();
  addNotification("claim", `You claimed '${p.name}' to revive`, `autopsy.html?id=${id}`);
  showToast("Revival claim registered.");
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

function buryProject(data) {
  if (!FailMateAuth.requireAuthForAction("bury a project")) return null;
  const id = data.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30) + "-" + createId().slice(0, 4);
  const username = getCurrentUsername();
  const project = {
    id,
    code: `CF-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name,
    description: data.description,
    causeOfDeath: data.causeOfDeath,
    techCategory: data.techCategory,
    techStack: data.techStack,
    deceasedDate: data.deceasedDate,
    githubUrl: data.githubUrl,
    buriedBy: username,
    upvotes: 0,
    views: 1,
    createdAt: Date.now(),
    autopsyFailures: [{ cause: data.causeOfDeath, title: "Primary Failure", description: data.description, severity: "error" }],
    reanimationPhases: [{ title: "Awaiting Autopsy", description: "Run AI analysis to generate protocol.", progress: 0 }],
  };
  setState((s) => ({
    ...s,
    projects: [project, ...s.projects],
    user: { ...s.user, karma: s.user.karma + 50, burials: s.user.burials + 1 },
    terminalLogs: [{ user: `@${username}`, action: "BURIED", target: data.name, color: "secondary" }, ...s.terminalLogs].slice(0, 20),
  }));
  persistProject(project);
  persistUserPrivate();
  persistTerminalLogs();
  showToast(`'${data.name}' buried successfully.`);
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

async function analyzeGithub(url) {
  await new Promise((r) => setTimeout(r, 2000));
  const match = url.match(/github\.com\/([^/]+)\/([^/\s]+)/i);
  const repo = match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : "unknown/orphaned-lib";
  return {
    repo,
    logs: [
      "[SYSTEM] ESTABLISHING HANDSHAKE WITH GITHUB API...",
      `[SYSTEM] ACCESSING: ${repo}`,
      "> ANALYZING COMMIT HISTORY... [DONE]",
      "> SCANNING FOR GHOST DEPENDENCIES...",
      "  - 42 outdated packages detected.",
      "  - Security vulnerability: High (CVE-2023-XXXXX)",
      "  - Last commit: 632 days ago.",
      "[ALERT] PROJECT VITAL SIGNS ARE FLATLINING.",
      "ANALYSIS COMPLETE. READY FOR FINAL DISPOSAL.",
    ],
    stability: 12,
  };
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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
