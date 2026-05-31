const FailMateAuth = (() => {
  let currentUser = null;
  let authReady = false;
  const readyCallbacks = [];

  function getAuth() {
    return FailMateFirebase.getAuth();
  }

  function notifyReady() {
    authReady = true;
    readyCallbacks.splice(0).forEach((cb) => cb(currentUser));
  }

  function onReady(cb) {
    if (authReady) {
      cb(currentUser);
      return;
    }
    readyCallbacks.push(cb);
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  function init() {
    if (!FailMateFirebase.isEnabled()) {
      notifyReady();
      return;
    }
    getAuth().onAuthStateChanged((user) => {
      currentUser = user;
      notifyReady();
      updateAuthUI();
    });
  }

  async function signUp(email, password, username) {
    const auth = getAuth();
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const cleanName = (username || email.split("@")[0])
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .slice(0, 24);
    await cred.user.updateProfile({ displayName: cleanName });
    await FailMateDB.createUserProfile(cred.user.uid, {
      username: cleanName,
      email,
      karma: 0,
      burials: 0,
    });
    return cred.user;
  }

  async function signIn(email, password) {
    const cred = await getAuth().signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await getAuth().signInWithPopup(provider);
    const name =
      cred.user.displayName?.toUpperCase().replace(/\s+/g, "_").slice(0, 24) ||
      cred.user.email.split("@")[0].toUpperCase();
    await FailMateDB.ensureUserProfile(cred.user.uid, {
      username: name,
      email: cred.user.email,
      karma: 0,
      burials: 0,
    });
    return cred.user;
  }

  async function signOut() {
    await getAuth().signOut();
    location.href = "login.html";
  }

  function requireAuth(redirectTo) {
    if (!FailMateFirebase.isEnabled()) return true;
    if (isLoggedIn()) return true;
    const file = (redirectTo || location.pathname.split("/").pop() || "index.html").split("?")[0];
    const qs = location.search || "";
    const next = redirectTo && redirectTo.includes("?") ? redirectTo : file + qs;
    location.href = `login.html?redirect=${encodeURIComponent(next)}`;
    return false;
  }

  function requireAuthForAction(actionName) {
    if (!FailMateFirebase.isEnabled()) return true;
    if (isLoggedIn()) return true;
    showToast(`Sign in to ${actionName}.`);
    setTimeout(() => {
      location.href = `login.html?redirect=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}`;
    }, 800);
    return false;
  }

  function updateAuthUI() {
    const userEl = document.getElementById("auth-user");
    const loginLink = document.getElementById("auth-login-link");
    const logoutBtn = document.getElementById("auth-logout-btn");
    const avatarLink = document.getElementById("auth-avatar-link");

    if (!userEl && !loginLink && !logoutBtn) return;

    if (currentUser) {
      const name =
        currentUser.displayName ||
        getState()?.user?.username ||
        currentUser.email?.split("@")[0]?.toUpperCase() ||
        "OPERATOR";
      if (userEl) userEl.textContent = name;
      if (loginLink) loginLink.classList.add("hidden");
      if (logoutBtn) logoutBtn.classList.remove("hidden");
      if (avatarLink) avatarLink.href = "dashboard.html";
    } else {
      if (userEl) userEl.textContent = "GUEST";
      if (loginLink) loginLink.classList.remove("hidden");
      if (logoutBtn) logoutBtn.classList.add("hidden");
      if (avatarLink) avatarLink.href = "login.html";
    }

    if (logoutBtn && !logoutBtn._bound) {
      logoutBtn._bound = true;
      logoutBtn.addEventListener("click", () => FailMateAuth.signOut());
    }
  }

  init();

  return {
    onReady,
    getUser,
    isLoggedIn,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    requireAuth,
    requireAuthForAction,
    updateAuthUI,
  };
})();
