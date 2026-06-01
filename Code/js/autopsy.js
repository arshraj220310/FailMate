function bitBars(progress, locked) {
  return Array.from({ length: 5 })
    .map((_, i) => `<div class="bit-bar-segment ${!locked && i < progress ? "bit-bar-active" : ""}"></div>`)
    .join("");
}

function renderClaimButton(p) {
  const isMine = isClaimOwnedByUser(p);
  const myClaim = getActiveClaimProject();
  if (isMine) {
    return `<span class="claim-badge px-6 py-2 text-label-caps inline-flex items-center gap-2"><span class="material-symbols-outlined text-sm">bolt</span> YOUR ACTIVE REVIVAL</span>`;
  }
  if (p.claimedBy && !isMine) {
    return `<button type="button" disabled class="px-6 py-2 border border-outline-variant/40 text-on-surface-variant/50 text-label-caps cursor-not-allowed">CLAIMED BY ${escapeHtml(p.claimedBy)}</button>`;
  }
  if (myClaim && myClaim.id !== p.id) {
    return `<button type="button" disabled class="px-6 py-2 border border-outline-variant/40 text-on-surface-variant/50 text-label-caps cursor-not-allowed" title="One revival at a time">ONE REVIVAL ONLY</button>`;
  }
  return `<button type="button" id="btn-claim" class="px-6 py-2 border border-primary-container text-primary-container text-label-caps hover:bg-primary/10">CLAIM TO REVIVE</button>`;
}

function renderGithubSection(gh) {
  if (!gh) return "";
  const langs = Object.entries(gh.languages || {})
    .slice(0, 6)
    .map(([l, b]) => `${escapeHtml(l)} (${b} bytes)`)
    .join(", ");
  return `
    <section class="glass-panel p-6 border-l-4 border-primary-container">
      <h2 class="text-label-caps text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-sm">code</span> GITHUB_SCAN_REPORT</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-data-sm">
        <div><span class="text-on-surface-variant/60">REPO</span><p class="text-primary"><a href="${escapeHtml(safeExternalUrl(gh.htmlUrl))}" target="_blank" rel="noopener" class="hover:underline">${escapeHtml(gh.full)}</a></p></div>
        <div><span class="text-on-surface-variant/60">STABILITY</span><p>${gh.stability}%</p></div>
        <div><span class="text-on-surface-variant/60">STARS / FORKS</span><p>${gh.stars} / ${gh.forks}</p></div>
        <div><span class="text-on-surface-variant/60">OPEN ISSUES</span><p>${gh.openIssues}</p></div>
        <div><span class="text-on-surface-variant/60">LAST PUSH</span><p>${gh.daysSincePush !== null ? gh.daysSincePush + " days ago" : "unknown"}</p></div>
        <div><span class="text-on-surface-variant/60">CONTRIBUTORS</span><p>${escapeHtml((gh.contributors || []).join(", ") || gh.contributorCount)}</p></div>
        <div><span class="text-on-surface-variant/60">BRANCHES / RELEASES</span><p>${gh.branchCount} / ${gh.releaseCount}</p></div>
        <div><span class="text-on-surface-variant/60">LICENSE</span><p>${escapeHtml(gh.license || "None")}</p></div>
        <div class="md:col-span-2"><span class="text-on-surface-variant/60">LANGUAGES</span><p>${langs || "Unknown"}</p></div>
        ${gh.dependencies?.length ? `<div class="md:col-span-2"><span class="text-on-surface-variant/60">DEPENDENCIES (sample)</span><p>${escapeHtml(gh.dependencies.slice(0, 12).join(", "))}</p></div>` : ""}
      </div>
    </section>`;
}

function renderAutopsy(p) {
  if (!p) return;
  const safe = {
    ...p,
    name: p.name || "Unknown Project",
    code: p.code || "CF-0000",
    deceasedDate: p.deceasedDate || "UNKNOWN",
    causeOfDeath: p.causeOfDeath || "UNKNOWN",
    description: p.description || "No description on file.",
    upvotes: p.upvotes ?? 0,
    views: p.views ?? 0,
    techStack: Array.isArray(p.techStack) ? p.techStack : [],
    autopsyFailures: Array.isArray(p.autopsyFailures) ? p.autopsyFailures : [],
    reanimationPhases: Array.isArray(p.reanimationPhases) ? p.reanimationPhases : [],
  };
  p = safe;

  const comments = getState().comments[p.id] || [];
  document.getElementById("system-log").textContent = `System_Log://autopsy_${p.code}`;

  const financial = (p.financialBreakdown || [])
    .map(
      (row) => `
    <div class="mb-3">
      <div class="flex justify-between text-data-sm"><span>${escapeHtml(row.label)}</span><span class="text-error">${escapeHtml(row.amount)}</span></div>
      <div class="w-full bg-surface-container-high h-2 mt-1"><div class="bg-error h-full" style="width:${row.percent}%"></div></div>
    </div>`
    )
    .join("");

  const failures = p.autopsyFailures
    .map(
      (f, i) => `
    <div class="glass-panel p-6 border-l-2 ${f.severity === "error" ? "border-error/50" : "border-secondary/50"}">
      <div class="flex justify-between mb-4">
        <span class="text-label-caps bg-error-container/30 text-on-error-container px-2 py-0.5">CAUSE: ${escapeHtml(f.cause)}</span>
        <span class="text-data-sm opacity-40">#${String(i + 1).padStart(2, "0")}</span>
      </div>
      <h3 class="text-data-lg text-primary mb-2">${escapeHtml(f.title)}</h3>
      <p class="text-data-sm text-on-surface-variant">${escapeHtml(f.description)}</p>
    </div>`
    )
    .join("");

  const phases = p.reanimationPhases
    .map(
      (ph, i) => `
    <div class="glass-panel p-6 flex gap-4 ${ph.locked ? "opacity-50" : ""}">
      <div class="text-headline-lg text-primary-container/20">${String(i + 1).padStart(2, "0")}</div>
      <div class="flex-1">
        <h4 class="text-data-lg text-primary uppercase mb-2">${escapeHtml(ph.title)}</h4>
        <p class="text-data-sm text-on-surface-variant">${escapeHtml(ph.description)}</p>
        <div class="flex gap-1 mt-4">${bitBars(ph.progress, ph.locked)}</div>
      </div>
    </div>`
    )
    .join("");

  const commentHtml = comments
    .map(
      (c) => `
    <div class="p-4 hover:bg-surface-variant/20">
      <div class="flex justify-between"><span class="text-data-sm text-primary-container">${escapeHtml(c.author)}</span><span class="text-[10px] text-on-surface-variant/50">${c.hoursAgo === 0 ? "NOW" : c.hoursAgo + "H AGO"}</span></div>
      <p class="text-data-sm text-on-surface-variant mt-1">${escapeHtml(c.text)}</p>
    </div>`
    )
    .join("");

  document.getElementById("autopsy-root").innerHTML = `
    <section class="info-panel glass-panel p-6 rounded-lg">
      <h2 class="text-label-caps text-primary mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm">help</span> WHAT IS AUTOPSY LOG?</h2>
      <p class="text-data-sm text-on-surface-variant leading-relaxed">
        The <strong class="text-primary-container">Autopsy Log</strong> is the full death report for one failed project.
        It shows why it died, GitHub scan data (if buried from the lab), failure breakdown, and a reanimation plan.
      </p>
    </section>
    <section class="glass-panel p-8 border-l-4 border-error relative">
      <div class="absolute top-4 right-4 text-right">
        <p class="text-label-caps text-on-surface-variant/50">PROJECT_ID: ${escapeHtml(p.code)}</p>
        <p class="text-data-sm text-error animate-pulse uppercase">Status: Dead on Arrival</p>
      </div>
      <h1 class="text-headline-lg uppercase text-on-surface">${escapeHtml(p.name)}</h1>
      <p class="text-data-sm text-on-surface-variant mt-3 max-w-3xl">${escapeHtml(p.description)}</p>
      <div class="flex flex-wrap gap-x-8 gap-y-2 pt-4 text-data-lg">
        <div><span class="text-label-caps text-on-surface-variant/60 block">BURIAL_DATE</span>${escapeHtml(p.deceasedDate)}</div>
        ${p.founder ? `<div><span class="text-label-caps text-on-surface-variant/60 block">FOUNDER</span>${escapeHtml(p.founder)}</div>` : ""}
        ${p.valuationLoss ? `<div><span class="text-label-caps text-on-surface-variant/60 block">VALUATION_LOSS</span><span class="text-error">${escapeHtml(p.valuationLoss)}</span></div>` : ""}
      </div>
      <div class="mt-8 flex flex-wrap gap-4">
        <button type="button" id="btn-autopsy" class="px-6 py-2 bg-primary-container text-on-primary-container text-label-caps flex items-center gap-2">
          <span class="material-symbols-outlined">file_download</span> DOWNLOAD AUTOPSY
        </button>
        <button type="button" id="btn-upvote" class="px-6 py-2 border border-outline text-label-caps hover:bg-surface-variant/50 flex items-center gap-2">
          <span class="material-symbols-outlined">upgrade</span> UPVOTE (<span id="upvote-count">${p.upvotes}</span>)
        </button>
        ${renderClaimButton(p)}
        <button type="button" id="btn-share" class="px-6 py-2 border border-outline-variant text-label-caps">SHARE</button>
      </div>
    </section>
    ${p.postMortem ? `<section class="glass-panel p-6 border-l-2 border-primary-container"><h2 class="text-label-caps text-primary mb-2">AI_POST_MORTEM.log</h2><pre class="text-data-sm text-on-surface-variant whitespace-pre-wrap font-data-sm">${escapeHtml(p.postMortem)}</pre></section>` : ""}
    ${renderGithubSection(p.githubAnalysis)}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div class="lg:col-span-8 space-y-8">
        <h2 class="text-headline-md flex items-center gap-3"><span class="material-symbols-outlined text-primary-container">content_paste_search</span> THE_AUTOPSY.log</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${failures || '<p class="text-data-sm text-on-surface-variant">No failure logs yet.</p>'}</div>
        ${p.financialBreakdown ? `<div class="glass-panel p-6"><h3 class="text-data-lg text-primary uppercase mb-4">Financial Hemorrhage Report</h3>${financial}</div>` : ""}
        <div id="revival-team-panel"></div>
        <div class="space-y-4">
          <h2 class="text-headline-md flex items-center gap-3"><span class="material-symbols-outlined text-primary-container">bolt</span> REANIMATION_PROTOCOL</h2>
          ${phases || '<p class="text-data-sm text-on-surface-variant">No reanimation phases yet.</p>'}
          ${p.revivalProgress != null ? `<p class="text-data-sm text-primary">Overall revival: <strong>${p.revivalProgress}%</strong> (GitHub branch work + merges)</p>` : ""}
        </div>
      </div>
      <div class="lg:col-span-4 space-y-8">
        <div class="glass-panel sticky top-24">
          <div class="p-4 border-b border-outline-variant/30 flex justify-between bg-surface-container-high/30">
            <h2 class="text-label-caps text-primary">MOURNERS_FEED</h2>
            <span class="text-data-sm text-on-surface-variant/40">${comments.length} ACTIVE</span>
          </div>
          <div class="max-h-[400px] overflow-y-auto divide-y divide-outline-variant/10">${commentHtml || '<p class="p-4 text-data-sm text-on-surface-variant/50">No notes yet.</p>'}</div>
          <div class="p-4 border-t border-outline-variant/30 flex items-center gap-2">
            <span class="text-primary-container">&gt;</span>
            <input id="comment-input" class="bg-transparent border-none focus:ring-0 text-data-sm w-full placeholder:text-primary-container/30" placeholder="WRITE_POST_MORTEM_NOTE" />
            <span class="terminal-cursor"></span>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-2 text-data-sm">
          <h3 class="text-label-caps text-primary border-b border-primary/20 pb-2">DEATH_METRICS</h3>
          <div class="flex justify-between"><span class="text-on-surface-variant/60">UPVOTES</span><span id="metric-upvotes">${p.upvotes}</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant/60">VIEWS</span><span>${p.views}</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant/60">CAUSE</span><span>${escapeHtml(p.causeOfDeath)}</span></div>
        </div>
      </div>
    </div>`;

  document.getElementById("btn-autopsy").addEventListener("click", async () => {
    await generateAutopsy(p.id);
    renderAutopsy(getProject(p.id) || p);
  });
  document.getElementById("btn-upvote").addEventListener("click", () => {
    upvoteProject(p.id);
    const fresh = getProject(p.id) || p;
    document.getElementById("upvote-count").textContent = fresh.upvotes;
    document.getElementById("metric-upvotes").textContent = fresh.upvotes;
  });
  document.getElementById("btn-claim")?.addEventListener("click", async () => {
    if (await claimProject(p.id)) {
      renderAutopsy(getProject(p.id) || p);
      renderRevivalTeamPanel(getProject(p.id) || p);
    }
  });

  renderRevivalTeamPanel(p);
  document.getElementById("btn-share").addEventListener("click", () => {
    const url = location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Autopsy: " + p.name)}&url=${encodeURIComponent(url)}`, "_blank");
  });
  document.getElementById("comment-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      addComment(p.id, e.target.value);
      e.target.value = "";
      renderAutopsy(getProject(p.id) || p);
    }
  });

  initGlassHover();
}

function showAutopsyNotFound(message, hint) {
  const root = document.getElementById("autopsy-root");
  const el = document.getElementById("not-found");
  root.classList.add("hidden");
  root.innerHTML = "";
  el.classList.remove("hidden");
  el.querySelector("p").textContent = message || "CORPSE NOT FOUND";
  let hintEl = el.querySelector(".not-found-hint");
  if (hint) {
    if (!hintEl) {
      hintEl = document.createElement("p");
      hintEl.className = "not-found-hint text-data-sm text-on-surface-variant mt-4";
      el.appendChild(hintEl);
    }
    hintEl.textContent = hint;
  } else if (hintEl) {
    hintEl.remove();
  }
}

async function renderRevivalTeamPanel(p) {
  const mount = document.getElementById("revival-team-panel");
  if (!mount || !p) return;

  if (!p.claimedBy) {
    mount.innerHTML = `
      <section class="glass-panel p-6 border-l-4 border-outline-variant/40">
        <h2 class="text-label-caps text-primary mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm">groups</span> REVIVAL TEAM</h2>
        <p class="text-data-sm text-on-surface-variant">Claim this project to start a revival team. Members work on GitHub branches and notify you when ready to merge.</p>
      </section>`;
    return;
  }

  let pct = p.revivalProgress ?? 0;
  let team = null;
  const uid = FailMateAuth.getUser()?.uid;
  const loggedIn = !!uid;

  if (typeof FailMateTeams !== "undefined" && FailMateDB?.isEnabled()) {
    try {
      team = await FailMateTeams.ensureTeamExists(p);
      if (team) pct = team.revivalProgress ?? pct;
    } catch (e) {
      console.warn("[FailMate] team panel:", e.message);
    }
  }

  const isOwner = isClaimOwnedByUser(p);
  let isMember = isOwner;
  if (team && uid && !isMember) {
    try {
      isMember = await FailMateTeams.isMember(p.id, uid);
    } catch {
      isMember = false;
    }
  }

  const teamUrl = revivalTeamUrl(p.id);

  let actions = "";
  if (!loggedIn) {
    actions = `<a href="login.html?redirect=${encodeURIComponent(revivalTeamUrl(p.id))}" class="inline-block mt-4 px-5 py-2 border border-primary-container text-primary-container text-label-caps">LOGIN TO JOIN TEAM</a>`;
  } else if (isMember || isOwner) {
    actions = `<a href="${teamUrl}" class="inline-block mt-4 px-6 py-2 bg-primary-container text-on-primary-container text-label-caps">OPEN REVIVAL TEAM ROOM</a>`;
  } else {
    actions = `
      <input id="autopsy-join-github" class="w-full mt-3 bg-surface-container-low border border-outline-variant/40 p-2 text-data-sm" placeholder="Your GitHub username" />
      <textarea id="autopsy-join-msg" rows="2" class="w-full mt-3 bg-surface-container-low border border-outline-variant/40 p-2 text-data-sm" placeholder="Why join this revival?"></textarea>
      <button type="button" id="btn-request-join-autopsy" class="mt-3 px-6 py-2 border border-primary-container text-primary-container text-label-caps">REQUEST TO JOIN</button>
      <a href="${teamUrl}" class="block mt-2 text-[10px] text-on-surface-variant hover:text-primary">Or open team page →</a>`;
  }

  mount.innerHTML = `
    <section class="glass-panel p-6 border-l-4 border-primary">
      <h2 class="text-label-caps text-primary mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm">groups</span> REVIVAL TEAM</h2>
      <p class="text-data-sm text-on-surface-variant mb-3">
        Claimed by <strong class="text-primary-container">${escapeHtml(p.claimedBy)}</strong>.
        Squad chat, private DMs, GitHub branch workflow, and revival progress (0–100%).
      </p>
      <div class="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded mb-2">
        <div class="flex justify-between text-data-sm text-primary mb-2"><span>REVIVAL COMPLETE</span><span id="autopsy-revival-pct">${pct}%</span></div>
        <div class="h-2 bg-surface-container-high rounded overflow-hidden">
          <div class="h-full bg-primary-container transition-all" style="width:${pct}%"></div>
        </div>
      </div>
      ${actions}
    </section>`;

  document.getElementById("btn-request-join-autopsy")?.addEventListener("click", async () => {
    if (!FailMateAuth.requireAuthForAction("request to join a team")) return;
    try {
      saveRevivalTeamProjectId(p.id);
      const msg = document.getElementById("autopsy-join-msg")?.value || "";
      const gh = document.getElementById("autopsy-join-github")?.value || "";
      if (FailMateDB?.isEnabled()) {
        const project = getProject(p.id) || p;
        await FailMateTeams.ensureTeamExists(project);
      }
      await FailMateTeams.requestJoin(p.id, msg, gh);
      showToast("Join request sent to the claimer (see their dashboard).");
    } catch (e) {
      showToast(e.message || "Request failed.");
    }
  });
}

function showAutopsyReport(p) {
  document.getElementById("not-found").classList.add("hidden");
  const root = document.getElementById("autopsy-root");
  root.classList.remove("hidden");
  root.style.visibility = "visible";
  try {
    renderAutopsy(p);
  } catch (err) {
    console.error("[FailMate] renderAutopsy failed:", err);
    root.innerHTML = `<div class="glass-panel p-6 border-l-4 border-error"><p class="text-error">Failed to render report: ${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  FailMateApp.boot(async () => {
    const id = normalizeProjectId(getQueryParam("id"));

    let p = loadAutopsyFromSession(id);
    if (p) {
      mergeProjectIntoState(p);
      showAutopsyReport(p);
      FailMateAuth.updateAuthUI();
      if (id) {
        resolveProject(id).then((fresh) => {
          if (fresh) showAutopsyReport(getProject(fresh.id) || fresh);
        });
      }
      return;
    }

    if (!id) {
      showAutopsyNotFound("NO CORPSE SELECTED", "Go to the graveyard and click a project name.");
      return;
    }

    p = getProject(id) || (await resolveProject(id));
    if (!p) {
      showAutopsyNotFound(
        "CORPSE NOT FOUND",
        `Could not load project "${id}". Open it from the graveyard (click the project title). Projects loaded: ${getState().projects.length}`
      );
      return;
    }

    cacheProjectLocally(p);
    try {
      viewProject(p.id);
    } catch (e) {
      console.warn("[FailMate] viewProject:", e);
    }
    showAutopsyReport(getProject(p.id) || p);
    FailMateAuth.updateAuthUI();
  });
});
