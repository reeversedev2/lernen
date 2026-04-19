# Lernen

A self-hosted German language learning app designed to run on a Raspberry Pi. Think Duolingo — spaced repetition, adaptive exercises, gamified progress — but private, offline-capable, and powered by a local LLM.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Router + Query |
| Backend | Fastify 4, TypeScript, Node 20 |
| Database | MongoDB 7 |
| Queue | BullMQ (Redis-backed) |
| LLM | Ollama (qwen3:1.7b, runs locally) |
| SRS Algorithm | FSRS (via ts-fsrs) |
| Grammar Checking | LanguageTool (self-hosted, Java) |
| Deployment | Docker Compose |

---

## Quick Start

```bash
# Clone the repo
git clone <repo-url> && cd lernen

# Start everything (pulls Ollama model on first run — ~1GB)
docker compose up -d

# Seed curriculum data
docker compose exec api pnpm seed

# Open the app
open http://localhost
```

The app is at `http://localhost`. Admin panel at `http://localhost/admin`.

Default admin credentials are set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars (default: `admin` / `admin`).

---

## Architecture

### Content Pipeline

All AI-generated content is produced **before** the user needs it, via a background BullMQ job queue. The user never waits for LLM inference.

```
User completes a session
       │
       ▼
Queue: topUpStagePool()
       │
       ▼
Ollama (qwen3:1.7b) generates exercise set
       │
       ▼
Stored in MongoDB (ExerciseSet)
       │
       ▼
Served instantly on next session start
```

The LLM prompt produces rich exercise objects including:
- `acceptedAnswers[]` — alternative phrasings that are also correct
- `wrongFeedback` — pre-generated explanation shown when the student is wrong
- `correctFeedback` — a teaching moment shown even on correct answers

### Answer Checking (Three Layers)

1. **Exact + Levenshtein** — handles typos, umlaut substitutions (ä→ae etc.), punctuation differences
2. **Accepted answers** — checks all pre-generated alternative phrasings before marking wrong
3. **LanguageTool** — for translation exercises only: checks if the user's answer is grammatically valid even if it doesn't match the expected answer; shown as a "Grammar note"

```
User submits answer
       │
       ▼
checkAnswer(type, userAnswer, correctAnswer, acceptedAnswers)
  ├── exact match → correct
  ├── Levenshtein ≤ threshold → typo (amber, not wrong)
  ├── matches any acceptedAnswer → correct
  └── none → wrong
       │
       ▼ (translation exercises only, async, 3s timeout)
LanguageTool grammar check
  └── grammarNote shown in feedback if issues found
```

### Spaced Repetition (FSRS)

Vocabulary cards use the **FSRS** algorithm (Free Spaced Repetition Scheduler), a modern replacement for SM-2. FSRS models memory stability and difficulty independently, producing more accurate review schedules.

| Button | FSRS Rating | Meaning |
|---|---|---|
| 0 – Again | Again | Forgot completely |
| 1 – Hard | Hard | Recalled with effort |
| 2 – Good | Good | Recalled correctly |
| 3 – Easy | Easy | Too easy |

Card state stored in MongoDB: `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `fsrsState`.

### Adaptive Difficulty (Gap Analysis)

Before generating a new exercise set, the API analyses the user's last 60 attempts:
- Accuracy per exercise type (fill\_blank, translate\_de\_en, etc.)
- Specific answers the student keeps missing

This is injected into the LLM prompt as a personalisation note so weak areas are weighted more heavily.

### Curriculum Structure

```
World (Das Dorf / Die Stadt / Die Welt / Das Leben)
  └── Stage (theme, CEFR level, unlock requirement)
        ├── Lessons (AI-generated, stored permanently)
        │     └── Exercises × 5 per lesson
        └── Practice Sessions (AI-generated, rotated)
              └── ExerciseSets × difficulty tier (easy / medium / hard)
```

Stars gate difficulty: 0–1 stars → easy, 1–2 → medium, 2–3 → hard.

---

## Services

| Service | Port | Notes |
|---|---|---|
| Web | 80 | React SPA served by nginx |
| API | 3001 | Fastify REST API |
| MongoDB | 27017 | Primary datastore |
| Redis | 6379 | BullMQ job queue |
| Ollama | 11434 | Local LLM inference |
| LanguageTool | 8010 | Grammar checking (Java, ~256MB RAM) |

---

## Monorepo Structure

```
lernen/
├── apps/
│   ├── api/                   Fastify backend
│   │   └── src/
│   │       ├── config/        Environment config (Zod-validated)
│   │       ├── middleware/    Auth, admin auth
│   │       ├── models/        Mongoose models
│   │       ├── queue/         BullMQ workers + SSE event bus
│   │       ├── routes/        REST endpoints
│   │       └── services/
│   │           ├── llm.service.ts          Ollama + content generation
│   │           ├── srs.service.ts          FSRS scheduling
│   │           ├── languageTool.service.ts Grammar checking
│   │           ├── curriculum.service.ts
│   │           ├── session.service.ts
│   │           └── xp.service.ts
│   └── web/                   React frontend
│       └── src/
│           ├── components/    Shared UI components
│           ├── hooks/         TanStack Query hooks
│           ├── pages/         Route pages
│           └── lib/           Utils, sound effects
└── packages/
    └── shared/                Shared by API + web
        └── src/
            ├── types.ts           All shared TypeScript types
            ├── schemas.ts         Zod validation schemas
            └── answer-checker.ts  Levenshtein + acceptedAnswers logic
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | local mongo | MongoDB connection string |
| `REDIS_URL` | local redis | Redis URL for BullMQ |
| `JWT_SECRET` | dev value | Access token signing key |
| `JWT_REFRESH_SECRET` | dev value | Refresh token signing key |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `qwen3` | Model name |
| `LANGUAGETOOL_URL` | `http://languagetool:8010` | LanguageTool base URL |
| `ADMIN_USERNAME` | `admin` | Admin panel username |
| `ADMIN_PASSWORD` | `admin` | Admin panel password |

---

## Pi-Specific Notes

- **Model**: qwen3:1.7b — ~1GB RAM, 2–7 min generation on Pi 4/5
- **Content is pre-generated**: Users never wait — queue runs between sessions
- **LanguageTool**: Java with `-Xmx512m` to stay within Pi RAM budget
- **Ollama flags**:
  - `OLLAMA_FLASH_ATTENTION=1` — faster ARM attention kernel
  - `OLLAMA_NUM_PARALLEL=1` — no memory splitting
  - `OLLAMA_KEEP_ALIVE=-1` — model pinned in RAM permanently

---

## System Design Decisions

### Pre-generate, never generate on demand

A Pi takes 2–7 minutes per exercise set. On-demand generation would block the user entirely. Solution: run the next generation immediately after each session completes. The user always finds content ready.

### Why FSRS over SM-2?

SM-2 (1987) uses a fixed ease factor that decays too aggressively for hard items. FSRS (2022) models memory stability independently from item difficulty, producing ~20–40% fewer unnecessary reviews. It's open-source and has a well-maintained npm package (`ts-fsrs`).

### Why LanguageTool, not the LLM, for grammar?

- **Latency**: LanguageTool responds in <100ms. Ollama adds minutes.
- **Reliability**: Rule-based grammar is deterministic. LLM evaluation varies.
- **Graceful fallback**: If LanguageTool is down (e.g. Pi is under load), the check silently degrades — user just doesn't see the grammar note.

### Answer checking design

Three-layer checking mirrors how a human teacher grades: typos are forgiven, paraphrases are accepted, and even wrong answers get specific grammatical feedback rather than a bare "incorrect."

---

## Future Plans (PRD)

### P0 — Core quality (next up)

| Feature | Description |
|---|---|
| **Exercise-level SRS** | Track grammar concept performance per user; feed a targeted "weak areas" review queue driven by FSRS — today gap analysis only informs generation, it should also drive daily review |
| **Accepted answers in UI** | Show all accepted alternatives in the feedback panel so students see the range of valid phrasings |
| **Offline PWA** | Service worker + cache-first strategy so cached lessons work when Pi is offline |

### P1 — Learning quality

| Feature | Description |
|---|---|
| **Listening exercises** | TTS with Piper (local, ARM-optimised); student hears German and types what they hear |
| **Sentence mining** | Pull real German text (news RSS, Wikipedia intros) and generate exercises from it — more authentic than fully synthetic content |
| **Grammar concept graph** | Explicit prerequisite edges (conjugation before cases, cases before subclauses); curriculum respects these dependencies |
| **Mistake pattern detection** | Cluster `ExerciseAttempt` records to surface systematic errors (always wrong article, always wrong case) as named "weak spots" |

### P2 — Engagement & retention

| Feature | Description |
|---|---|
| **Daily review queue** | Dedicated session driven purely by FSRS due dates across vocabulary + exercise concepts |
| **Streak recovery** | "You missed yesterday — catch-up session" flow to avoid streak-loss discouragement |
| **Progress export** | CSV + Anki deck export of vocabulary + performance history |
| **Difficulty auto-calibration** | Post-session: if accuracy > 80%, bump difficulty tier; if < 40%, drop it |

### P3 — Platform

| Feature | Description |
|---|---|
| **Multi-user** | Admin creates student accounts; isolated progress per user |
| **Content editor** | Admin UI to review, edit, or reject AI-generated exercises before they're served |
| **Model hot-swap** | Change Ollama model via admin UI without stack restart |
| **Learning analytics** | Per-user retention curves, vocabulary growth velocity, weak concept heatmap |

---

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode (requires local MongoDB, Redis, Ollama)
pnpm dev

# Type check all packages
pnpm -r tsc --noEmit

# Seed database
pnpm seed
```
