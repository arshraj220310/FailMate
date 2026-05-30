document.addEventListener("DOMContentLoaded", async () => {
  await FailMateApp.ready();
  if (!FailMateAuth.requireAuth("bury.html")) return;

  document.getElementById("btn-scan").addEventListener("click", async () => {
    const url = document.getElementById("github-url").value.trim();
    if (!url.includes("github")) {
      showToast("Enter a valid GitHub URL");
      return;
    }
    const logEl = document.getElementById("scan-log");
    logEl.classList.remove("hidden");
    logEl.innerHTML = "<p class='text-primary-container'>[SYSTEM] Scanning...</p>";
    const result = await analyzeGithub(url);
    logEl.innerHTML = result.logs.map((l) => `<p class="mb-2 ${l.startsWith("[") ? "text-primary-container" : "text-on-surface/60 pl-4"}">${l}</p>`).join("");
    const parts = result.repo.split("/");
    if (!document.getElementById("f-name").value) document.getElementById("f-name").value = parts[1] || "Orphaned Repo";
    if (!document.getElementById("f-desc").value) {
      document.getElementById("f-desc").value = `Repository ${result.repo} flatlined. Stability index: ${result.stability}%.`;
    }
    if (!document.getElementById("f-stack").value) document.getElementById("f-stack").value = "GITHUB,JAVASCRIPT";
    showToast("GitHub scan complete");
  });

  document.getElementById("bury-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("f-name").value.trim();
    const description = document.getElementById("f-desc").value.trim();
    if (!name || !description) return;
    const id = buryProject({
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
    });
    if (id) location.href = `autopsy.html?id=${id}`;
  });
});
