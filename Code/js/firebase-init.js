const FailMateFirebase = (() => {
  let app = null;
  let auth = null;
  let db = null;
  let storage = null;
  let enabled = false;

  function isConfigured() {
    return (
      typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID"
    );
  }

  function init() {
    if (!isConfigured()) {
      console.warn("[FailMate] Firebase not configured — using localStorage fallback.");
      return false;
    }
    if (typeof firebase === "undefined") {
      console.error("[FailMate] Firebase SDK not loaded.");
      return false;
    }
    app = firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    if (typeof firebase.storage === "function") {
      storage = firebase.storage();
    }
    enabled = true;
    return true;
  }

  return {
    init,
    isConfigured,
    isEnabled: () => enabled,
    getApp: () => app,
    getAuth: () => auth,
    getDb: () => db,
    getStorage: () => storage,
  };
})();

FailMateFirebase.init();
