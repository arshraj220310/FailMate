const FailMateLoader = (() => {
  let visible = false;

  function ensure() {
    if (document.getElementById("fm-loader")) return;
    const el = document.createElement("div");
    el.id = "fm-loader";
    el.className = "fm-loader";
    el.innerHTML = `
      <div class="fm-loader-bg" aria-hidden="true">
        <div class="fm-loader-grid"></div>
        <div class="fm-loader-orb fm-loader-orb-1"></div>
        <div class="fm-loader-orb fm-loader-orb-2"></div>
        <div class="fm-loader-scan"></div>
      </div>
      <div class="fm-loader-inner">
        <div class="fm-loader-ring">
          <img src="assets/logo.svg" alt="" class="fm-loader-logo" />
        </div>
        <p class="fm-loader-title">FAILMATE</p>
        <p class="fm-loader-sub">Hackathon · Revival terminal</p>
        <div class="fm-loader-bar"><div id="fm-loader-fill" class="fm-loader-fill"></div></div>
        <p id="fm-loader-status" class="fm-loader-status">Initializing cemetery...</p>
        <p class="fm-loader-hint">root@failmate:~$ <span id="fm-loader-cmd">sync revival teams</span><span class="terminal-cursor"></span></p>
      </div>`;
    document.body.prepend(el);
  }

  const cmdLines = [
    "sync revival teams",
    "load graveyard data",
    "connect firebase",
    "wake the corpses",
    "open revival hub",
  ];
  let cmdIdx = 0;

  function cycleCmd() {
    const cmdEl = document.getElementById("fm-loader-cmd");
    if (!cmdEl) return;
    cmdIdx = (cmdIdx + 1) % cmdLines.length;
    cmdEl.textContent = cmdLines[cmdIdx];
  }

  function show() {
    ensure();
    visible = true;
    document.documentElement.classList.remove("fm-ready");
    document.getElementById("fm-loader")?.classList.remove("fm-loader-done");
    if (!show._interval) show._interval = setInterval(cycleCmd, 900);
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
    setProgress(100, "Cemetery online — welcome back.");
    const loader = document.getElementById("fm-loader");
    loader?.classList.add("fm-loader-done");
    document.documentElement.classList.add("fm-ready");
    visible = false;
    if (show._interval) {
      clearInterval(show._interval);
      show._interval = null;
    }
    setTimeout(() => loader?.remove(), 600);
  }

  return { show, setProgress, hide };
})();

document.documentElement.classList.remove("fm-ready");
