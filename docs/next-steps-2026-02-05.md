# Statusrapport & Nästa Steg — 2026-02-05

**Skapad av:** CEO/PM
**Syfte:** Fullständig statusgenomgång och prioritering av nästa MVP-milstolpe

---

## Executive Summary

**Sprint-status:** Sprint 1.0 är DONE, Sprint 1.1 (Audio) är DONE, Sprint 1.2 (Followup) är DONE. Sprint 1.3 (TTS Voice) pågår.

**Funktionellt läge:**
- Backend + contracts + web-player: PRODUKTIONSKLAR för core game loop
- tvOS: PRODUKTIONSKLAR med audio mix + TTS + följdfrågor + finale
- iOS Host: PRODUKTIONSKLAR med pro-view + session management
- Audio-systemet: Komplett (musik + ducking + TTS + SFX + finale)
- Reconnect: Fungerar på alla clients med STATE_SNAPSHOT + grace period

**Kritiska gaps för MVP:**
1. TTS-generation saknas (ElevenLabs integration i ai-content service)
2. AI content pipeline saknas (destination/clue/followup generation)
3. Ingen staging/production deploy (endast localhost)
4. Ingen CI/CD pipeline
5. Ingen systematisk E2E-testning (endast ad-hoc smoke tests)

---

## Status per Task-serie

### 1xx — Contracts (Architect) — ✅ KOMPLETT

| Task | Status | Version |
|------|--------|---------|
| TASK-101 | ✅ | Events v1.3.2 (26 event-typer) |
| TASK-102 | ✅ | State v1.3.2 (phase, players, destination, followup, audio) |

**Contracts changelog:**
- v1.0.0 (Sprint 1.0): Core game flow (clue, brake, reveal, scoring)
- v1.1.0 (Sprint 1.1): Audio system (MUSIC_SET, SFX_PLAY, FINAL_RESULTS_PRESENT)
- v1.2.0 (Sprint 1.2): Followup questions (FOLLOWUP_QUESTION_PRESENT, FOLLOWUP_ANSWER_SUBMIT)
- v1.3.0 (Sprint 1.3): TTS voice (AUDIO_PLAY, AUDIO_STOP, TTS_PREFETCH)
- v1.3.1: Clue-read + question-read TTS phrases (banter.md)
- v1.3.2: Round-intro banter (ROUND_INTRO → voice + musik)

**Bedömning:** Contracts är stabila och kompletta för MVP. Inga ändringar behövs före produktion.

---

### 2xx — Backend (Backend) — ✅ 100% FUNKTIONELLT

| Task | Status | Scope |
|------|--------|-------|
| TASK-201 | ✅ | Express + ws, TypeScript, health check, JWT auth |
| TASK-202 | ✅ | REST API (session create, join, tv-join) |
| TASK-203 | ✅ | WebSocket handler + JWT validation + WELCOME |
| TASK-204 | ✅ | Lobby state management |
| TASK-205 | ✅ | State machine (LOBBY → CLUE_LEVEL → REVEAL → FOLLOWUP → SCOREBOARD → FINAL_RESULTS) |
| TASK-206 | ✅ | Brake fairness (in-memory lock, rate-limit, brake-concurrency-test.ts) |
| TASK-207 | ✅ | Answer submission + locking (hasLockedAnswerForDestination, role-projection) |
| TASK-208 | ✅ | Reveal + scoring (alias-match, scoreLockedAnswers, DESTINATION_RESULTS) |
| TASK-209 | ✅ | Reconnect (STATE_SNAPSHOT + grace period för PLAYER-roll) |
| TASK-210 | ⬜ | Scoring engine (detaljerad implementation, ej kritisk än) |
| TASK-211 | ⬜ | Answer normalization + fuzzy match (ej kritisk än) |

**Audio-relaterade (Sprint 1.1 + 1.3):**
- ✅ Audio Director (audio-director.ts): MUSIC_SET, SFX_PLAY, AUDIO_PLAY orchestration
- ✅ Music ducking (-10dB, 150ms attack, 900ms release)
- ✅ FINAL_RESULTS timeline (10-12s: sting → drumroll → fanfare → confetti)
- ✅ TTS prefetch (TTS_PREFETCH manifest sent to tvOS)
- ✅ Reconnect under audio playback (activeVoiceClip in STATE_SNAPSHOT)

**Pacing (Producer-driven):**
- ✅ Batch 1: Reveal staging + lock pause + graduated timers (14s → 5s)
- ✅ Batch 2: FINAL_RESULTS ceremony + before_clue banter
- ✅ Re-audit (pacing-audit-2): Flaggade 5 bugs, alla fixade

**Hardcoded content:**
- ✅ Paris, Tokyo, New York, Rome, Cairo i content-hardcoded.ts (5 clues + aliases per destination)

**Bedömning:** Backend är funktionellt komplett för MVP med hardcoded content. Behöver deploy + monitoring.

---

### 3xx — Web Player (Web) — ✅ 100% FUNKTIONELLT

| Task | Status | Scope |
|------|--------|-------|
| TASK-301 | ✅ | Vite + React 18, Router, mobile-first CSS |
| TASK-302 | ✅ | Join flow (QR/join-code → name input → localStorage session) |
| TASK-303 | ✅ | Lobby view (player list, real-time updates) |
| TASK-304 | ✅ | Brake button + answer form (BRAKE_PULL, BRAKE_ANSWER_SUBMIT) |
| TASK-305 | ✅ | Reveal + scoreboard (DESTINATION_REVEAL, SCOREBOARD_UPDATE) |
| TASK-306 | 🔶 | Reconnect (auto-reconnect med exponential backoff, STATE_SNAPSHOT restore) |

**Sprint 1.2 (Followup):**
- ✅ FOLLOWUP_QUESTION_PRESENT → answer input (MC + open-text)
- ✅ FOLLOWUP_ANSWER_SUBMIT → FOLLOWUP_RESULTS scoring display
- ✅ Reconnect under followup-timer (STATE_SNAPSHOT restores timer state)

**UI/UX Redesign (Web-designer):**
- ✅ Game-show vibes (animationer, färger, typografi)
- ✅ Fade-ins, scale-bounces, pulse-effects
- ✅ Responsiv för alla mobil-storlekar

**Bug-fixes (Svenska):**
- ✅ P1 svenska-korrektur (knapptexter, placeholder-text)

**Bedömning:** Web-player är produktionsklar. Deploy till Vercel krävs.

---

### 4xx — iOS Host (iOS-Host) — ✅ 100% FUNKTIONELLT

| Task | Status | Scope |
|------|--------|-------|
| TASK-401 | ✅ | SwiftUI project (NetworkManager, SwiftPM) |
| TASK-402 | ✅ | Session creation (QR-kod, joinCode-display) |
| TASK-403 | ✅ | Lobby management (player list, HOST_START_GAME) |
| TASK-404 | ✅ | Game monitoring (pro-view: correctAnswer, brakeOwner, lockedAnswers) |

**Sprint 1.2 (Followup):**
- ✅ Followup pro-view (correctAnswer card, answersByPlayer list, results)
- ✅ Reconnect restore (STATE_SNAPSHOT → GameViewModel state)

**Sprint 1.1 (Audio Controls):**
- ✅ Music gain slider (HOST_MUSIC_GAIN_SET: -40dB till +6dB)
- ✅ FINAL_RESULTS standings display

**Bug-fixes (Svenska):**
- ✅ P1 svenska-korrektur (knapptexter)

**Bedömning:** iOS Host är produktionsklar. Deploy via TestFlight krävs.

---

### 5xx — tvOS (tvOS) — ✅ 100% FUNKTIONELLT

| Task | Status | Scope |
|------|--------|-------|
| TASK-501 | ✅ | tvOS SwiftUI project (SPM shared code) |
| TASK-502 | ✅ | TV join + lobby (QR-display, player list) |
| TASK-503 | ✅ | Clue display (5 nivåer, locked-count, fade-ins) |
| TASK-504 | ✅ | Reveal + scoreboard (DESTINATION_REVEAL, results overlay) |

**Sprint 1.1 (Audio):**
- ✅ Audio Director (AVAudioEngine: 3 mixers: music, voice, SFX)
- ✅ MUSIC_SET loop (music_travel, music_followup) + fadeIn/fadeOut
- ✅ SFX_PLAY (sfx_brake, sfx_lock, sfx_reveal, sfx_winner_fanfare)
- ✅ Music ducking (-10dB vid AUDIO_PLAY, 150ms attack, 900ms release)
- ✅ FINAL_RESULTS confetti (ConfettiView particle system)

**Sprint 1.2 (Followup):**
- ✅ Followup question card (urgent timer color transition)
- ✅ FOLLOWUP_RESULTS overlay (correctAnswer, scoreboard)
- ✅ Reconnect restore (activeVoiceClip derivation från serverTimeMs)

**Sprint 1.3 (TTS Voice):**
- ✅ TTS_PREFETCH manifest loading (prefetched clips)
- ✅ AUDIO_PLAY voice clip playback + auto-ducking
- ✅ AUDIO_STOP (interrupt active voice)
- ✅ Clue-text reveal delay (textRevealAfterMs: text fades in efter TTS läst upp)

**TV-specific Redesign (tvOS-designer):**
- ✅ Fade-ins, scaling, contrast (TV-distance readability)
- ✅ Design system (Colors, Fonts, Spacing, Animations)

**Bug-fixes:**
- ✅ Bug 1+5 (ducking via AVAudioEngine, followup-incoming guard)
- ✅ Bug 2+3+4 (manifest replace, VOICE_LINE fallback, snapshot leak)
- ✅ P1 svenska-korrektur ("Nytt spel" ej "Ny spel")

**Bedömning:** tvOS är produktionsklar. Deploy via TestFlight krävs.

---

### 6xx — Integration/E2E (CEO) — 🔶 PARTIELLT

| Task | Status | Scope |
|------|--------|-------|
| TASK-601 | 🔶 | E2E integration test (formell test med alla clients saknas) |
| TASK-602 | 🔶 | Reconnect stress test (ej formellt körd) |
| TASK-603 | ✅ | Brake fairness stress test (brake-concurrency-test.ts: 5 simultana brakes, 1 accepted) |

**Genomförda ad-hoc tester:**
- ✅ backend-test-run.md (session, lobby, game flow, brake, answer)
- ✅ tvos-smoke-test.md (Tests 1-8: lobby, clue, audio, followup, reconnect)
- ✅ ios-host-smoke-test.md (8 scenarios)
- ✅ web-player-smoke-test.md (join, lobby, game, followup)
- ✅ sprint-1-test-checklist.md (partial)
- ✅ e2e-sofftest-report.md (Soffi's manual test: 4 spelare + host + TV, full loop)
- ✅ Sprint 1.2 E2E followups test (32/32 assertions passed)

**Saknas:**
- ⬜ Formell E2E automated test-suite (Playwright/Cypress)
- ⬜ Reconnect stress test (5 players reconnect samtidigt under olika phases)
- ⬜ Timer race condition test (brake under followup-timer expiry)

**Bedömning:** Manuella smoke tests är genomförda och godkända. Behöver automated E2E-suite (TASK-701).

---

### 7xx — QA Tester (qa-tester) — ⬜ EJ PÅBÖRJAT

**Status:** Agent rekryterad 2026-02-05, inga tasks körda än.

| Task | Status | Scope |
|------|--------|-------|
| TASK-701 | ⬜ | E2E test suite creation (happy path: lobby → game → followup → finale) |
| TASK-702 | ⬜ | Edge-case test scenarios (reconnect under brake, simultaneous brake-pull, timer races) |
| TASK-703 | ⬜ | Regression test scenarios (graduated timers, reveal staging, lock pause) |
| TASK-704 | ⬜ | Stress tests (5 players spam brake, reconnect during every phase) |
| TASK-705 | ⬜ | Bug report creation + verification (FAIL test-cases) |

**Bedömning:** QA-agent är redo att börja. TASK-701 är högsta prioritet för MVP.

---

### 8xx — DevOps (devops) — ⬜ EJ PÅBÖRJAT

**Status:** Agent rekryterad 2026-02-05, inga tasks körda än.

| Task | Status | Scope |
|------|--------|-------|
| TASK-801 | ⬜ | Deploy audit + staging setup (Railway/Vercel staging-miljö) |
| TASK-802 | ⬜ | CI/CD pipeline (GitHub Actions: auto-test + auto-deploy) |
| TASK-803 | ⬜ | Error tracking setup (Sentry för backend, LogRocket för web) |
| TASK-804 | ⬜ | Monitoring + uptime setup (structured logs, UptimeRobot) |
| TASK-805 | ⬜ | Secrets management (.env.example, GitHub Secrets, Railway env vars) |

**Bedömning:** DevOps-agent är redo att börja. TASK-801 är blocker för staging-test.

---

### 9xx — Game Designer (game-designer) — ⬜ EJ PÅBÖRJAT

**Status:** Agent rekryterad 2026-02-05, inga tasks körda än.

| Task | Status | Scope |
|------|--------|-------|
| TASK-901 | ⬜ | Game balance audit (analysera contracts/scoring.md + audio_timeline.md) |
| TASK-902 | ⬜ | Playtesting analysis + recommendations (feedback från qa-tester + real spelgrupper) |
| TASK-903 | ⬜ | Difficulty curve design (Easy/Normal/Hard settings?) |
| TASK-904 | ⬜ | Scoring system iteration (baserat på playtesting-data) |

**Bedömning:** Game-designer kan börja efter TASK-701 (E2E-tester ger feedback för balansering).

---

### 10xx — Visual Content (visual-content) — ⬜ EJ PÅBÖRJAT

**Status:** Agent rekryterad 2026-02-05, inga tasks körda än.

| Task | Status | Scope |
|------|--------|-------|
| TASK-1001 | ⬜ | Asset catalog specification (bilder/video per phase) |
| TASK-1002 | ⬜ | Gemini prompt library (AI generation prompts) |
| TASK-1003 | ⬜ | Integration guide (tvOS/web asset usage) |
| TASK-1004 | ⬜ | Variation strategy (asset rotation) |
| TASK-1005 | ⬜ | Naming convention + asset organization |

**Bedömning:** Visual-content kan börja efter MVP-deploy (polish-phase).

---

### AI Content Pipeline (ai-content) — ⬜ EJ PÅBÖRJAT

**Status:** Ingen agent tilldelad, ingen kod skriven.

**Kritiskt för MVP:**
- ⬜ AI destination generation (OpenAI/Claude API: generate city + 5 clues + aliases)
- ⬜ Fact verification (RAG: Wikipedia + Wikidata lookup)
- ⬜ Anti-leak control (banned terms check: clues vs followup answers)
- ⬜ TTS pre-generation (ElevenLabs API: pregen all TTS clips för en round)
- ⬜ TTS cache (lagra i object storage/CDN, återanvänd mellan sessions)

**Bedömning:** BLOCKER för produktion med dynamiskt content. Hardcoded content fungerar för MVP soft-launch.

---

## Kritiska Blockers för MVP

### Blocker 1: Deploy & Staging (Högsta prioritet)

**Problem:** All kod körs på localhost. Ingen staging-miljö, ingen production-deploy, ingen CI/CD.

**Impact:** Omöjligt att beta-testa med externa spelare. Ingen disaster recovery. Ingen monitoring.

**Lösning:**
- **TASK-801** (devops): Deploy audit + staging setup
  - Backend → Railway (staging + production)
  - Web-player → Vercel (staging + production)
  - iOS Host + tvOS → TestFlight (beta distribution)
  - .env.example-filer + secrets management (GitHub Secrets, Railway env vars)
- **TASK-802** (devops): CI/CD pipeline
  - GitHub Actions: auto-test + auto-deploy på main-push
  - Smoke test pipeline (backend health check, web build, tvOS compile)

**Estimat:** 2-3 dagar (devops)
**Prioritet:** P0 (MUST för MVP)

---

### Blocker 2: Automated E2E Testing

**Problem:** Endast ad-hoc manuella smoke tests. Inga automated regressions. Bugs kan slinka igenom vid deploy.

**Impact:** Risk för production bugs, ingen CI gate, tidskrävande manuell test.

**Lösning:**
- **TASK-701** (qa-tester): E2E test suite creation
  - Playwright/Cypress för web-player
  - Backend REST + WS integration tests (ws-client library)
  - Happy path: lobby → game → followup → finale (automatiserad)
  - Test-suite.md (dokumentation + reproducerbara test-cases)

**Estimat:** 2-3 dagar (qa-tester)
**Prioritet:** P0 (MUST för MVP)

---

### Blocker 3: TTS Generation (ElevenLabs)

**Problem:** TTS-clips är inte genererade. Backend skickar TTS_PREFETCH manifest, men clips saknas. tvOS har audio-player men inget att spela.

**Impact:** Spelet fungerar utan röst (text-only), men MVP-spec kräver TTS för att kännas som TV-show.

**Lösning:**
- **Ny task: TASK-A01** (ai-content): ElevenLabs TTS integration
  - API client (ElevenLabs Node.js SDK)
  - Voice ID selection (Swedish voice)
  - Batch-generation för en round (intro, 5 clues, 2 followups, banter)
  - Upload till object storage (Railway volumes eller S3-compatible)
  - Cache manifest (samma clip återanvänds för samma text)
- **Ny task: TASK-A02** (backend): TTS job orchestration
  - Trigger TTS generation vid PREPARING_ROUND (async job)
  - Poll completion status
  - Send TTS_PREFETCH manifest när klart
  - Fallback: skip AUDIO_PLAY om clips saknas (graceful degradation)

**Estimat:** 3-4 dagar (ai-content + backend)
**Prioritet:** P1 (SHOULD för MVP, men kan soft-launch utan)

---

### Blocker 4: AI Content Generation (Destinations)

**Problem:** Endast 5 hardcoded destinations (Paris, Tokyo, New York, Rome, Cairo). Repetitivt efter 1-2 sessions.

**Impact:** Spelare kommer se samma destinationer. Replay-value låg. Produktion ej skalbar.

**Lösning:**
- **Ny task: TASK-A11** (ai-content): Destination generation pipeline
  - OpenAI/Claude API: generate city + country + 5 clues + 2 followups + aliases
  - Constraints: 10p-clue får ej nämna land, 2p-clue får ej nämna stad
  - Output: JSON-format (content-pack)
- **Ny task: TASK-A12** (ai-content): Fact verification (RAG)
  - Wikipedia API: lookup city metadata
  - Wikidata SPARQL: verify claims (årtal, befolkning, landmärken)
  - Reject clues med un-verifiable claims
- **Ny task: TASK-A13** (ai-content): Anti-leak control
  - Extract banned terms från clues (entity names, years)
  - Check followup-answers för overlap
  - Reject followups som läcker svar
- **Ny task: TASK-A14** (backend): Dynamic content loading
  - Replace content-hardcoded.ts med DB-backed destination loader
  - Seed DB med 50 AI-genererade destinations
  - Round selection: random pick, undvik repetition

**Estimat:** 7-10 dagar (ai-content + backend)
**Prioritet:** P1 (SHOULD för production, men kan soft-launch med hardcoded)

---

## Nästa 5 Prioriterade Tasks

### Task 1: TASK-801 (devops) — Deploy Audit + Staging Setup

**Agent:** devops
**Scope:** Skapa staging-miljö för backend + web-player + TestFlight beta för iOS/tvOS
**Varför:** BLOCKER för beta-test med externa spelare. Ingen kan spela utanför localhost.
**Acceptance Criteria:**
- Railway staging för backend (ws:// + https://)
- Vercel staging för web-player (https://)
- TestFlight beta för iOS Host + tvOS
- .env.example-filer i alla services/apps
- docs/deploy-spec.md (secrets management, URL-konfiguration)
**Estimat:** 2-3 dagar
**Kommando:** "Kör TASK-801"

---

### Task 2: TASK-701 (qa-tester) — E2E Test Suite Creation

**Agent:** qa-tester
**Scope:** Automated E2E-testning (happy path: lobby → game → followup → finale)
**Varför:** BLOCKER för CI/CD. Ingen automated test-gate = risk för production bugs.
**Acceptance Criteria:**
- Playwright/Cypress test-suite för web-player
- Backend integration tests (REST + WS)
- Test scenario 1: Happy path (3 spelare, full loop till FINAL_RESULTS)
- Test scenario 2: Brake fairness (5 simultana brakes, endast 1 accepterad)
- Test scenario 3: Reconnect under CLUE_LEVEL (player reconnect, STATE_SNAPSHOT restore)
- docs/test-suite.md (alla test-cases dokumenterade)
**Estimat:** 2-3 dagar
**Kommando:** "Kör TASK-701"

---

### Task 3: TASK-802 (devops) — CI/CD Pipeline (GitHub Actions)

**Agent:** devops
**Scope:** GitHub Actions pipeline: auto-test + auto-deploy på main-push
**Varför:** BLOCKER för production-ready deploy. Manuell deploy = risk för human error.
**Acceptance Criteria:**
- .github/workflows/backend.yml (lint + test + deploy till Railway staging)
- .github/workflows/web.yml (lint + build + deploy till Vercel staging)
- .github/workflows/tvos.yml (compile check)
- Auto-deploy till staging på main-push
- Production deploy requires manual approval (GitHub Environments)
**Dependencies:** TASK-801 (staging-miljö måste finnas först)
**Estimat:** 1-2 dagar
**Kommando:** "Kör TASK-802"

---

### Task 4: TASK-A01 (ai-content) — ElevenLabs TTS Integration

**Agent:** ai-content (ny agent, måste rekryteras)
**Scope:** ElevenLabs API integration + batch TTS generation
**Varför:** TTS är en core MVP-feature. Utan röst känns spelet flat.
**Acceptance Criteria:**
- ElevenLabs Node.js client (elevenlabs package)
- Voice ID selection (Swedish voice: "Alice" eller custom)
- Batch-generation för en round: intro (1 clip), clues (5 clips), followups (2 clips), banter (5-10 clips)
- Upload till Railway volumes eller S3-compatible storage
- TTS manifest JSON (clipId → URL mapping)
- Cache: samma text → återanvänd clip (MD5 hash lookup)
**Dependencies:** TASK-801 (Railway staging för object storage)
**Estimat:** 2-3 dagar
**Kommando:** "Rekrytera ai-content agent → Kör TASK-A01"

---

### Task 5: TASK-A02 (backend) — TTS Job Orchestration

**Agent:** backend
**Scope:** Trigger TTS generation vid PREPARING_ROUND + send TTS_PREFETCH manifest
**Varför:** Backend måste orchestrera TTS-jobs och skicka manifest till tvOS.
**Acceptance Criteria:**
- PREPARING_ROUND → async job: call ai-content service /generate-tts API
- Poll completion status (eller webhook callback)
- Send TTS_PREFETCH manifest till tvOS när klart
- Fallback: skip AUDIO_PLAY om clips saknas (graceful degradation till text-only)
- Update STATE_SNAPSHOT audioState.ttsManifest (HOST-only projection)
**Dependencies:** TASK-A01 (TTS generation API måste finnas)
**Estimat:** 1-2 dagar
**Kommando:** "Kör TASK-A02"

---

## Execution Order (Rekommenderad)

**Week 1 (Deploy + Testing):**
1. TASK-801 (devops): Deploy audit + staging setup (2-3 dagar)
2. TASK-701 (qa-tester): E2E test suite creation (2-3 dagar, parallellt)
3. TASK-802 (devops): CI/CD pipeline (1-2 dagar, efter TASK-801)

**Week 2 (TTS + AI Content):**
4. Rekrytera ai-content agent
5. TASK-A01 (ai-content): ElevenLabs TTS integration (2-3 dagar)
6. TASK-A02 (backend): TTS job orchestration (1-2 dagar, efter TASK-A01)

**Week 3 (AI Content Pipeline — optional för soft-launch):**
7. TASK-A11 (ai-content): Destination generation pipeline (3-4 dagar)
8. TASK-A12 (ai-content): Fact verification (RAG) (2-3 dagar, parallellt)
9. TASK-A13 (ai-content): Anti-leak control (1-2 dagar)
10. TASK-A14 (backend): Dynamic content loading (1-2 dagar)

**Week 4 (Beta Test + Polish):**
11. Beta test med externa spelare (5-10 sessions)
12. TASK-705 (qa-tester): Bug report creation + verification
13. TASK-901 (game-designer): Game balance audit (baserat på beta feedback)
14. TASK-1001 (visual-content): Asset catalog specification (optional polish)

---

## MVP Definition of Done

MVP är klar när:

### Functional Requirements (MUST)
- [x] Backend + contracts: Komplett state machine (lobby → clue → brake → reveal → followup → finale)
- [x] Web-player: Join via QR, lobby, brake, answer, followup, reconnect
- [x] iOS Host: Session creation, lobby management, pro-view, followup monitoring
- [x] tvOS: Lobby, clue display, reveal, scoreboard, followup, audio mix (musik + ducking + SFX)
- [x] Audio system: Music loops, ducking, SFX (brake, lock, reveal, fanfare), confetti
- [x] Reconnect: STATE_SNAPSHOT restore på alla clients
- [x] Brake fairness: First brake wins (brake-concurrency-test.ts verified)
- [x] Scoring: Destination (10/8/6/4/2) + followup (+2) + SCOREBOARD_UPDATE
- [x] FINAL_RESULTS: 10-12s timeline (sting → drumroll → fanfare → confetti)

### Infrastructure Requirements (MUST för production)
- [ ] TASK-801: Staging-miljö (Railway + Vercel + TestFlight)
- [ ] TASK-802: CI/CD pipeline (GitHub Actions)
- [ ] TASK-701: Automated E2E tests (happy path + brake fairness + reconnect)
- [ ] TASK-803: Error tracking (Sentry backend, LogRocket web) — optional för soft-launch
- [ ] TASK-804: Monitoring + uptime (structured logs) — optional för soft-launch

### Content Requirements (SHOULD för production)
- [ ] TASK-A01: TTS generation (ElevenLabs API)
- [ ] TASK-A02: TTS job orchestration (backend → ai-content)
- [ ] TASK-A11-A14: AI content pipeline (destination generation, fact verification, anti-leak)

### Polish Requirements (NICE-TO-HAVE)
- [ ] TASK-901: Game balance audit (game-designer feedback)
- [ ] TASK-1001: Visual assets (asset catalog för tvOS background-videos)
- [ ] TASK-704: Stress tests (5 players spam brake, reconnect during every phase)

---

## Soft-Launch Strategy (Without AI Content)

**Scenario:** Deploy MVP med hardcoded content (5 destinations) + TTS (ElevenLabs).

**Pro:**
- Snabbare time-to-market (2 veckor istället för 4)
- Validera core game loop med real spelare
- Få feedback på balansering + pacing innan AI-pipeline

**Con:**
- Repetitivt efter 1-2 sessions
- Manuell content creation (måste pregen TTS för 5 destinationer)

**Rekommendation:** Soft-launch är viable om:
1. TASK-801 (staging) + TASK-701 (E2E tests) + TASK-802 (CI/CD) är klara
2. TASK-A01 (TTS) + TASK-A02 (TTS orchestration) är klara
3. Beta-test med 10-20 spelare för feedback
4. AI content pipeline (TASK-A11-A14) kan skjutas upp till "MVP v1.1" (1-2 veckor efter soft-launch)

---

## Risk Assessment

### Risk 1: TTS Voice Quality (ElevenLabs)

**Scenario:** ElevenLabs Swedish voice låter robotisk eller feltolkar text.
**Impact:** Spelet känns unprofessional, spelupplevelsen sämre.
**Mitigation:**
- Test 3-5 Swedish voices från ElevenLabs (Alice, Adam, custom clone)
- SSML markup för betoning + pauser (t.ex. `<break time="500ms"/>` efter clue-read)
- Fallback: text-only mode (skip AUDIO_PLAY om TTS känns dålig)

### Risk 2: WebSocket Connection Drops (Production)

**Scenario:** Railway/Vercel WebSocket-connections droppar efter 60s inactivity.
**Impact:** Players disconnectas mitt i spelet.
**Mitigation:**
- Heartbeat ping/pong (var 30s) för keep-alive
- Auto-reconnect med exponential backoff (redan implementerat i web-player)
- Grace period reconnect för PLAYER-roll (redan implementerat i backend)

### Risk 3: Race Conditions (Brake Fairness)

**Scenario:** Simultana brakes på production kan trigga race condition (två brakes accepterade).
**Impact:** Fairness bryter, spelare förlorar förtroende.
**Mitigation:**
- In-memory lock är testad (brake-concurrency-test.ts)
- TASK-704 (stress test): 5 players spam brake under 10 rounds
- Redis distributed lock för multi-instance backend (Sprint 2+)

### Risk 4: AI Content Quality (Hallucinations)

**Scenario:** AI genererar felaktig clue (t.ex. "Paris är huvudstad i Tyskland").
**Impact:** Spelare förlitar sig på fakta, förlorar förtroende i spelet.
**Mitigation:**
- Fact verification (TASK-A12): RAG lookup mot Wikipedia + Wikidata
- Human-in-the-loop: Host preview innan round start (kan skip bad content)
- Fallback: hardcoded content pool (50 manuellt curerade destinationer)

---

## Rekommenderad Action Plan (Next 48h)

**Omedelbar prioritet:**
1. **Kör TASK-801** (devops): Deploy audit + staging setup
2. **Kör TASK-701** (qa-tester): E2E test suite creation (parallellt med TASK-801)

**Efter staging är uppe (dag 3-4):**
3. **Kör TASK-802** (devops): CI/CD pipeline
4. **Rekrytera ai-content agent** → läs docs/agent-recruiting-ai-content.md (om den finns, annars skapa)

**Efter CI/CD är klart (dag 5-7):**
5. **Kör TASK-A01** (ai-content): ElevenLabs TTS integration
6. **Kör TASK-A02** (backend): TTS job orchestration

**Soft-launch decision point (dag 14):**
- Om TTS fungerar + E2E tests passar → soft-launch med hardcoded content
- Om TTS inte fungerar → fallback till text-only + skjut launch 1 vecka

---

## Summary

**Nuvarande läge:** Backend + contracts + alla clients är funktionellt kompletta för MVP. Audio-systemet (musik + ducking + TTS-infrastruktur) är implementerat. Reconnect fungerar. Brake fairness är testad.

**Kritiska gaps:**
1. Deploy + staging (TASK-801)
2. Automated E2E tests (TASK-701)
3. CI/CD pipeline (TASK-802)
4. TTS generation (TASK-A01 + TASK-A02)
5. AI content pipeline (TASK-A11-A14) — optional för soft-launch

**Rekommenderad plan:** Fokusera på TASK-801 + TASK-701 + TASK-802 denna vecka. Deploy staging + TestFlight beta. Därefter TTS (TASK-A01 + TASK-A02). Soft-launch med hardcoded content om TTS fungerar. AI content pipeline kan skjutas upp till MVP v1.1.

**Time-to-MVP:** 2 veckor (med soft-launch) eller 4 veckor (med full AI content pipeline).

---

**END OF REPORT**
