let lastScanResult = null;

document.addEventListener("DOMContentLoaded", () => {
  FailMateApp.boot(async () => {
    if (!FailMateAuth.requireAuth("bury.html")) return;

    document.getElementById("btn-scan").addEventListener("click", async () => {
      const url = document.getElementById("github-url").value.trim();
      if (!url.includes("github")) {
        showToast("Enter a valid GitHub URL");
        return;
      }
      const logEl = document.getElementById("scan-log");
      logEl.classList.remove("hidden");
      logEl.innerHTML = "<p class='text-primary-container'>[SYSTEM] Scanning GitHub API...</p>";
      try {
        const result = await analyzeGithub(url);
        lastScanResult = result;
        logEl.innerHTML = result.logs
          .map((l) => `<p class="mb-2 ${l.startsWith("[") ? "text-primary-container" : "text-on-surface/60 pl-4"}">${l}</p>`)
          .join("");
        const parts = result.repo.split("/");
        document.getElementById("f-name").value = result.name || parts[1] || "Orphaned Repo";
        document.getElementById("f-desc").value = result.description;
        document.getElementById("f-cause").value = result.causeOfDeath || "NO_PMF";
        document.getElementById("f-category").value = result.techCategory || "NETWORK";
        document.getElementById("f-stack").value = (result.techStack || ["GITHUB"]).join(", ");
        showToast("GitHub scan complete — review & submit");
      } catch (err) {
        logEl.innerHTML += `<p class="text-error mt-2">${err.message}</p>`;
        showToast(err.message || "Scan failed");
      }
    });

    document.getElementById("bury-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("f-name").value.trim();
      const description = document.getElementById("f-desc").value.trim();
      if (!name || !description) return;
      const id = await buryProject({
        name,
        description,
        causeOfDeath: document.getElementById("f-cause").value,
        techCategory: document.getElementById("f-category").value,
        techStack: document
          .getElementById("f-stack")
          .value.split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        deceasedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
        githubUrl: document.getElementById("github-url").value.trim() || undefined,
        githubAnalysis: lastScanResult?.analysis || null,
      });
      const proj = getProject(id);
      if (proj) navigateToAutopsy(proj);
      else if (id) location.href = `autopsy.html?id=${encodeURIComponent(id)}`;
    });
  });
});
