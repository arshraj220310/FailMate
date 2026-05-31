const FailMateApp = (() => {
  let storeInitPromise = null;

  function ready() {
    if (!storeInitPromise) storeInitPromise = initStore();
    return storeInitPromise;
  }

  /** Show loader → load store → run page render → hide loader only when data is on screen. */
  async function boot(renderFn, options = {}) {
    const { skipLoader = false } = options;
    if (!skipLoader && typeof FailMateLoader !== "undefined") {
      FailMateLoader.show();
      FailMateLoader.setProgress(10, "Connecting to terminal...");
    }

    try {
      if (!skipLoader) FailMateLoader.setProgress(35, "Loading auth & database...");
      await ready();
      if (!skipLoader) FailMateLoader.setProgress(70, "Rendering page data...");
      if (typeof renderFn === "function") await renderFn();
      if (typeof FailMateNotify !== "undefined") FailMateNotify.init();
      if (!skipLoader) {
        FailMateLoader.setProgress(95, "Finalizing display...");
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err) {
      console.error("[FailMate] Boot failed:", err);
      if (!skipLoader) FailMateLoader.setProgress(100, "Load error — showing partial data.");
    } finally {
      if (!skipLoader) FailMateLoader.hide();
    }
  }

  return { ready, boot };
})();
