const FailMateDB = (() => {
  const META_DOC = "meta/app";
  const TERMINAL_DOC = "global/terminalLogs";

  function db() {
    return FailMateFirebase.getDb();
  }

  function isEnabled() {
    return FailMateFirebase.isEnabled();
  }

  /** Firestore needs a fresh ID token right after Google/email sign-in. */
  async function waitForAuthToken() {
    const auth = FailMateFirebase.getAuth();
    let user = auth.currentUser;
    for (let i = 0; i < 20 && !user; i++) {
      await new Promise((r) => setTimeout(r, 100));
      user = auth.currentUser;
    }
    if (!user) throw new Error("Not signed in. Please try again.");
    await user.getIdToken(true);
  }

  async function createUserProfile(uid, profile) {
    await waitForAuthToken();
    await db().collection("users").doc(uid).set(
      {
        ...profile,
        notifications: [],
        claims: [],
        viewed: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function ensureUserProfile(uid, profile) {
    await waitForAuthToken();
    const ref = db().collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await createUserProfile(uid, profile);
    }
  }

  async function loadUserProfile(uid) {
    await waitForAuthToken();
    const snap = await db().collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  async function updateUserProfile(uid, data) {
    await db().collection("users").doc(uid).set(data, { merge: true });
  }

  async function seedIfNeeded() {
    await waitForAuthToken();
    const metaRef = db().doc(META_DOC);
    const meta = await metaRef.get();
    if (meta.exists && meta.data().seeded) return;

    const batch = db().batch();
    SEED_PROJECTS.forEach((p) => {
      batch.set(db().collection("projects").doc(p.id), { ...p, buriedBy: null, createdAt: Date.now() });
    });
    Object.entries(SEED_COMMENTS).forEach(([projectId, comments]) => {
      batch.set(db().collection("comments").doc(projectId), { comments });
    });
    batch.set(db().doc(TERMINAL_DOC), {
      logs: [
        { user: "@SYSTEM", action: "CLAIMED", target: "#D098", color: "primary" },
        { user: "@User_X", action: "UPVOTED", target: "Crypto-Dust", color: "secondary" },
      ],
    });
    batch.set(metaRef, { seeded: true, deathTollBase: DEATH_TOLL_BASE, seededAt: Date.now() });
    await batch.commit();
  }

  async function loadProjects() {
    const snap = await db().collection("projects").get();
    if (snap.empty) return structuredClone(SEED_PROJECTS);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function loadComments() {
    const snap = await db().collection("comments").get();
    const comments = {};
    snap.docs.forEach((d) => {
      comments[d.id] = d.data().comments || [];
    });
    return { ...structuredClone(SEED_COMMENTS), ...comments };
  }

  async function loadTerminalLogs() {
    const snap = await db().doc(TERMINAL_DOC).get();
    if (!snap.exists) return [];
    return snap.data().logs || [];
  }

  async function saveProject(project) {
    const { id, ...data } = project;
    await db()
      .collection("projects")
      .doc(id)
      .set({ ...data, id, updatedAt: Date.now() }, { merge: true });
  }

  async function saveComments(projectId, comments) {
    await db().collection("comments").doc(projectId).set({ comments });
  }

  async function saveUserPrivate(uid, data) {
    await waitForAuthToken();
    await db().collection("users").doc(uid).set(data, { merge: true });
  }

  async function saveTerminalLogs(logs) {
    await db().doc(TERMINAL_DOC).set({ logs });
  }

  function subscribeProjects(onChange) {
    return db()
      .collection("projects")
      .onSnapshot((snap) => {
        const projects = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onChange(projects);
      });
  }

  return {
    isEnabled,
    waitForAuthToken,
    seedIfNeeded,
    loadProjects,
    loadComments,
    loadTerminalLogs,
    loadUserProfile,
    createUserProfile,
    ensureUserProfile,
    updateUserProfile,
    saveProject,
    saveComments,
    saveUserPrivate,
    saveTerminalLogs,
    subscribeProjects,
  };
})();
