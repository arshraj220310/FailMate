function bitBars(progress, locked) {
  return Array.from({ length: 5 })
    .map((_, i) => `<div class="bit-bar-segment ${!locked && i < progress ? "bit-bar-active" : ""}"></div>`)
    .join("");
}

function renderAutopsy(p) {
  const comments = getState().comments[p.id] || [];
  document.getElementById("system-log").textContent = `System_Log://autopsy_${p.code}`;

  const financial = (p.financialBreakdown || [])
    .map(
      (row) => `
    <div class="mb-3">
      <div class="flex justify-between text-data-sm"><span>${row.label}</span><span class="text-error">${row.amount}</span></div>
      <div class="w-full bg-surface-container-high h-2 mt-1"><div class="bg-error h-full" style="width:${row.percent}%"></div></div>
    </div>`
    )
    .join("");

  const failures = p.autopsyFailures
    .map(
      (f, i) => `
    <div class="glass-panel p-6 border-l-2 ${f.severity === "error" ? "border-error/50" : "border-secondary/50"}">
      <div class="flex justify-between mb-4">
        <span class="text-label-caps bg-error-container/30 text-on-error-container px-2 py-0.5">CAUSE: ${f.cause}</span>
        <span class="text-data-sm opacity-40">#${String(i + 1).padStart(2, "0")}</span>
      </div>
      <h3 class="text-data-lg text-primary mb-2">${f.title}</h3>
      <p class="text-data-sm text-on-surface-variant">${f.description}</p>
    </div>`
    )
    .join("");

  const phases = (p.reanimationPhases || [])
    .map(
      (ph, i) => `
    <div class="glass-panel p-6 flex gap-4 ${ph.locked ? "opacity-50" : ""}">
      <div class="text-headline-lg text-primary-container/20">${String(i + 1).padStart(2, "0")}</div>
      <div class="flex-1">
        <h4 class="text-data-lg text-primary uppercase mb-2">${ph.title}</h4>
        <p class="text-data-sm text-on-surface-variant">${ph.description}</p>
        <div class="flex gap-1 mt-4">${bitBars(ph.progress, ph.locked)}</div>
      </div>
    </div>`
    )
    .join("");

  const commentHtml = comments
    .map(
      (c) => `
    <div class="p-4 hover:bg-surface-variant/20">
      <div class="flex justify-between"><span class="text-data-sm text-primary-container">${c.author}</span><span class="text-[10px] text-on-surface-variant/50">${c.hoursAgo === 0 ? "NOW" : c.hoursAgo + "H AGO"}</span></div>
      <p class="text-data-sm text-on-surface-variant mt-1">${c.text}</p>
    </div>`
    )
    .join("");

  document.getElementById("autopsy-root").innerHTML = `
    <section class="glass-panel p-8 border-l-4 border-error relative">
      <div class="absolute top-4 right-4 text-right">
        <p class="text-label-caps text-on-surface-variant/50">PROJECT_ID: ${p.code}</p>
        <p class="text-data-sm text-error animate-pulse uppercase">Status: Dead on Arrival</p>
      </div>
      <h1 class="text-headline-lg uppercase text-on-surface">${p.name}</h1>
      <div class="flex flex-wrap gap-x-8 gap-y-2 pt-4 text-data-lg">
        <div><span class="text-label-caps text-on-surface-variant/60 block">BURIAL_DATE</span>${p.deceasedDate}</div>
        ${p.founder ? `<div><span class="text-label-caps text-on-surface-variant/60 block">FOUNDER</span>${p.founder}</div>` : ""}
        ${p.valuationLoss ? `<div><span class="text-label-caps text-on-surface-variant/60 block">VALUATION_LOSS</span><span class="text-error">${p.valuationLoss}</span></div>` : ""}
      </div>
      <div class="mt-8 flex flex-wrap gap-4">
        <button type="button" id="btn-autopsy" class="px-6 py-2 bg-primary-container text-on-primary-container text-label-caps flex items-center gap-2">
          <span class="material-symbols-outlined">file_download</span> DOWNLOAD AUTOPSY
        </button>
        <button type="button" id="btn-upvote" class="px-6 py-2 border border-outline text-label-caps hover:bg-surface-variant/50 flex items-center gap-2">
          <span class="material-symbols-outlined">upgrade</span> UPVOTE (<span id="upvote-count">${p.upvotes}</span>)
        </button>
        <button type="button" id="btn-claim" class="px-6 py-2 border border-primary-container text-primary-container text-label-caps" ${p.claimedBy ? "disabled" : ""}>
          ${p.claimedBy ? "CLAIMED" : "CLAIM TO REVIVE"}
        </button>
        <button type="button" id="btn-share" class="px-6 py-2 border border-outline-variant text-label-caps">SHARE</button>
      </div>
    </section>
    ${p.postMortem ? `<section class="glass-panel p-6 border-l-2 border-primary-container"><h2 class="text-label-caps text-primary mb-2">AI_POST_MORTEM.log</h2><pre class="text-data-sm text-on-surface-variant whitespace-pre-wrap font-data-sm">${p.postMortem}</pre></section>` : ""}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div class="lg:col-span-8 space-y-8">
        <h2 class="text-headline-md flex items-center gap-3"><span class="material-symbols-outlined text-primary-container">content_paste_search</span> THE_AUTOPSY.log</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${failures}</div>
        ${p.financialBreakdown ? `<div class="glass-panel p-6"><h3 class="text-data-lg text-primary uppercase mb-4">Financial Hemorrhage Report</h3>${financial}</div>` : ""}
        <div class="space-y-4">
          <h2 class="text-headline-md flex items-center gap-3"><span class="material-symbols-outlined text-primary-container">bolt</span> REANIMATION_PROTOCOL</h2>
          ${phases}
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
          <div class="flex justify-between"><span class="text-on-surface-variant/60">CAUSE</span><span>${p.causeOfDeath}</span></div>
        </div>
      </div>
    </div>`;

  document.getElementById("btn-autopsy").addEventListener("click", async () => {
    await generateAutopsy(p.id);
    renderAutopsy(getProject(p.id));
  });
  document.getElementById("btn-upvote").addEventListener("click", () => {
    upvoteProject(p.id);
    document.getElementById("upvote-count").textContent = getProject(p.id).upvotes;
    document.getElementById("metric-upvotes").textContent = getProject(p.id).upvotes;
  });
  document.getElementById("btn-claim")?.addEventListener("click", () => {
    claimProject(p.id);
    renderAutopsy(getProject(p.id));
  });
  document.getElementById("btn-share").addEventListener("click", () => {
    const url = location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Autopsy: " + p.name)}&url=${encodeURIComponent(url)}`, "_blank");
  });
  document.getElementById("comment-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      addComment(p.id, e.target.value);
      renderAutopsy(getProject(p.id));
    }
  });

  initGlassHover();
}

document.addEventListener("DOMContentLoaded", async () => {
  await FailMateApp.ready();
  const id = getQueryParam("id") || "neuralnet-social";
  const p = getProject(id);
  if (!p) {
    document.getElementById("autopsy-root").classList.add("hidden");
    document.getElementById("not-found").classList.remove("hidden");
    return;
  }
  viewProject(id);
  renderAutopsy(p);
});
