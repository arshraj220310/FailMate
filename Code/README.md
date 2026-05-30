# Failmate — HTML/CSS/JS (Code folder)

Terminal-themed **Graveyard Explorer** — no Node.js build step required. Firebase powers auth + cloud database.

## How to run

```powershell
cd FailMate\Code
npx --yes serve .
```

Open `http://localhost:3000` (usually port 3000).

**First time?** See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** to connect Firebase (login, cloud sync).

## Pages

| File | Description |
|------|-------------|
| `login.html` | Sign in / register (Email + Google) |
| `index.html` | Graveyard — search, filters, trending cards, claim |
| `autopsy.html?id=...` | Project autopsy, comments, AI report, upvote |
| `bury.html` | Submit a new failed project (login required) |
| `lab.html` | Repository analysis terminal |
| `dashboard.html` | Gravedigger stats & live feed (login required) |
| `leaderboard.html` | Rankings |

## Backend (Firebase)

| Layer | File | Role |
|-------|------|------|
| Config | `js/firebase-config.js` | Your Firebase project keys |
| Init | `js/firebase-init.js` | Bootstraps Firebase SDK |
| Auth | `js/auth.js` | Login, logout, route guards |
| Database | `js/firestore-db.js` | Firestore CRUD + realtime projects |
| State | `js/store.js` | App logic + sync to Firestore |
| Boot | `js/app-init.js` | `FailMateApp.ready()` before page render |

Without Firebase config → falls back to **localStorage** (offline demo mode).

## Assets

- Logo: `assets/logo.svg`
- Styles: `css/main.css`
- Seed data: `js/data.js`

Design tokens match `DESIGN(1).md` (Terminal Green `#00FF41`, Inter + JetBrains Mono).
