
const FailMateSidebar = (() => {
  let refreshTimer = null;

  function mounts() {
    return Array.from(document.querySelectorAll("[data-fm-sidebar]"));
  }

  async function loadNavData() {
    const uid = FailMateAuth?.getUser()?.uid;
    if (!uid) return { teams: [], pending: [], active: null };

    let pending = getState().pendingJoinRequests || [];
    let teams = [];

    if (typeof FailMateTeams !== "undefined" && FailMateTeams.discoverUserTeams) {
      teams = await FailMateTeams.discoverUserTeams(uid);
    } else {
      teams = getState().revivalTeams || [];
    }

    if (FailMateDB?.isEnabled()) {
      try {
        const profile = await FailMateDB.loadUserProfile(uid);
        if (profile?.pendingJoinRequests?.length) pending = profile.pendingJoinRequests;
        setState((s) => ({ ...s, pendingJoinRequests: pending }));
      } catch {
        
      }
    }

    const active = getActiveClaimProject();
    return { teams, pending, active, uid };
  }

  function renderBlock(data) {
    const { teams, pending, active } = data;
    const currentPath = location.pathname.split("/").pop() || "";
    const currentId = getRevivalTeamProjectId();

    const activeHtml =
      active && isClaimOwnedByUser(active)
        ? `
      <div class="fm-nav-section">
        <p class="fm-nav-label">YOUR ACTIVE CLAIM</p>
        <a href="${revivalTeamUrl(active.id)}" class="fm-nav-item fm-nav-active-claim ${currentId === active.id ? "fm-nav-current" : ""}">
          <span class="material-symbols-outlined text-sm">bolt</span>
          <span class="flex-1 min-w-0">
            <span class="block truncate text-data-sm text-primary">${escapeHtml(active.name)}</span>
            <span class="block text-[10px] text-on-surface-variant/50">You claimed · open team room</span>
          </span>
          <span class="fm-nav-pulse"></span>
        </a>
      </div>`
        : "";

    const pendingHtml = pending.length
      ? `
      <div class="fm-nav-section">
        <p class="fm-nav-label">PENDING REQUESTS</p>
        ${pending
          .map(
            (p) => `
          <div class="fm-nav-item fm-nav-pending">
            <span class="material-symbols-outlined text-sm">hourglass_top</span>
            <span class="flex-1 min-w-0">
              <span class="block truncate text-data-sm">${escapeHtml(p.projectName || p.projectId)}</span>
              <span class="block text-[10px] text-on-surface-variant/50">Awaiting approval</span>
            </span>
          </div>`
          )
          .join("")}
      </div>`
      : "";

    const teamsHtml =
      teams.length > 0
        ? `
      <div class="fm-nav-section">
        <p class="fm-nav-label">MY REVIVAL TEAMS</p>
        ${teams
          .map((t) => {
            const isCurrent = currentId === t.projectId && currentPath.includes("revival-team");
            const isNew = t.justAccepted;
            const isAlsoClaim = active && active.id === t.projectId;
            return `
          <a href="${revivalTeamUrl(t.projectId)}" class="fm-nav-item ${isCurrent ? "fm-nav-current" : ""} ${isNew ? "fm-nav-accepted" : ""}">
            <span class="material-symbols-outlined text-sm">${t.role === "owner" ? "shield" : "groups"}</span>
            <span class="flex-1 min-w-0">
              <span class="block truncate text-data-sm">${escapeHtml(t.projectName || t.projectId)}</span>
              <span class="block text-[10px] text-on-surface-variant/50">${t.role === "owner" ? "Claimer" : "Member"}${isAlsoClaim ? " · your claim" : ""}</span>
            </span>
            ${isNew ? '<span class="text-[9px] text-primary bg-primary/20 px-1 rounded">NEW</span>' : ""}
          </a>`;
          })
          .join("")}
      </div>`
        : `
      <div class="fm-nav-section">
        <p class="fm-nav-label">MY REVIVAL TEAMS</p>
        <p class="text-[10px] text-on-surface-variant/50 px-2 py-2">Request to join a claimed project — it appears here once accepted.</p>
      </div>`;

    const recentAccepted = (getState().notifications || [])
      .filter((n) => n.type === "accepted" && !n.isRead)
      .slice(0, 3);
    const notifHtml = recentAccepted.length
      ? `
      <div class="fm-nav-section">
        <p class="fm-nav-label">NEW ALERTS</p>
        ${recentAccepted
          .map(
            (n) => `
          <a href="${escapeHtml(n.link || "#")}" class="fm-nav-item fm-nav-accepted">
            <span class="material-symbols-outlined text-sm">celebration</span>
            <span class="flex-1 text-[10px] leading-snug">${escapeHtml(n.message)}</span>
          </a>`
          )
          .join("")}
      </div>`
      : "";

    return `
      <div class="fm-revival-nav animate-fm-slide-in">
        <p class="fm-nav-label flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-sm text-primary">hub</span> REVIVAL HUB
        </p>
        ${notifHtml}
        ${activeHtml}
        ${teamsHtml}
        ${pendingHtml}
        <a href="dashboard.html" class="fm-nav-item mt-2">
          <span class="material-symbols-outlined text-sm">terminal</span>
          <span class="text-data-sm">Dashboard</span>
        </a>
      </div>`;
  }

  async function render() {
    const els = mounts();
    if (!els.length) return;

    if (!FailMateAuth?.isLoggedIn()) {
      els.forEach((el) => {
        el.innerHTML = `<div class="fm-revival-nav text-[10px] text-on-surface-variant/50 p-2"><a href="login.html" class="text-primary hover:underline">Sign in</a> for revival teams.</div>`;
      });
      return;
    }

    els.forEach((el) => {
      el.innerHTML = `<div class="fm-revival-nav p-2 text-[10px] text-primary/60 animate-pulse">Syncing teams…</div>`;
    });

    const data = await loadNavData();
    const html = renderBlock(data);
    els.forEach((el) => {
      el.innerHTML = html;
    });
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => render(), 120);
  }

  function markTeamAccepted(projectId) {
    setState((s) => ({
      ...s,
      revivalTeams: (s.revivalTeams || []).map((t) =>
        t.projectId === projectId ? { ...t, justAccepted: true } : t
      ),
    }));
    scheduleRefresh();
  }

  function init() {
    render();
    FailMateAuth?.onReady(() => render());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) render();
    });
  }

  return { render, scheduleRefresh, markTeamAccepted, init };
})();
