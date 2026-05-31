function getRedirectUrl() {
  const param = new URLSearchParams(location.search).get("redirect");
  return param || "index.html";
}

function showError(msg) {
  const el = document.getElementById("auth-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError() {
  document.getElementById("auth-error").classList.add("hidden");
}

function setLoading(on) {
  document.getElementById("auth-loading").classList.toggle("hidden", !on);
  document.getElementById("btn-login").disabled = on;
  document.getElementById("btn-signup").disabled = on;
  document.getElementById("btn-google").disabled = on;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!FailMateFirebase.isConfigured()) {
    document.getElementById("firebase-warning").classList.remove("hidden");
  }

  FailMateAuth.onReady((user) => {
    if (user) location.href = getRedirectUrl();
  });

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");

  tabLogin.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    tabLogin.classList.add("border-primary", "text-primary", "font-bold");
    tabLogin.classList.remove("border-transparent", "text-on-surface-variant");
    tabSignup.classList.remove("border-primary", "text-primary", "font-bold");
    tabSignup.classList.add("border-transparent", "text-on-surface-variant");
    hideError();
  });

  tabSignup.addEventListener("click", () => {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    tabSignup.classList.add("border-primary", "text-primary", "font-bold");
    tabSignup.classList.remove("border-transparent", "text-on-surface-variant");
    tabLogin.classList.remove("border-primary", "text-primary", "font-bold");
    tabLogin.classList.add("border-transparent", "text-on-surface-variant");
    hideError();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    if (!FailMateFirebase.isEnabled()) {
      showError("Configure Firebase in js/firebase-config.js first.");
      return;
    }
    setLoading(true);
    try {
      await FailMateAuth.signIn(
        document.getElementById("login-email").value.trim(),
        document.getElementById("login-password").value
      );
      await initStore();
      location.href = getRedirectUrl();
    } catch (err) {
      showError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    if (!FailMateFirebase.isEnabled()) {
      showError("Configure Firebase in js/firebase-config.js first.");
      return;
    }
    setLoading(true);
    try {
      await FailMateAuth.signUp(
        document.getElementById("signup-email").value.trim(),
        document.getElementById("signup-password").value,
        document.getElementById("signup-username").value.trim()
      );
      await initStore();
      location.href = getRedirectUrl();
    } catch (err) {
      showError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  });

  document.getElementById("btn-google").addEventListener("click", async () => {
    hideError();
    if (!FailMateFirebase.isEnabled()) {
      showError("Configure Firebase in js/firebase-config.js first.");
      return;
    }
    setLoading(true);
    try {
      await FailMateAuth.signInWithGoogle();
      await initStore();
      location.href = getRedirectUrl();
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") return;
      if (err.code === "permission-denied" || /permission/i.test(err.message || "")) {
        showError(
          "Firestore blocked this request. In Firebase Console → Firestore → Rules, paste the contents of firestore.rules and click Publish."
        );
      } else {
        showError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  });

  FailMateApp.boot(async () => {}, { skipLoader: false });
});
