let scanDone = false;

async function runScan() {
  const url = document.getElementById("repo-input").value.trim();
  const terminal = document.getElementById("terminal-content");
  const btnBury = document.getElementById("btn-bury");
  scanDone = false;
  btnBury.disabled = true;
  terminal.innerHTML = "<p class='text-primary-container'>[SYSTEM] Waking neural decoder...</p>";
  document.getElementById("repo-display").textContent = url.startsWith("http") ? url.replace(/^https?:\/\//, "") : url;

  const result = await analyzeGithub(url.startsWith("http") ? url : "https://" + url);
  document.getElementById("stability-label").textContent = `CRITICAL (${result.stability}%)`;

  terminal.innerHTML =
    result.logs.map((l) => `<p class="mb-2 ${l.startsWith("[") ? "text-primary-container/80" : "text-on-surface/60"}">${l}</p>`).join("") +
    `<p class="mt-4 flex items-center gap-2 text-primary-container">ANALYSIS COMPLETE. READY FOR FINAL DISPOSAL.<span class="w-2 h-5 bg-primary-container cursor-blink"></span></p>`;

  scanDone = true;
  btnBury.disabled = false;

  const extra = [
    "[LOG] Extracting necro-data from package.json...",
    "[WARN] Found 'todo' markers from 3 years ago.",
    "[INFO] Heap dump requested... Success.",
  ];
  let i = 0;
  const iv = setInterval(() => {
    if (i >= extra.length) return clearInterval(iv);
    const p = document.createElement("p");
    p.className = "mb-2 text-on-surface/40";
    p.textContent = "> " + extra[i++];
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
  }, 1500);
}

document.addEventListener("DOMContentLoaded", async () => {
  await FailMateApp.ready();
  document.getElementById("timestamp").textContent = "TIMESTAMP: " + new Date().toISOString().replace(/T/, "_").slice(0, 19);
  document.getElementById("active-burials").textContent = getState().projects.length;
  renderDeathToll();
  runScan();

  document.getElementById("btn-rescan").addEventListener("click", runScan);
  document.getElementById("btn-bury").addEventListener("click", () => {
    if (!scanDone) return;
    const url = document.getElementById("repo-input").value.trim();
    const match = url.match(/([^/]+)\/([^/\s]+)/);
    const name = (match?.[2] || "orphaned-lib").replace(/\.git$/, "");
    const id = buryProject({
      name,
      description: "Flatlined after repository analysis in Reanimation Lab.",
      causeOfDeath: "NO_PMF",
      techCategory: "AI/ML",
      techStack: ["GITHUB"],
      deceasedDate: "NOW",
      githubUrl: url,
    });
    if (id) location.href = `autopsy.html?id=${id}`;
  });
});
