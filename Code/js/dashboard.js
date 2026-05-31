document.addEventListener("DOMContentLoaded", () => {
  FailMateApp.boot(async () => {
    if (!FailMateAuth.requireAuth("dashboard.html")) return;

    const s = getState();
    const karma = s.user.karma ?? 0;
    document.getElementById("karma").textContent = karma.toLocaleString();
    const bar = document.getElementById("karma-bar");
    if (bar) bar.style.width = `${Math.min(100, Math.round((karma / 500) * 100))}%`;
    document.getElementById("burials").textContent = s.user.burials;
    document.getElementById("claims-count").textContent = userHasActiveClaim() ? "1" : "0";
    document.getElementById("dash-user").textContent = s.user.username;
    renderDeathToll();
    FailMateAuth.updateAuthUI();

    renderActiveRevival();
    renderJoinRequestsInbox();
    renderPersonalGraves();
    renderTerminalFeed();
    initGlassHover();
  });
});

async function renderJoinRequestsInbox() {
  const section = document.getElementById("join-requests-section");
  if (!section || typeof FailMateTeams === "undefined" || !FailMateDB?.isEnabled()) return;

  const claim = getActiveClaimProject();
  if (!claim || !isClaimOwnedByUser(claim)) {
    section.innerHTML = "";
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  let requests = [];
  try {
    await FailMateTeams.ensureTeamExists(claim);
    requests = await FailMateTeams.getJoinRequests(claim.id, "pending");
  } catch (e) {
    section.innerHTML = `<p class="text-data-sm text-error">${escapeHtml(e.message)}</p>`;
    return;
  }

  if (!requests.length) {
    section.innerHTML = `
      <div class="glass-panel p-4 rounded-lg border-l-4 border-outline-variant/30">
        <h2 class="text-label-caps text-primary mb-1 flex items-center gap-2"><span class="material-symbols-outlined text-sm">person_add</span> JOIN REQUESTS</h2>
        <p class="text-data-sm text-on-surface-variant/60">No pending requests for ${escapeHtml(claim.name)}.</p>
      </div>`;
    return;
  }

  section.innerHTML = `
    <div class="glass-panel p-6 rounded-lg border-l-4 border-secondary">
      <h2 class="text-label-caps text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-sm">person_add</span> JOIN REQUESTS (${requests.length})</h2>
      <div class="space-y-3" id="dash-join-list"></div>
      <a href="${revivalTeamUrl(claim.id)}" class="inline-block mt-4 text-label-caps text-primary hover:underline">Open revival team room →</a>
    </div>`;

  const list = document.getElementById("dash-join-list");
  list.innerHTML = requests
    .map(
      (r) => `
    <div class="p-4 bg-surface-container-low/50">
      <p class="text-data-sm text-primary">${escapeHtml(r.username)} ${r.githubUsername ? `(@${escapeHtml(r.githubUsername)})` : ""}</p>
      <p class="text-data-sm text-on-surface-variant mt-1">${escapeHtml(r.message || "(no message)")}</p>
      <input type="text" class="dash-approve-gh w-full mt-2 bg-surface-container-low border border-outline-variant/40 px-2 py-1 text-data-sm" placeholder="GitHub username" value="${escapeHtml(r.githubUsername || "")}" data-uid="${escapeHtml(r.uid)}" />
      <div class="flex gap-2 mt-2">
        <button type="button" class="dash-approve px-3 py-1 bg-primary-container text-on-primary-container text-label-caps" data-uid="${escapeHtml(r.uid)}">APPROVE</button>
        <button type="button" class="dash-reject px-3 py-1 border border-error/40 text-error text-label-caps" data-uid="${escapeHtml(r.uid)}">REJECT</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll(".dash-approve").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const row = btn.closest(".p-4");
      const gh = row?.querySelector(".dash-approve-gh")?.value;
      try {
        await FailMateTeams.approveJoin(claim.id, uid, gh);
        showToast("Approved — invite them on GitHub from Revival Team → Commander.");
        renderJoinRequestsInbox();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
  list.querySelectorAll(".dash-reject").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await FailMateTeams.rejectJoin(claim.id, btn.dataset.uid);
        showToast("Rejected.");
        renderJoinRequestsInbox();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

async function renderActiveRevival() {
  const section = document.getElementById("active-revival-section");
  if (!section) return;
  const claim = getActiveClaimProject();

  if (!claim) {
    section.innerHTML = `
      <div class="glass-panel rounded-lg border-l-4 border-outline-variant/40 p-6">
        <h2 class="text-headline-md text-on-surface-variant mb-2">NO ACTIVE REVIVAL</h2>
        <p class="text-data-sm text-on-surface-variant/70 mb-4">You haven't claimed a project yet. Pick one corpse from the graveyard — you can only revive <strong class="text-primary">one project at a time</strong>.</p>
        <a href="index.html" class="inline-flex items-center gap-2 text-label-caps text-primary hover:underline">
          <span class="material-symbols-outlined text-sm">curtains_closed</span> Browse graveyard
        </a>
      </div>`;
    return;
  }

  let pct = claim.revivalProgress ?? 0;
  if (!pct) {
    const phases = claim.reanimationPhases || [];
    const progress = phases.length ? Math.round(phases.reduce((a, p) => a + (p.progress || 0), 0) / (phases.length * 5) * 100) : 0;
    pct = Math.min(100, Math.max(0, progress || 0));
  }
  if (typeof FailMateTeams !== "undefined" && FailMateDB?.isEnabled()) {
    try {
      const team = await FailMateTeams.getTeam(claim.id);
      if (team?.revivalProgress != null) pct = team.revivalProgress;
    } catch {
      /* use local pct */
    }
  }

  section.innerHTML = `
    <div class="glass-panel rounded-lg border-l-4 border-primary p-6 claim-banner">
      <div class="flex flex-wrap justify-between gap-4 mb-4">
        <div>
          <p class="text-label-caps text-primary mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">bolt</span> YOUR ACTIVE REVIVAL
          </p>
          <h2 class="text-headline-md text-primary">${claim.name}</h2>
          <p class="text-data-sm text-on-surface-variant mt-1">Claimed · ${claim.causeOfDeath.replace(/_/g, " ")} · #${claim.code}</p>
        </div>
        <div class="flex flex-wrap gap-2 self-start">
          <a href="${revivalTeamUrl(claim.id)}" class="px-5 py-2 bg-primary-container text-on-primary-container text-label-caps hover:brightness-110">REVIVAL TEAM</a>
          <a href="autopsy.html?id=${encodeURIComponent(claim.id)}" data-autopsy-id="${escapeHtml(claim.id)}" class="px-5 py-2 border border-primary-container text-primary-container text-label-caps hover:bg-primary/10">AUTOPSY</a>
        </div>
      </div>
      <p class="text-data-sm text-on-surface-variant/80 mb-4 line-clamp-2">${claim.description}</p>
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded">
        <div class="flex justify-between text-data-sm text-primary mb-2"><span>REANIMATION PROGRESS</span><span>${pct}%</span></div>
        <div class="flex gap-[2px] h-6" id="syntax-bar"></div>
      </div>
    </div>`;

  const bar = document.getElementById("syntax-bar");
  if (bar) {
    const filled = Math.round((pct / 100) * 10);
    for (let i = 0; i < 10; i++) {
      const d = document.createElement("div");
      d.className = `flex-1 h-full ${i < filled ? "bg-primary-container" : "bg-surface-container"}`;
      bar.appendChild(d);
    }
  }
}

function renderPersonalGraves() {
  const graves = document.getElementById("personal-graves");
  const username = getState().user.username;
  const mine = getState().projects.filter((p) => p.buriedBy === username).slice(0, 6);
  graves.innerHTML =
    mine
      .map(
        (p) => `
    <a href="autopsy.html?id=${encodeURIComponent(p.id)}" data-autopsy-id="${escapeHtml(p.id)}" class="glass-panel p-4 rounded block hover:-translate-y-0.5 transition-transform">
      <div class="flex justify-between mb-2"><h4 class="text-data-lg text-primary">${p.name}</h4><span class="text-data-sm text-on-surface-variant">${p.deceasedDate}</span></div>
      <p class="text-data-sm text-on-surface-variant/80 line-clamp-2">${p.description}</p>
    </a>`
      )
      .join("") +
    (mine.length
      ? ""
      : `<p class="text-data-sm text-on-surface-variant/60 col-span-2 p-4">Projects you bury will appear here.</p>`) +
    `<a href="bury.html" class="glass-panel border-dashed p-4 flex flex-col items-center justify-center text-on-surface-variant/40 hover:text-primary min-h-[100px]">
      <span class="material-symbols-outlined text-4xl mb-2">add_box</span><span class="text-label-caps">LOG_NEW_DEATH</span></a>`;
}

function renderTerminalFeed() {
  const feed = document.getElementById("terminal-feed");
  feed.innerHTML = getState()
    .terminalLogs.map(
      (log) => `
      <div class="p-4 border-b border-outline-variant/10">
        <div class="flex gap-3">
          <span class="material-symbols-outlined text-primary-container text-sm">keyboard_arrow_right</span>
          <div>
            <p class="text-data-sm"><span class="text-primary">${log.user}</span> ${log.action} <span class="text-secondary">${log.target}</span>.</p>
          </div>
        </div>
      </div>`
    )
    .join("");

  setInterval(() => {
    const logs = [
      { user: "@Sys_Admin", action: "DEPLOYED", target: "Patch v2.0.5" },
      { user: "@Ghost_Dev", action: "BURIED", target: "Legacy-API-v1" },
    ];
    const log = logs[Math.floor(Math.random() * logs.length)];
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const item = document.createElement("div");
    item.className = "p-4 border-b border-outline-variant/10";
    item.innerHTML = `<div class="flex gap-3"><span class="material-symbols-outlined text-primary-container text-sm">keyboard_arrow_right</span><div><p class="text-data-sm"><span class="text-primary">${log.user}</span> ${log.action} <span class="text-secondary">${log.target}</span>.</p><p class="text-[11px] font-label-caps text-on-surface-variant/50 mt-1">${time} // LIVE</p></div></div>`;
    feed.prepend(item);
    if (feed.children.length > 10) feed.lastElementChild.remove();
  }, 15000);
}
