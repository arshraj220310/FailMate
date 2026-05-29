Here's your **completely free-stack version** — no paid APIs, no email services, no credit card required.

---

# 🔥 FAILURE FORGE — 100% FREE STACK & FEATURES

## No Email. No Paid Tiers. Everything Free Forever.

---

## PART A: WHAT'S REMOVED

| Removed Feature | Replacement |

|----------------|-------------|

| Email notifications | In-app notifications only (bell icon + toast messages) |

| Paid AI APIs (OpenAI) | Free open-source models (Hugging Face free tier) |

| Paid image detection | Free model: `Salesforce/blip-image-captioning` or `dalle-mini` |

| Paid text detection | Free model: `Hello-SimpleAI/chatgpt-detector-roberta` |

| SendGrid/Resend | Removed entirely |

| Paid hosting (Render paid plan) | Free tier only |

| Redis (paid beyond free) | Skip Celery — do AI analysis synchronously (slow but free) |

---

## PART B: 100% FREE TECHNOLOGY STACK

### B1. Backend (Completely Free)

| Component | Free Service | Limits |

|-----------|--------------|--------|

| **API Hosting** | [Render.com](http://Render.com) Free Tier | 750 hours/month, spins down after inactivity |

| **Alternative** | [Fly.io](http://Fly.io) Free Tier | 3 shared VMs free |

| **Alternative** | PythonAnywhere | Free forever (limited CPU) |

| **Database** | Supabase Free Tier | 500MB, 2GB bandwidth, unlimited API calls |

| **Auth** | Supabase Auth Free | Unlimited users, social login (GitHub/Google) |

| **File Storage** | Supabase Storage Free | 1GB, free CDN |

| **Background Jobs** | None (synchronous processing) | Slower but free |

| **AI Image Detection** | Hugging Face Free Inference API | 30k-100k free requests/month |

| **AI Text Detection** | Hugging Face Free Inference API | Same pool |

| **AI Generation** | Hugging Face Free (e.g., Mistral, Llama) | Rate limited but free |

### B2. Frontend (Completely Free)

| Component | Free Service | Limits |

|-----------|--------------|--------|

| **Hosting** | Vercel Free Tier | Unlimited personal projects, 100GB bandwidth |

| **Alternative** | Netlify Free Tier | 100GB bandwidth, build minutes |

| **Alternative** | GitHub Pages | Static only (no API routes) → not ideal |

| **Domain** | `.vercel.app` subdomain | Free forever |

| **Alternative** | Freenom (rare) | Free `.tk`, `.ml` domains (unreliable) |

### B3. Chrome Extension (Free Forever)

| Component | Cost |

|-----------|------|

| Chrome Web Store listing | $5 one-time (only cost in entire stack) |

| Hosting extension files | GitHub + Chrome Store |

---

## PART C: FREE API ENDPOINTS TO USE

### C1. AI Image Detection (Free)

| Model | What It Does | Free Limit |

|-------|--------------|------------|

| **Salesforce/blip-image-captioning** | Describes image → helps detect AI by weird captions | Free with HF token |

| **umm-maybe/AI-image-detector** | Specifically trained to detect AI images | Free |

| **dalle-mini/dalle-mini** | See if image looks like DALL-E output | Free |

### C2. AI Text Detection (Free)

| Model | What It Does | Free Limit |

|-------|--------------|------------|

| **Hello-SimpleAI/chatgpt-detector-roberta** | Detects ChatGPT-generated text | Free |

| **roberta-base-openai-detector** | OpenAI text detector | Free |

| **ghostbuster/ghostbuster** | Advanced AI text detection | Free |

### C3. AI Generation (Free — instead of GPT-4)

| Model | What It Does | Free Limit |

|-------|--------------|------------|

| **mistralai/Mistral-7B-Instruct** | Generate post-mortems & revival plans | Free via HF |

| **meta-llama/Llama-2-7b-chat-hf** | Alternative to Mistral | Free |

| **HuggingFaceH4/zephyr-7b-beta** | Good for structured outputs | Free |

### C4. GitHub API (Free)

| Service | Limit |

|---------|-------|

| GitHub REST API | 60 requests/hour unauthenticated, 5000/hour authenticated |

| Get a free token | Personal access token from your GitHub account |

---

## PART D: MODIFIED FEATURES (Free Version)

### D1. Instead of Email Notifications → Use In-App Only

| Notification Type | How User Receives It |

|-------------------|----------------------|

| Your project got upvoted | Bell icon → red dot → click to see |

| Someone claimed your project | Dashboard notification + toast |

| Claim approved | In-app alert on next login |

| New comment on your project | Notification center |

| Revival request status changed | Dashboard badge |

**Implementation:** Store notifications in `notifications` table. User sees them when logged in.

### D2. Instead of Background Jobs (Celery+Redis) → Synchronous Processing

| What Changes | Impact |

|--------------|--------|

| AI analysis happens immediately when user submits | User waits 3-10 seconds (show loading spinner) |

| No queue, no Redis, no Celery | Simpler, free, slightly slower |

| For long analysis, add a "Check back in 2 minutes" fallback | Polling from frontend |

### D3. Instead of OpenAI → Hugging Face Free Models

| Feature | Paid Version (Removed) | Free Version |

|---------|------------------------|--------------|

| Post-mortem generation | GPT-4 | Mistral-7B (free) |

| Revival plan | GPT-4 | Llama-2-7B (free) |

| Image detection | Specialized paid API | BLIP + heuristic rules (free) |

| Text detection | GPTZero paid | RoBERTa detector (free) |

---

## PART E: COMPLETE FREE FEATURE SET

### ✅ Included Features (Everything Below is Free)

| # | Feature | Free? |

|---|---------|-------|

| 1 | Submit a corpse (failed project) | ✅ |

| 2 | Browse graveyard (filter, search) | ✅ |

| 3 | Trending feed (upvotes + views) | ✅ |

| 4 | Project detail page | ✅ |

| 5 | Claim a project to revive | ✅ |

| 6 | AI post-mortem generator (Hugging Face) | ✅ |

| 7 | AI resurrection plan (Hugging Face) | ✅ |

| 8 | User dashboard | ✅ |

| 9 | Leaderboard | ✅ |

| 10 | Comments section | ✅ |

| 11 | Social sharing (Twitter/LinkedIn) | ✅ |

| 12 | User profiles | ✅ |

| 13 | GitHub auto-fill from URL | ✅ |

| 14 | In-app notifications (bell icon) | ✅ (replaces email) |

| 15 | Upvote system | ✅ |

| 16 | View counter | ✅ |

| 17 | Category & tech stack filters | ✅ |

| 18 | Chrome extension (all features) | ✅ |

### ❌ Removed Features (Due to Free Stack)

| # | Feature | Why Removed |

|---|---------|-------------|

| 1 | Email notifications | Requires paid email service |

| 2 | Background jobs (Celery) | Requires Redis (free tier too small) |

| 3 | PDF export of revival plan | Can do client-side PDF (free) → actually keep this! |

| 4 | Advanced OpenAI GPT-4 generation | Too expensive |

| 5 | SMS/text alerts | Costs money |

| 6 | API access for third parties | Would require paid hosting |

**Wait — PDF export is still possible client-side (jsPDF) for free!** So keep that.

---

## PART F: DATABASE SCHEMA (Free — Supabase)

### Tables You Need (No Change)

```

users

projects

claims

comments

upvotes

tags

project_tags

notifications ← NEW (replaces email)

```

### Notifications Table (Free Replacement for Email)

| Column | Type | Purpose |

|--------|------|---------|

| id | UUID | Primary key |

| user_id | UUID | Who receives this |

| type | VARCHAR | upvote, claim, comment, approval |

| message | TEXT | "Your project 'SnapCart' was upvoted" |

| is_read | BOOLEAN | Read/unread status |

| link | TEXT | Where to click (e.g., /project/snapcart) |

| created_at | TIMESTAMP | When notification was sent |

User sees red dot on bell icon → click → list of notifications.

---

## PART G: HOSTING SETUP (100% Free)

### Backend Hosting Options

| Platform | Free Plan | Best For |

|----------|-----------|----------|

| **Render** | 750 hours/month, sleeps after inactivity | Python/FastAPI |

| **[Fly.io](http://Fly.io)** | 3 shared VMs forever | Global deployment |

| **PythonAnywhere** | Always free (1 app, limited CPU) | Simple APIs |

| **Railway** | $5 credit (renews monthly) | Small projects |

**Recommendation:** Start with **Render Free Tier**

### Frontend Hosting

| Platform | Free Plan |

|----------|-----------|

| **Vercel** | Unlimited personal projects, 100GB bandwidth |

| **Netlify** | 100GB bandwidth, 300 build minutes |

**Recommendation:** **Vercel** (best Next.js support)

### Database

| Platform | Free Plan |

|----------|-----------|

| **Supabase** | 500MB, 2GB bandwidth, unlimited API |

| **[Neon.tech](http://Neon.tech)** | 1GB, branching, serverless Postgres |

**Recommendation:** **Supabase** (includes auth + storage + database)

---

## PART H: API RATE LIMITS (Free Tier Reality)

| Service | Limit | Mitigation |

|---------|-------|------------|

| Hugging Face Inference | 30-100k requests/month | Cache results in database |

| GitHub API (unauth) | 60 requests/hour | Use auth token (5000/hour) |

| Render hosting | Spins down after 15 min idle | First request takes 15-30 sec (wake-up) |

| Supabase | 2GB bandwidth/month | Fine for launch |

### Mitigation Strategy

1. **Cache AI results** — Store generated post-mortems in database, don't regenerate

2. **Use GitHub auth token** — Ask user to sign in (free, gets 5000 requests/hour)

3. **Add "wake-up" endpoint** — Ping backend every 10 min from frontend (keep alive)

4. **Compress images** — Before sending to Hugging Face (reduce bandwidth)

---

## PART I: CHROME EXTENSION (One-Time $5 Cost)

| Item | Cost |

|------|------|

| Chrome Web Store developer account | $5 (one time) |

| Everything else | $0 |

**Skip if you want:** Just distribute `.crx` file manually or host on GitHub.

---

## PART J: COMPLETE FREE TECH STACK SUMMARY

```

┌─────────────────────────────────────────────────────────┐

│                 FAILURE FORGE — FREE STACK              │

├─────────────────────────────────────────────────────────┤

│  FRONTEND                                               │

│  ├── Next.js 14 (free)                                 │

│  ├── Tailwind CSS (free)                               │

│  ├── shadcn/ui (free)                                  │

│  └── Host: Vercel (free)                               │

├─────────────────────────────────────────────────────────┤

│  BACKEND                                                │

│  ├── FastAPI (free)                                    │

│  ├── Host: Render Free Tier (free)                     │

│  ├── Database: Supabase Free (500MB)                   │

│  ├── Auth: Supabase Auth (free)                        │

│  └── Storage: Supabase Storage (1GB free)              │

├─────────────────────────────────────────────────────────┤

│  AI (All via Hugging Face Free Tier)                   │

│  ├── Image detection: blip-image-captioning            │

│  ├── Text detection: chatgpt-detector-roberta          │

│  └── Text generation: Mistral-7B or Llama-2            │

├─────────────────────────────────────────────────────────┤

│  OTHER                                                 │

│  ├── GitHub API (free with auth token)                 │

│  ├── Chrome Extension (one-time $5 for store)          │

│  └── Notifications: In-app (database only, no email)   │

└─────────────────────────────────────────────────────────┘

```

---

## PART K: WHAT YOU LOSE VS PAID VERSION

| Paid Feature | Free Alternative | Good Enough? |

|--------------|------------------|--------------|

| Email notifications | In-app bell icon | ✅ Yes |

| GPT-4 quality | Mistral-7B | ✅ 80% as good |

| Background jobs | Synchronous (wait 5-10 sec) | ✅ Fine for MVP |

| No sleep/wake delay | Render spins down | ⚠️ First user may wait 15 sec |

| 99.9% uptime | Free tier uptime (~99%) | ✅ Fine for launch |

---

## PART L: YOU ONLY PAY FOR

| Item | Cost |

|------|------|

| Chrome Web Store account | **$5 (one time)** |

| Domain name (optional — can use `.vercel.app`) | $10-15/year if you want custom domain |

| **TOTAL if you skip custom domain** | **$5** |

**If you skip Chrome Store and distribute manually:** **$0**

---

## FINAL ANSWER

### You Can Build Everything With:

| Component | Free Tool |

|-----------|-----------|

| Backend | FastAPI + Render Free |

| Frontend | Next.js + Vercel Free |

| Database | Supabase Free |

| Auth | Supabase Auth |

| AI | Hugging Face Free Inference |

| Notifications | In-app (database table) |

| Chrome Extension | $5 (or free if manual install) |

| Email | **Removed entirely** |

### Features You Keep:

- ✅ All core features (submit, browse, claim, upvote, comment)

- ✅ AI post-mortem & revival plans (via free models)

- ✅ Chrome extension (AI image + text detection, GitHub corpse detector)

- ✅ In-app notifications

- ✅ Trending feed & leaderboard

### Features You Remove:

- ❌ Email notifications

- ❌ Background jobs (users wait a few seconds instead)

---

**This is 100% buildable with zero monthly costs.**

Want me to now write the **step-by-step setup guide** for each free service (Render, Supabase, Hugging Face, Vercel) with screenshots?