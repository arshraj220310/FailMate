
const GitHubAnalyzer = (() => {
  const API = "https://api.github.com";

  function parseRepoUrl(url) {
    const match = String(url).match(/github\.com\/([^/\s?#]+)\/([^/\s?#.]+)/i);
    if (!match) throw new Error("Invalid GitHub URL. Use: github.com/owner/repo");
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");
    return { owner, repo, full: `${owner}/${repo}` };
  }

  function headers() {
    const h = { Accept: "application/vnd.github+json" };
    if (typeof GITHUB_TOKEN !== "undefined" && GITHUB_TOKEN) {
      h.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }
    return h;
  }

  async function ghFetch(path) {
    const res = await fetch(`${API}${path}`, { headers: headers() });
    if (res.status === 404) return null;
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.message?.includes("rate limit")) {
        throw new Error("GitHub rate limit hit. Add GITHUB_TOKEN to firebase-config.js or wait an hour.");
      }
      throw new Error(body.message || "GitHub API forbidden (403)");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error ${res.status}`);
    }
    return res.json();
  }

  async function ghFetchText(path) {
    const res = await fetch(`${API}${path}`, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.text();
  }

  function decodeContent(data) {
    if (!data?.content) return null;
    try {
      return atob(data.content.replace(/\n/g, ""));
    } catch {
      return null;
    }
  }

  function daysSince(dateStr) {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function inferCategory(languages, topics, description) {
    const langs = Object.keys(languages || {}).join(" ").toLowerCase();
    const text = `${(topics || []).join(" ")} ${description || ""}`.toLowerCase();
    if (/solidity|web3|blockchain|crypto/.test(text + langs)) return "WEB3";
    if (/python|pytorch|tensorflow|ml|ai/.test(text + langs)) return "AI/ML";
    if (/shop|commerce|stripe|cart/.test(text)) return "E-COMMERCE";
    return "NETWORK";
  }

  function inferCause(repo, daysIdle, openIssues) {
    if (repo.archived) return "BURNOUT";
    if (daysIdle !== null && daysIdle > 365) return "NO_PMF";
    if (openIssues > 50) return "TEAM_SPLIT";
    if (repo.forks < 2 && repo.stargazers_count < 5) return "NO_PMF";
    return "NO_FUNDING";
  }

  function computeStability(repo, daysIdle, contributors, hasReadme, openIssues) {
    let score = 100;
    if (repo.archived) score -= 40;
    if (daysIdle !== null) {
      if (daysIdle > 730) score -= 35;
      else if (daysIdle > 365) score -= 25;
      else if (daysIdle > 180) score -= 15;
      else if (daysIdle > 90) score -= 8;
    }
    if (!hasReadme) score -= 10;
    if (!contributors?.length) score -= 15;
    else if (contributors.length === 1) score -= 8;
    if (openIssues > 30) score -= 10;
    if (repo.forks === 0) score -= 5;
    return Math.max(5, Math.min(100, score));
  }

  function buildAutopsyFailures(repo, analysis) {
    const failures = [];
    if (analysis.daysSincePush !== null && analysis.daysSincePush > 180) {
      failures.push({
        cause: "INACTIVITY",
        title: "Commit Flatline",
        description: `Last push was ${analysis.daysSincePush} days ago. Repository appears abandoned.`,
        severity: "error",
      });
    }
    if (repo.archived) {
      failures.push({
        cause: "ARCHIVED",
        title: "Officially Archived",
        description: "Maintainers marked this repo as archived — no further development planned.",
        severity: "error",
      });
    }
    if (analysis.openIssues > 20) {
      failures.push({
        cause: "TECH_DEBT",
        title: "Issue Backlog",
        description: `${analysis.openIssues} open issues — unresolved bugs and feature debt.`,
        severity: "warning",
      });
    }
    if (!analysis.hasReadme) {
      failures.push({
        cause: "NO_DOCS",
        title: "Missing Documentation",
        description: "No README found. Onboarding and discovery severely impacted.",
        severity: "warning",
      });
    }
    if (analysis.contributorCount <= 1) {
      failures.push({
        cause: "BUS_FACTOR",
        title: "Single Maintainer Risk",
        description: "Only one active contributor detected — classic bus factor failure.",
        severity: "warning",
      });
    }
    if (!failures.length) {
      failures.push({
        cause: "MARKET",
        title: "Low Traction Signals",
        description: `${repo.stargazers_count} stars, ${repo.forks} forks — limited community adoption.`,
        severity: "warning",
      });
    }
    return failures;
  }

  function buildDescription(repo, analysis) {
    const parts = [];
    if (repo.description) parts.push(repo.description);
    else parts.push(`GitHub repository ${analysis.full}.`);
    parts.push(
      `Last activity: ${analysis.daysSincePush !== null ? analysis.daysSincePush + " days ago" : "unknown"}.`,
      `${repo.stargazers_count} stars · ${repo.forks} forks · ${analysis.openIssues} open issues.`,
      `Primary stack: ${analysis.techStack.slice(0, 4).join(", ") || "Unknown"}.`,
      `Stability index: ${analysis.stability}%.`
    );
    return parts.join(" ");
  }

  async function analyze(url) {
    const { owner, repo, full } = parseRepoUrl(url);
    const logs = [];
    const log = (line) => logs.push(line);

    log("[SYSTEM] ESTABLISHING HANDSHAKE WITH GITHUB API...");
    log(`[SYSTEM] TARGET: ${full}`);

    const repoData = await ghFetch(`/repos/${owner}/${repo}`);
    if (!repoData) throw new Error(`Repository "${full}" not found or is private.`);

    log("> FETCHING REPOSITORY METADATA... [OK]");
    log(`  - Name: ${repoData.name}`);
    log(`  - Visibility: ${repoData.private ? "PRIVATE" : "PUBLIC"}`);
    log(`  - Default branch: ${repoData.default_branch}`);
    log(`  - License: ${repoData.license?.spdx_id || "None"}`);
    log(`  - Topics: ${(repoData.topics || []).join(", ") || "none"}`);

    log("> PARALLEL SCAN: languages, commits, contributors, issues...");

    const [languages, contributors, commits, readme, pkgJson, releases, branches, issuesOpen] = await Promise.all([
      ghFetch(`/repos/${owner}/${repo}/languages`),
      ghFetch(`/repos/${owner}/${repo}/contributors?per_page=10`),
      ghFetch(`/repos/${owner}/${repo}/commits?per_page=1`),
      ghFetch(`/repos/${owner}/${repo}/readme`),
      ghFetch(`/repos/${owner}/${repo}/contents/package.json`),
      ghFetch(`/repos/${owner}/${repo}/releases?per_page=5`),
      ghFetch(`/repos/${owner}/${repo}/branches?per_page=100`),
      ghFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=1`),
    ]);

    const langList = Object.keys(languages || {});
    log("> LANGUAGE BREAKDOWN:");
    langList.slice(0, 8).forEach((l) => {
      const pct = languages[l];
      const total = Object.values(languages).reduce((a, b) => a + b, 0);
      log(`  - ${l}: ${total ? Math.round((pct / total) * 100) : 0}%`);
    });
    if (!langList.length) log("  - No language data (empty or docs-only repo)");

    const lastCommit = commits?.[0];
    const daysIdle = daysSince(repoData.pushed_at || lastCommit?.commit?.author?.date);
    log("> COMMIT HISTORY:");
    log(`  - Total commits (API): ${repoData.size ? "see repo size " + repoData.size + " KB" : "N/A"}`);
    log(`  - Last push: ${repoData.pushed_at || "unknown"}`);
    log(`  - Days since last push: ${daysIdle ?? "?"}`);
    if (lastCommit?.commit?.message) {
      log(`  - Latest message: "${lastCommit.commit.message.split("\n")[0].slice(0, 60)}"`);
    }

    log("> COMMUNITY VITALS:");
    log(`  - Stars: ${repoData.stargazers_count}`);
    log(`  - Forks: ${repoData.forks_count}`);
    log(`  - Watchers: ${repoData.subscribers_count}`);
    log(`  - Open issues: ${repoData.open_issues_count}`);
    log(`  - Contributors (sample): ${(contributors || []).length}`);

    log("> BRANCH & RELEASE SCAN:");
    log(`  - Branches: ${Array.isArray(branches) ? branches.length : 0}`);
    log(`  - Releases: ${Array.isArray(releases) ? releases.length : 0}`);
    if (releases?.[0]) log(`  - Latest release: ${releases[0].tag_name} (${releases[0].published_at?.slice(0, 10) || "?"})`);

    let dependencies = [];
    const pkgRaw = decodeContent(pkgJson);
    if (pkgRaw) {
      try {
        const pkg = JSON.parse(pkgRaw);
        dependencies = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ].slice(0, 30);
        log("> PACKAGE.JSON DETECTED:");
        log(`  - Package: ${pkg.name || repo}@${pkg.version || "?"}`);
        log(`  - Dependencies: ${dependencies.length} packages`);
        if (dependencies.length) log(`  - Sample: ${dependencies.slice(0, 5).join(", ")}`);
      } catch {
        log("> PACKAGE.JSON: parse failed");
      }
    } else {
      log("> No package.json — checking for other manifests...");
      const cargo = await ghFetch(`/repos/${owner}/${repo}/contents/Cargo.toml`);
      const reqs = await ghFetch(`/repos/${owner}/${repo}/contents/requirements.txt`);
      if (cargo) log("  - Found Cargo.toml (Rust project)");
      if (reqs) log("  - Found requirements.txt (Python project)");
      if (!cargo && !reqs) log("  - No standard manifest found");
    }

    const hasReadme = !!readme;
    log(`> README: ${hasReadme ? "present" : "MISSING"}`);
    if (repoData.archived) log("[ALERT] REPO IS ARCHIVED BY OWNER");
    if (daysIdle !== null && daysIdle > 365) log("[ALERT] PROJECT VITAL SIGNS FLATLINING — 1+ year idle");

    const openIssues = repoData.open_issues_count || 0;
    const stability = computeStability(repoData, daysIdle, contributors, hasReadme, openIssues);
    log(`> STABILITY INDEX: ${stability}%`);
    log("ANALYSIS COMPLETE. DATA READY FOR BURIAL.");

    const techStack = langList.length ? langList.map((l) => l.toUpperCase()) : ["GITHUB"];
    if (dependencies.includes("react")) techStack.push("REACT");
    if (dependencies.includes("next")) techStack.push("NEXTJS");
    if (dependencies.includes("firebase")) techStack.push("FIREBASE");

    const analysis = {
      full,
      owner,
      repo: repoData.name,
      htmlUrl: repoData.html_url,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.subscribers_count,
      openIssues,
      license: repoData.license?.spdx_id || null,
      topics: repoData.topics || [],
      defaultBranch: repoData.default_branch,
      branchCount: Array.isArray(branches) ? branches.length : 0,
      releaseCount: Array.isArray(releases) ? releases.length : 0,
      latestRelease: releases?.[0]?.tag_name || null,
      archived: repoData.archived,
      isPrivate: repoData.private,
      createdAt: repoData.created_at,
      pushedAt: repoData.pushed_at,
      daysSincePush: daysIdle,
      languages: languages || {},
      techStack: [...new Set(techStack)],
      contributorCount: (contributors || []).length,
      contributors: (contributors || []).slice(0, 5).map((c) => c.login),
      hasReadme,
      dependencies,
      lastCommitMessage: lastCommit?.commit?.message?.split("\n")[0] || null,
      lastCommitDate: lastCommit?.commit?.author?.date || repoData.pushed_at,
      scannedAt: Date.now(),
    };

    analysis.stability = stability;
    analysis.inferredCategory = inferCategory(languages, repoData.topics, repoData.description);
    analysis.inferredCause = inferCause(repoData, daysIdle, openIssues);
    analysis.summaryDescription = buildDescription(repoData, analysis);
    analysis.autopsyFailures = buildAutopsyFailures(repoData, analysis);

    return {
      repo: full,
      logs,
      stability,
      analysis,
      name: repoData.name,
      description: analysis.summaryDescription,
      techStack: analysis.techStack,
      causeOfDeath: analysis.inferredCause,
      techCategory: analysis.inferredCategory,
    };
  }

  return { analyze, parseRepoUrl };
})();

async function analyzeGithub(url) {
  return GitHubAnalyzer.analyze(url);
}
