/** Global notification bell + Firestore inbox sync */
const FailMateNotify = (() => {
  let unsubInbox = null;

  function injectNotificationUI() {
    if (!document.getElementById("notif-panel")) {
      const backdrop = document.createElement("div");
      backdrop.id = "notif-backdrop";
      backdrop.className = "fixed inset-0 z-[60] bg-black/40 hidden";
      const panel = document.createElement("div");
      panel.id = "notif-panel";
      panel.className = "fixed top-16 right-4 z-[70] w-[min(100vw-2rem,24rem)] max-h-[70vh] glass-panel hidden flex flex-col";
      panel.innerHTML = `
        <div class="p-3 border-b border-outline-variant/30 flex justify-between items-center">
          <span class="text-label-caps text-primary">NOTIFICATIONS</span>
          <button type="button" id="notif-close" class="text-data-sm text-on-surface-variant hover:text-primary">✕</button>
        </div>
        <div id="notif-list" class="overflow-y-auto flex-1 min-h-[120px]"></div>
        <div class="p-2 border-t border-outline-variant/20 text-center">
          <button type="button" id="notif-mark-all" class="text-[10px] text-label-caps text-primary-container hover:underline">MARK ALL READ</button>
        </div>`;
      document.body.appendChild(backdrop);
      document.body.appendChild(panel);
    }

    if (!document.getElementById("notif-bell")) {
      const header = document.querySelector("header");
      if (!header) return;
      const wrap = document.createElement("div");
      wrap.className = "relative flex items-center";
      wrap.innerHTML = `
        <button type="button" id="notif-bell" class="relative material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors p-1" title="Notifications">notifications</button>
        <span id="notif-dot" class="hidden absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>`;
      const anchor = header.querySelector("a[href*='dashboard']") || header.lastElementChild;
      if (anchor?.parentElement === header) header.insertBefore(wrap, anchor);
      else header.appendChild(wrap);
    }
  }

  function subscribeCurrentUser() {
    if (unsubInbox) unsubInbox();
    unsubInbox = null;
    const uid = FailMateAuth?.getUser()?.uid;
    if (!uid || !FailMateDB?.isEnabled()) return;
    unsubInbox = FailMateDB.subscribeInbox(uid, (items) => {
      setState((s) => {
        const map = new Map();
        [...items, ...(s.notifications || [])].forEach((n) => map.set(n.id, n));
        return { ...s, notifications: Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 80) };
      });
      if (typeof renderNotificationList === "function") renderNotificationList();
    });
  }

  function renderNotificationList() {
    const list = document.getElementById("notif-list");
    const dot = document.getElementById("notif-dot");
    if (!list) return;
    const items = getState().notifications || [];
    if (dot) dot.classList.toggle("hidden", !items.some((n) => !n.isRead));
    if (!items.length) {
      list.innerHTML = '<p class="p-4 text-data-sm text-on-surface-variant/60">No signals yet.</p>';
      return;
    }
    list.innerHTML = items
      .map((n) => {
        const typeIcon =
          n.type === "github"
            ? "code"
            : n.type === "join"
              ? "person_add"
              : n.type === "dm"
                ? "forum"
                : "bolt";
        return `
        <a href="${escapeHtml(n.link || "#")}" data-notif-id="${escapeHtml(n.id)}" class="notif-item block p-4 hover:bg-surface-variant/20 border-l-2 ${n.isRead ? "border-transparent opacity-70" : "border-primary-container"}">
          <div class="flex gap-2">
            <span class="material-symbols-outlined text-primary text-sm">${typeIcon}</span>
            <div>
              <p class="text-data-sm text-on-surface-variant">${escapeHtml(n.message)}</p>
              <p class="text-[10px] text-on-surface-variant/40 mt-1">${n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</p>
            </div>
          </div>
        </a>`;
      })
      .join("");

    list.querySelectorAll(".notif-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-notif-id");
        markOneRead(id);
      });
    });
  }

  async function markOneRead(id) {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
    await persistUserPrivate();
    const uid = FailMateAuth.getUser()?.uid;
    if (uid && FailMateDB.isEnabled()) await FailMateDB.markInboxRead(uid, id).catch(() => {});
    renderNotificationList();
  }

  async function markAllRead() {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, isRead: true })) }));
    await persistUserPrivate();
    const uid = FailMateAuth.getUser()?.uid;
    if (uid && FailMateDB.isEnabled()) await FailMateDB.markAllInboxRead(uid).catch(() => {});
    renderNotificationList();
  }

  function bindPanel() {
    const bell = document.getElementById("notif-bell");
    const panel = document.getElementById("notif-panel");
    const backdrop = document.getElementById("notif-backdrop");
    if (!bell || bell._notifBound) return;
    bell._notifBound = true;

    bell.addEventListener("click", () => {
      panel?.classList.toggle("hidden");
      const open = panel && !panel.classList.contains("hidden");
      backdrop?.classList.toggle("hidden", !open);
      if (open) renderNotificationList();
    });
    backdrop?.addEventListener("click", () => {
      panel?.classList.add("hidden");
      backdrop?.classList.add("hidden");
    });
    document.getElementById("notif-close")?.addEventListener("click", () => {
      panel?.classList.add("hidden");
      backdrop?.classList.add("hidden");
    });
    document.getElementById("notif-mark-all")?.addEventListener("click", markAllRead);
  }

  function init() {
    injectNotificationUI();
    bindPanel();
    initNotifications();
    subscribeCurrentUser();
    renderNotificationList();
  }

  return { injectNotificationUI, subscribeCurrentUser, init, renderNotificationList, markAllRead };
})();
