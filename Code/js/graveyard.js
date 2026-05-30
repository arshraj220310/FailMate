let activeCause = null;
let activeCategory = null;
let visibleCount = 6;
const PAGE = 6;

function renderCard(p) {
  const claimed = p.claimedBy
    ? `CLAIMED BY ${p.claimedBy}`
    : `CLAIM_TO_REVIVE`;
  const disabled = p.claimedBy ? "opacity-40 cursor-not-allowed" : "";
  return `
    <div class="corpse-card group relative bg-surface-container-low/40 border border-outline-variant/30 p-6 glass-panel overflow-hidden transition-all hover:border-primary/40">
      <div class="scanline-overlay absolute inset-0 opacity-20"></div>
      <div class="flex justify-between items-start mb-4 relative z-10">
        <div>
          <a href="autopsy.html?id=${p.id}"><h3 class="text-headline-md font-headline-md text-primary mb-1 hover:text-primary-container">${p.name}</h3></a>
          <div class="flex flex-wrap gap-2">
            <span class="bg-error-container/20 text-error border border-error/30 text-label-caps font-label-caps px-2 py-0.5 rounded">${p.causeOfDeath}</span>
            <span class="bg-surface-container-highest/60 text-on-surface-variant border border-outline-variant/40 text-label-caps font-label-caps px-2 py-0.5 rounded">DECEASED: ${p.deceasedDate}</span>
          </div>
        </div>
        <span class="text-data-sm font-data-sm opacity-30">#${p.code}</span>
      </div>
      <p class="text-body-md text-on-surface-variant/80 mb-4 relative z-10 line-clamp-3">${p.description}</p>
      <p class="text-data-sm text-on-surface-variant/50 mb-4 relative z-10">${p.upvotes} upvotes · ${p.views} views</p>
      <div class="flex flex-wrap gap-2 mb-6 relative z-10">
        ${p.techStack.map((t) => `<span class="text-label-caps font-data-sm text-primary/70">[${t}]</span>`).join("")}
      </div>
      <button type="button" data-claim="${p.id}" class="claim-btn w-full py-3 border border-outline-variant text-on-surface-variant font-label-caps text-label-caps hover:bg-primary/10 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 relative z-10 ${disabled}" ${p.claimedBy ? "disabled" : ""}>
        ${claimed} <span class="material-symbols-outlined text-[18px]">bolt</span>
      </button>
    </div>`;
}

function renderGrid() {
  const search = document.getElementById("search-input")?.value || "";
  const list = filterProjects({ search, cause: activeCause, category: activeCategory });
  const slice = list.slice(0, visibleCount);
  const grid = document.getElementById("corpse-grid");
  const empty = document.getElementById("empty-msg");
  const loadBtn = document.getElementById("load-more");

  const submitCard = `
    <a href="bury.html" class="border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center p-8 bg-surface-container-low/10 opacity-60 hover:opacity-100 transition-opacity min-h-[280px] group">
      <span class="material-symbols-outlined text-[48px] text-primary/40 group-hover:text-primary mb-4">add_to_photos</span>
      <p class="text-label-caps font-label-caps text-on-surface-variant group-hover:text-primary">SUBMIT_NEW_FAILURE</p>
    </a>`;

  grid.innerHTML = slice.map(renderCard).join("") + submitCard;
  empty.classList.toggle("hidden", list.length > 0);
  loadBtn.classList.toggle("hidden", visibleCount >= list.length);

  grid.querySelectorAll(".claim-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-claim");
      claimProject(id);
      renderGrid();
    });
  });

  renderDeathToll();
}

document.addEventListener("DOMContentLoaded", async () => {
  await FailMateApp.ready();
  setActiveNav("graveyard");
  initNotifications();
  initGlassHover();
  renderGrid();

  document.getElementById("search-input")?.addEventListener("input", () => {
    visibleCount = PAGE;
    renderGrid();
  });

  document.querySelectorAll("[data-filter-cause]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-filter-cause");
      activeCause = activeCause === v ? null : v;
      document.querySelectorAll("[data-filter-cause]").forEach((b) => b.classList.toggle("filter-active", b.getAttribute("data-filter-cause") === activeCause && activeCause));
      visibleCount = PAGE;
      renderGrid();
    });
  });

  document.querySelectorAll("[data-filter-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-filter-category");
      activeCategory = activeCategory === v ? null : v;
      document.querySelectorAll("[data-filter-category]").forEach((b) => b.classList.toggle("filter-active", b.getAttribute("data-filter-category") === activeCategory && activeCategory));
      visibleCount = PAGE;
      renderGrid();
    });
  });

  document.getElementById("load-more")?.addEventListener("click", () => {
    visibleCount += PAGE;
    renderGrid();
  });

  const params = new URLSearchParams(location.search);
  if (params.get("cause")) {
    activeCause = params.get("cause");
    document.querySelector(`[data-filter-cause="${activeCause}"]`)?.classList.add("filter-active");
    renderGrid();
  }
});
