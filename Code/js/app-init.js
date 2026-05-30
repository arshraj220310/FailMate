const FailMateApp = (() => {
  let storeInitPromise = null;

  function ready() {
    if (!storeInitPromise) storeInitPromise = initStore();
    return storeInitPromise;
  }

  return { ready };
})();

function includeFirebaseScripts() {
  return `
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"><\/script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"><\/script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"><\/script>
    <script src="js/firebase-config.js"><\/script>
    <script src="js/firebase-init.js"><\/script>
    <script src="js/firestore-db.js"><\/script>
    <script src="js/auth.js"><\/script>
  `;
}
