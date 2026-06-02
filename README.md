# 🪦 FailMate: The Startup & Side-Project Cemetery

## 👋 Welcome, Judges!

A very warm welcome to the judges of this hackathon! We are thrilled to present **FailMate**—a sci-fi/cyberpunk themed dashboard built to honor, diagnose, and potentially *reanimate* the side-projects and startup ideas that didn't quite make it.

FailMate turns the tragedy of abandoned repositories into a fun, collaborative, and gamified experience where developers can:
- **Mourn** their dead ideas.
- **Diagnose** why they failed using the repository decoder.
- **Join forces** in "Revival Squads" to bring promising corpses back to life.

Thank you for your time and dedication to reviewing our project. We hope you enjoy exploring the cemetery!

---

## 🧭 Cemetery Map: What Do the Features Mean? (In Plain English!)

To help you navigate the graveyard, here is what each tab and concept means in simple language:

### 1. 🌇 Graveyard (Trending Corpses) — `index.html`
* **What it is:** The main cemetery page showing all failed projects (our "corpses") laid to rest.
* **What you can do:**
  * Browse the list of projects.
  * Search by project name.
  * Filter projects by **Cause of Death** (e.g., Burnout, No PMF, No Funding, Team Split) or **Tech Category** (e.g., AI/ML, Web3, E-Commerce).
  * Check out the stats like view count, upvotes (mourners), and revival status.

### 2. 🔬 Reanimation Lab — `lab.html`
* **What it is:** The diagnosis room where you check a project's health *before* burying it.
* **What you can do:**
  * Paste a GitHub repository URL (e.g., `github.com/owner/repository`).
  * Hit **SCAN** to trigger the neural decoder. It simulates scanning the commit history, dependencies, and code stability to find structural issues.
  * Once the diagnosis finishes, click **Initiate Burial** to auto-fill details and lay it to rest in the Graveyard.

### 3. 📑 Autopsy Logs — `autopsy.html`
* **What it is:** The detailed medical record of a specific dead project.
* **What you can do:**
  * Read the **Last Words** (autopsy report) written by the creator.
  * See the exact tech stack and cause of death.
  * Leave comments/condolences on the project.
  * **Claim for Revival:** Click this to form a team and try to bring the project back to life!

### 4. 🪓 Bury Project — `bury.html`
* **What it is:** A form to manually bury a failed venture.
* **What you can do:**
  * Input details like project name, cause of death, tech category, and last words.
  * Use the auto-fill GitHub link helper if you want to pull metadata from a repo directly.
  * Submit to lay the project in the cemetery.

### 5. 💻 Gravedigger Dashboard — `dashboard.html`
* **What it is:** Your personal command center.
* **What you can do:**
  * Monitor your **Karma Reputation** (Score goes up by burying (+50), claiming revivals (+25), and upvoting (+5)).
  * View your **Personal Burial Ground** (projects you buried).
  * See the **Live Terminal Feed** (a scrolling, real-time log of cemetery events).

### 6. 🤝 Revival Team Room — `revival-team.html`
* **What it is:** A collaborative workspace for claimed projects.
* **What you can do:**
  * Work together as a **Squad** using a public chat room.
  * Use **Private Chat** to DM the owner or specific collaborators.
  * Request to join a squad, coordinate branch work, and increase the **Revival Progress Bar** toward 100%!

### 7. 🏆 Leaderboard — `leaderboard.html`
* **What it is:** A ranking of the top corpses/projects in the cemetery based on upvotes and views.

---

## 🛠️ How to Test and Run the App

You can run FailMate in two modes depending on how quickly you'd like to test it:

### Mode A: Local Storage Fallback (Fastest - No Setup Required)
If you want to immediately see and test the UI without setting up a database:
1. Open your terminal and navigate to the project's `Code` directory:
   ```bash
   cd Code
   ```
2. Run a simple static file server. For example:
   ```bash
   npx --yes serve .
   or just visit failmate.netlify.app (demo for showcase)
   ```
   *(Or double-click `index.html` to open it in your browser directly, or run the VS Code "Live Server" extension).*
3. Open the URL provided by the server in your browser (e.g., `http://localhost:3000`).
4. **All features (burying, comments, claiming) will work instantly using your browser's local storage!** Just Sign Up and Claim the dead Projects.



---

## 📂 Project Structure

Here is a quick map of the repository files:
* `index.html` - The Graveyard (Main Cemetery Feed)
* `lab.html` - The Reanimation Lab (Repo Diagnostics & Burial Initiator)
* `autopsy.html` - Autopsy Details (Failed project description, comments, & claiming)
* `bury.html` - Bury Form (Manual project submission)
* `dashboard.html` - Gravedigger Dashboard (Karma score, live terminal feed, personal burials)
* `leaderboard.html` - Leaderboard page (Rankings based on views and upvotes)
* `revival-team.html` - Squad room for claiming & collaborative coding
* `css/` - Custom styling for matrix/neon themes and layouts
* `js/` - Frontend application logic, Firebase integrations, and state stores
