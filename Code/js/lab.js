let scanDone = false;
let lastScanResult = null;

function setLabIdle() {
  scanDone = false;
  lastScanResult = null;
  document.getElementById("btn-bury").disabled = true;
  document.getElementById("stability-label").textContent = "—";
  document.getElementById("repo-display").textContent = "—";
  document.getElementById("terminal-content").innerHTML =
    "<p class='text-on-surface-variant/50'>Paste a GitHub URL above and click SCAN to analyze a repository.</p>";
}

async function runScan() {
  const url = document.getElementById("repo-input").value.trim();
  const terminal = document.getElementById("terminal-content");
  const btnBury = document.getElementById("btn-bury");

  if (!url) {
    showToast("Paste a GitHub repository URL first");
    return;
  }
  if (!url.includes("github.com")) {
    showToast("Enter a valid github.com/owner/repo URL");
    return;
  }

  scanDone = false;
  lastScanResult = null;
  btnBury.disabled = true;
  terminal.innerHTML = "<p class='text-primary-container'>[SYSTEM] Connecting to GitHub API...</p>";
  document.getElementById("repo-display").textContent = url.replace(/^https?:\/\//, "");
  document.getElementById("stability-label").textContent = "SCANNING...";

  try {
    const result = await analyzeGithub(url.startsWith("http") ? url : "https://" + url);
    lastScanResult = result;
    document.getElementById("stability-label").textContent =
      result.stability >= 50 ? `STABLE (${result.stability}%)` : `CRITICAL (${result.stability}%)`;

    terminal.innerHTML =
      result.logs
        .map((l) => `<p class="mb-2 ${l.startsWith("[") ? "text-primary-container/80" : "text-on-surface/60"}">${l}</p>`)
        .join("") +
      `<p class="mt-4 flex items-center gap-2 text-primary-container">ANALYSIS COMPLETE. READY FOR BURIAL.<span class="w-2 h-5 bg-primary-container cursor-blink"></span></p>`;

    scanDone = true;
    btnBury.disabled = false;
  } catch (err) {
    document.getElementById("stability-label").textContent = "—";
    terminal.innerHTML = `<p class="text-error">[ERROR] ${err.message}</p>`;
    showToast(err.message || "GitHub scan failed");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  FailMateApp.boot(async () => {
    document.getElementById("timestamp").textContent = "TIMESTAMP: " + new Date().toISOString().replace(/T/, "_").slice(0, 19);
    document.getElementById("active-burials").textContent = getState().projects.length;
    renderDeathToll();
    setLabIdle();

    document.getElementById("btn-rescan").addEventListener("click", runScan);
    document.getElementById("repo-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") runScan();
    });

    document.getElementById("btn-bury").addEventListener("click", async () => {
      if (!scanDone || !lastScanResult) return;
      if (!FailMateAuth.requireAuthForAction("bury from lab")) return;

      const url = document.getElementById("repo-input").value.trim();
      const gh = lastScanResult.analysis;
      const id = await buryProject({
        name: lastScanResult.name || gh.repo,
        description: lastScanResult.description,
        causeOfDeath: lastScanResult.causeOfDeath || "NO_PMF",
        techCategory: lastScanResult.techCategory || "NETWORK",
        techStack: lastScanResult.techStack || ["GITHUB"],
        deceasedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
        githubUrl: url.startsWith("http") ? url : "https://" + url,
        githubAnalysis: gh,
      });
      const proj = getProject(id);
      if (proj) navigateToAutopsy(proj);
      else if (id) location.href = `autopsy.html?id=${encodeURIComponent(id)}`;
    });
  });
});
