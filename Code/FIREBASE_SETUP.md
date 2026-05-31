# Firebase Setup for FailMate

Follow these steps once to connect login + backend. Takes ~10 minutes.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it `failmate` (or anything)
3. Disable Google Analytics (optional) → **Create project**

## 2. Enable Authentication

1. In Firebase Console → **Build** → **Authentication** → **Get started**
2. **Sign-in method** tab:
   - Enable **Email/Password**
   - Enable **Google** (add support email when prompted)

## 3. Create Firestore Database

1. **Build** → **Firestore Database** → **Create database**
2. Start in **Production mode**
3. Pick a region close to you → **Enable**

## 4. Deploy Security Rules (REQUIRED — fixes “Missing or insufficient permissions”)

If you skip this step, **Google login and all writes will fail**.

### Option A — Firebase Console (fastest)

1. Open [Firebase Console](https://console.firebase.google.com/) → your project
2. **Build** → **Firestore Database** → **Rules** tab
3. Delete everything in the editor
4. Open `FailMate/Code/firestore.rules` in this project, copy **all** of it, paste into the console
5. Click **Publish**

You should see rules for `projects`, `comments`, `users`, `meta`, `global`, and **`revivalTeams`** — not the default `allow read, write: if false`.

### Option B — Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
cd FailMate\Code
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,storage
```

## 4b. Enable Firebase Storage (revival file uploads)

1. **Build** → **Storage** → **Get started** → use default bucket
2. **Rules** tab → paste all of `storage.rules` from this folder → **Publish**
3. Revival team uploads go to `revival/{projectId}/...`

## 5. Add Web App Config

1. Firebase Console → **Project settings** (gear icon) → **Your apps**
2. Click **Web** (`</>`) → register app name `failmate-web`
3. Copy the `firebaseConfig` object
4. Paste values into `js/firebase-config.js`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

## 6. Run the App

```powershell
cd FailMate\Code
npx --yes serve .
```

Open `http://localhost:3000/login.html` → register → you're in.

---

## What Each File Does

| File | Purpose |
|------|---------|
| `login.html` | Login / register UI (email + Google) |
| `js/firebase-config.js` | Your Firebase project keys (keep private in prod) |
| `js/firebase-init.js` | Starts Firebase app, auth, and Firestore |
| `js/auth.js` | Sign up, sign in, sign out, auth guards |
| `js/firestore-db.js` | Read/write projects, comments, users in Firestore |
| `js/store.js` | App state + syncs actions to Firebase (or localStorage fallback) |
| `js/app-init.js` | `FailMateApp.ready()` — wait for auth + data before pages render |
| `firestore.rules` | Security: anyone can read projects; only logged-in users can write |

## Firestore Collections

| Collection | Stores |
|------------|--------|
| `projects/{id}` | Failed projects (name, cause, upvotes, autopsy, etc.) |
| `comments/{projectId}` | Mourner comments per project |
| `users/{uid}` | Karma, burials, notifications, claims per user |
| `global/terminalLogs` | Live terminal feed on dashboard |
| `meta/app` | Cemetery version / migration flags |
| `revivalTeams/{projectId}` | Revival squad: progress %, owner, GitHub URL |
| `revivalTeams/.../members` | Team members |
| `revivalTeams/.../joinRequests` | Pending join requests (claimer approves on dashboard) |
| `revivalTeams/.../messages` | Team chat |
| `revivalTeams/.../workLogs` | Work updates (adds to revival %) |
| `revivalTeams/.../files` | Uploaded files + AI scan summary |

## Revival Team Flow

1. User **claims** a project → team auto-created; claimer is owner.
2. Others **request to join** from autopsy or `revival-team.html`.
3. Claimer **approves** on dashboard or team room.
4. Members work on **GitHub branches** (no file uploads) → submit branch/PR → **Notify claimer**.
5. Claimer invites collaborators on GitHub, reviews PRs, marks **Merged** in Commander tab.
6. **Notification bell** (top bar) shows join requests, branch reviews, and DMs.
7. **Private chat** tab for 1-on-1 messages with claimer/teammates.

## Auth-Protected Actions

| Action | Requires login when Firebase is on |
|--------|-------------------------------------|
| Bury project | Yes |
| Dashboard | Yes |
| Upvote / claim / comment / revival team | Yes |
| Browse graveyard / autopsy | No (public read) |

## Fallback Mode

If `firebase-config.js` still has `YOUR_API_KEY`, the app uses **localStorage** only (no login required). Configure Firebase to enable full backend.
