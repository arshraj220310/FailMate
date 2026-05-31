const FailMateLoader = (() => {
  let visible = false;

  function ensure() {
    if (document.getElementById("fm-loader")) return;
    const el = document.createElement("div");
    el.id = "fm-loader";
    el.className = "fm-loader";
    el.innerHTML = `
      <div class="fm-loader-inner">
        <img src="assets/logo.svg" alt="" class="fm-loader-logo" />
        <p class="fm-loader-title">FAILMATE TERMINAL</p>
        <div class="fm-loader-bar"><div id="fm-loader-fill" class="fm-loader-fill"></div></div>
        <p id="fm-loader-status" class="fm-loader-status">Initializing...</p>
        <p class="fm-loader-hint">root@failmate:~$ syncing cemetery<span class="terminal-cursor"></span></p>
      </div>`;
    document.body.prepend(el);
  }

  function show() {
    ensure();
    visible = true;
    document.documentElement.classList.remove("fm-ready");
    document.getElementById("fm-loader")?.classList.remove("fm-loader-done");
  }

  function setProgress(percent, status) {
    ensure();
    const fill = document.getElementById("fm-loader-fill");
    const statusEl = document.getElementById("fm-loader-status");
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (statusEl && status) statusEl.textContent = status;
  }

  function hide() {
    if (!visible) {
      document.documentElement.classList.add("fm-ready");
      return;
    }
    setProgress(100, "Cemetery online.");
    const loader = document.getElementById("fm-loader");
    loader?.classList.add("fm-loader-done");
    document.documentElement.classList.add("fm-ready");
    visible = false;
    setTimeout(() => loader?.remove(), 500);
  }

  return { show, setProgress, hide };
})();

document.documentElement.classList.remove("fm-ready");
