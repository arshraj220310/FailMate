const FailMateDB = (() => {
  const META_DOC = "meta/app";
  const TERMINAL_DOC = "global/terminalLogs";
  const CEMETERY_VERSION = 2;

  function db() {
    return FailMateFirebase.getDb();
  }

  function isEnabled() {
    return FailMateFirebase.isEnabled();
  }

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

  async function deleteCollection(collectionName) {
    const snap = await db().collection(collectionName).get();
    if (snap.empty) return 0;
    let batch = db().batch();
    let ops = 0;
    let deleted = 0;
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      deleted++;
      if (ops >= 400) {
        await batch.commit();
        batch = db().batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    return deleted;
  }

  /** Wipe all projects + comments from Firestore (your burials only after this). */
  async function clearCemetery() {
    await waitForAuthToken();
    const p = await deleteCollection("projects");
    const c = await deleteCollection("comments");
    await db().doc(META_DOC).set(
      {
        cemeteryVersion: CEMETERY_VERSION,
        seeded: false,
        demoDataRemoved: true,
        clearedAt: Date.now(),
        deathTollBase: 0,
      },
      { merge: true }
    );
    return { projects: p, comments: c };
  }

  async function migrateCemeteryIfNeeded() {
    if (!isEnabled()) return false;
    const metaRef = db().doc(META_DOC);
    const meta = await metaRef.get();
    const version = meta.exists ? meta.data().cemeteryVersion || 0 : 0;
    if (version >= CEMETERY_VERSION) return false;

    try {
      await waitForAuthToken();
      await clearCemetery();
      console.info("[FailMate] Demo cemetery cleared. Only user burials will be stored.");
      return true;
    } catch (e) {
      console.warn("[FailMate] Cemetery migration needs login:", e.message);
      if (!meta.exists) {
        await metaRef.set({ cemeteryVersion: 0, seeded: false, deathTollBase: 0 }, { merge: true });
      }
      return false;
    }
  }

  async function initDatabase() {
    const metaRef = db().doc(META_DOC);
    const meta = await metaRef.get();
    if (!meta.exists) {
      try {
        await waitForAuthToken();
        await metaRef.set({
          cemeteryVersion: CEMETERY_VERSION,
          seeded: false,
          deathTollBase: 0,
          initializedAt: Date.now(),
        });
        await db().doc(TERMINAL_DOC).set({ logs: [] });
      } catch {
        /* read-only guest — meta created on first login */
      }
    }
    await migrateCemeteryIfNeeded();
  }

  /** Called when user is logged in — ensures demo data is wiped once. */
  async function initDatabaseAfterAuth() {
    await migrateCemeteryIfNeeded();
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
    if (!snap.exists) await createUserProfile(uid, profile);
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

  function docToProject(snap) {
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return { ...data, id: snap.id };
  }

  async function loadProject(projectId) {
    const snap = await db().collection("projects").doc(projectId).get();
    return docToProject(snap);
  }

  async function loadProjects() {
    const snap = await db().collection("projects").get();
    return snap.docs
      .map((d) => docToProject(d))
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function loadComments() {
    const snap = await db().collection("comments").get();
    const comments = {};
    snap.docs.forEach((d) => {
      comments[d.id] = d.data().comments || [];
    });
    return comments;
  }

  async function loadTerminalLogs() {
    const snap = await db().doc(TERMINAL_DOC).get();
    if (!snap.exists) return [];
    return snap.data().logs || [];
  }

  async function saveProject(project) {
    await waitForAuthToken();
    if (!project?.id) throw new Error("Project must have an id before saving");
    const clean = JSON.parse(JSON.stringify(project));
    clean.id = project.id;
    clean.updatedAt = Date.now();
    await db().collection("projects").doc(project.id).set({
      ...clean,
      savedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function saveComments(projectId, comments) {
    await waitForAuthToken();
    await db().collection("comments").doc(projectId).set({ comments });
  }

  async function saveUserPrivate(uid, data) {
    await waitForAuthToken();
    await db().collection("users").doc(uid).set(data, { merge: true });
  }

  async function saveTerminalLogs(logs) {
    await waitForAuthToken();
    await db().doc(TERMINAL_DOC).set({ logs });
  }

  function subscribeProjects(onChange) {
    return db()
      .collection("projects")
      .onSnapshot((snap) => {
        const projects = snap.docs
          .map((d) => docToProject(d))
          .filter(Boolean)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onChange(projects);
      });
  }

  async function loadInbox(uid) {
    await waitForAuthToken();
    const snap = await db().collection("users").doc(uid).collection("inbox").limit(80).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 60);
  }

  async function pushInboxNotification(targetUid, notif) {
    await waitForAuthToken();
    const id = notif.id || Date.now().toString(36);
    await db()
      .collection("users")
      .doc(targetUid)
      .collection("inbox")
      .doc(id)
      .set({ ...notif, id });
    return id;
  }

  async function markInboxRead(uid, notifId) {
    await waitForAuthToken();
    await db().collection("users").doc(uid).collection("inbox").doc(notifId).set({ isRead: true }, { merge: true });
  }

  async function markAllInboxRead(uid) {
    await waitForAuthToken();
    const snap = await db().collection("users").doc(uid).collection("inbox").where("isRead", "==", false).get();
    const batch = db().batch();
    snap.docs.forEach((d) => batch.set(d.ref, { isRead: true }, { merge: true }));
    if (!snap.empty) await batch.commit();
  }

  function subscribeInbox(uid, onChange) {
    return db()
      .collection("users")
      .doc(uid)
      .collection("inbox")
      .limit(80)
      .onSnapshot((snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 60);
        onChange(items);
      });
  }

  return {
    isEnabled,
    waitForAuthToken,
    initDatabase,
    initDatabaseAfterAuth,
    clearCemetery,
    migrateCemeteryIfNeeded,
    loadProject,
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
    loadInbox,
    pushInboxNotification,
    markInboxRead,
    markAllInboxRead,
    subscribeInbox,
  };
})();
