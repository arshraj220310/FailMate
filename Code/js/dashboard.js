document.addEventListener("DOMContentLoaded", async () => {
  await FailMateApp.ready();
  if (!FailMateAuth.requireAuth("dashboard.html")) return;

  const s = getState();
  document.getElementById("karma").textContent = s.user.karma.toLocaleString();
  document.getElementById("burials").textContent = s.user.burials;
  document.getElementById("claims-count").textContent = s.claims.length;
  document.getElementById("dash-user").textContent = s.user.username;
  renderDeathToll();

  const bar = document.getElementById("syntax-bar");
  for (let i = 0; i < 10; i++) {
    const d = document.createElement("div");
    d.className = `flex-1 h-full ${i < 8 ? "bg-primary-container" : "bg-surface-container"}`;
    bar.appendChild(d);
  }

  const graves = document.getElementById("personal-graves");
  const username = s.user.username;
  const mine = s.projects.filter((p) => p.buriedBy === username || (!p.buriedBy && s.projects.indexOf(p) < 3)).slice(0, 6);
  graves.innerHTML =
    mine
      .map(
        (p) => `
    <a href="autopsy.html?id=${p.id}" class="glass-panel p-4 rounded block hover:-translate-y-0.5 transition-transform">
      <div class="flex justify-between mb-2"><h4 class="text-data-lg text-primary">${p.name}</h4><span class="text-data-sm text-on-surface-variant">${p.deceasedDate}</span></div>
      <p class="text-data-sm text-on-surface-variant/80 line-clamp-2">${p.description}</p>
    </a>`
      )
      .join("") +
    `<a href="bury.html" class="glass-panel border-dashed p-4 flex flex-col items-center justify-center text-on-surface-variant/40 hover:text-primary min-h-[100px]">
      <span class="material-symbols-outlined text-4xl mb-2">add_box</span><span class="text-label-caps">LOG_NEW_DEATH</span></a>`;

  const feed = document.getElementById("terminal-feed");
  function renderFeed() {
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
  }
  renderFeed();

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

  initGlassHover();
});
