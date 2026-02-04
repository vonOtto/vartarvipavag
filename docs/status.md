# Status — 2026-02-04

## Sammanfattning

| | Antal |
|---|---|
| Totalt i Sprint 1 | 28 |
| ✅ Klart | 17 |
| 🔶 Partiellt | 1 |
| ⬜ Inte påbörjat | 10 |

Hela backend-stacken (P0 + P1) och web-player-klienten (P2) är funktionell genom ett komplettert brake → answer → reveal → scoreboard loop med en hardcoded destination. iOS Host och tvOS är inte påbörjada.

---

## P0 — Contracts

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-101 | ✅ | `contracts/events.schema.json` — 26 event-typer definierade. Version 1.1.0. Täcker connection, lobby, game flow, brake/answer, reveal, scoring, audio (reserverad för Sprint 1.1). |
| TASK-102 | ✅ | `contracts/state.schema.json` — GameState med phase, players, destination, lockedAnswers, scoreboard, timer, audioState. Kompletterande dokument: `projections.md` (role-based filtering), `scoring.md` (poäng-regler), `audio_timeline.md` (reserverad). |

---

## P1 — Backend (`services/backend/`)

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-201 | ✅ | Express + ws, TypeScript strict, `.env` med JWT_SECRET + PORT, `GET /health`, pino-style logger med LOG_LEVEL, graceful shutdown. |
| TASK-202 | ✅ | `POST /v1/sessions` → sessionId + joinCode + hostAuthToken + tvJoinToken + wsUrl. `POST /v1/sessions/:id/join` → playerId + playerAuthToken. `POST /v1/sessions/:id/tv` → tvAuthToken. `GET /v1/sessions/by-code/:joinCode`. Alla tokens är signerade JWT med role + 24 h expiry. In-memory session store. |
| TASK-203 | ✅ | `/ws` accepterar WebSocket-anslutning. JWT valideras från `Authorization`-header eller `?token=` query param (close codes 4001/4002/4003). Vid anslutning skickas `WELCOME` + `STATE_SNAPSHOT`. Disconnect triggar cleanup + `PLAYER_LEFT`. |
| TASK-204 | ✅ | Player join → broadcast `PLAYER_JOINED` + `LOBBY_UPDATED` till alla. Disconnect → broadcast `PLAYER_LEFT`. Ny anslutning recvar full `LOBBY_UPDATED` via STATE_SNAPSHOT. |
| TASK-205 | ✅ | State machine: `LOBBY → PREPARING_ROUND → CLUE_LEVEL(10) → … → CLUE_LEVEL(2) → REVEAL_DESTINATION → SCOREBOARD`. `HOST_START_GAME` startar loopen; `HOST_NEXT_CLUE` kliver genom ledtråd-nivåerna. Hardcoded destinationer i `content-hardcoded.ts` (Paris, Tokyo, m.fl.) med 5 ledtrådar per destination. |
| TASK-206 | ✅ | `BRAKE_PULL` hanteras i `handleBrakePull()`. Fairness-map (`_brakeFairness`) per ledtråd-nivå — första brake vinner. Rate-limit: max 1 brake/spelare/2 s via `_brakeTimestamps`. `BRAKE_ACCEPTED` broadcastad till alla; `BRAKE_REJECTED` skickas bara till avsändaren med reason (`too_late` / `already_paused` / `rate_limited` / `invalid_phase`). Phase → `PAUSED_FOR_BRAKE`. Test: `brake-concurrency-test.ts` — 5 simultana brakes, exakt 1 accepterad. |
| TASK-207 | ✅ | `BRAKE_ANSWER_SUBMIT` accepteras bara från `brakeOwnerPlayerId`. Svar sparas i `lockedAnswers` med playerId, answerText, lockedAtLevelPoints, lockedAtMs. `BRAKE_ANSWER_LOCKED` broadcastad med per-roll projection: HOST ser `answerText`, PLAYER/TV ser det inte. En spelare kan bara låsa ett svar per destination (`hasLockedAnswerForDestination`). Phase → `CLUE_LEVEL`. HOST-override: `HOST_NEXT_CLUE` fungerar i `PAUSED_FOR_BRAKE` och hoppar över svaret. Test: `answer-submission-test.ts` — 8/8 assertions. |
| TASK-208 | ✅ | Efter sista ledtråd (nivå 2) → `REVEAL_DESTINATION` med destinationsnamn + land + aliases. `scoreLockedAnswers()` jämför alla låsta svar mot rätt svar via `isAnswerCorrect()` (case-insensitive, trimmed, alias-match). `DESTINATION_RESULTS` broadcastad med isCorrect + pointsAwarded per spelare. Scoreboard updaterad och `SCOREBOARD_UPDATE` broadcastad. |
| TASK-209 | ✅ | Server hanterar `RESUME_SESSION` och skickar tillbaka full `STATE_SNAPSHOT` med rol-anpassad projection. Ny anslutning (reconnect) recvar `WELCOME` + `STATE_SNAPSHOT` automatiskt — räcker för att återhämta state. |

Backend test-scripts: `ws-smoke-test.ts`, `lobby-test.ts`, `game-flow-test.ts`, `brake-concurrency-test.ts`, `answer-submission-test.ts`.

---

## P2 — Web Player (`apps/web-player/`)

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-301 | ✅ | Vite + React 18, React Router v6. Ruter: `/` (home), `/join/:sessionId`, `/lobby`, `/game`, `/reveal`. `ProtectedRoute`-wrapper kontrollar att session finns i localStorage. Mobile-first CSS, dark theme. |
| TASK-302 | ✅ | `JoinPage`: join-code input → `GET /by-code` → name-input form → `POST /join` → session sparad i localStorage (playerId, token, wsUrl, sessionId, joinCode, playerName) → WebSocket-anslutning via `useWebSocket` → navigate till `/lobby`. |
| TASK-303 | ✅ | `LobbyPage`: visar alla anslutna spelare via `PlayerList`-komponent (grön/röd indikator). Real-time uppdatering på `LOBBY_UPDATED`. Visar joinCode. Navigerar till `/game` när phase ändras till `CLUE_LEVEL`. |
| TASK-304 | ✅ | `GamePage` + `BrakeButton` + `AnswerForm`. Clue visas via `ClueDisplay` (poäng + text). Stor amber BRAKE-knapp under `CLUE_LEVEL` — skickar `BRAKE_PULL`; disablad efter lock eller medan server-response invaktas (`braking`-flag). Vid `PAUSED_FOR_BRAKE` + isMyBrake: `AnswerForm` med text-input (max 200 chars, autofocus) + submit → `BRAKE_ANSWER_SUBMIT`; `submitting`-flag blockerar double-send. `BRAKE_REJECTED` → 2,5 s toast med anledning + fadeInOut-animation. `BRAKE_ANSWER_LOCKED` → grön "locked at X points"-badge. Per-destination state resets när `lockedAnswers` tömms. |
| TASK-305 | ✅ | `RevealPage`: visar destinationsnamn + land från `DESTINATION_REVEAL`. Visar scoreboard (alla spelare med poäng) från `SCOREBOARD_UPDATE`. Hanterar phase-transitioner: → `/game` vid nästa `CLUE_LEVEL`, → `/` vid game over. |
| TASK-306 | 🔶 | `useWebSocket`-hook har auto-reconnect med exponential backoff (initial 1 s, max 30 s, 10 attempts). Vid reconnect recvar klienten `WELCOME` + `STATE_SNAPSHOT` från servern och state återhämtas. Explicitly `RESUME_SESSION`-send från klienten är inte implementerad — servern skickar full snapshot på ny anslutning oavsett. Event-replay (missade events under gap) är inte täckt. |

---

## P3 — iOS Host (`apps/ios-host/`)

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-401 | ⬜ | Inte påbörjat. |
| TASK-402 | ⬜ | Inte påbörjat. |
| TASK-403 | ⬜ | Inte påbörjat. |
| TASK-404 | ⬜ | Inte påbörjat. |

---

## P4 — tvOS (`apps/tvos/`)

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-501 | ⬜ | Inte påbörjat. |
| TASK-502 | ⬜ | Inte påbörjat. |
| TASK-503 | ⬜ | Inte påbörjat. |
| TASK-504 | ⬜ | Inte påbörjat. |

---

## P5 — Integration & Testing

| TASK | Status | Implementerat |
|------|--------|---------------|
| TASK-601 | ⬜ | Formell E2E-test (host + TV + 3 spelare) inte körd. Individuella backend-testskripts täcker session, lobby, game flow, brake och answer. `test-report-2026-02-03.md` bekräftar fungerande loop med New York-destination. |
| TASK-602 | ⬜ | Reconnect stress-test inte formellt körd. Grundläggande reconnect täcks av TASK-306 (partiellt) och server-side STATE_SNAPSHOT. |
| TASK-603 | ✅ | `brake-concurrency-test.ts` körd och godkänd: 5 spelare bremsar binnen ~50 ms, exakt 1 `BRAKE_ACCEPTED`, 4 `BRAKE_REJECTED`. Fairness provad. |

---

## Nästa steg

Immediata (blockerar Sprint 1 DoD):
- TASK-401–404: iOS Host SwiftUI — session-skapande, lobby, game-monitoring med pro-vy
- TASK-501–504: tvOS — join/lobby, clue display, reveal/scoreboard
- TASK-306: komplettera RESUME_SESSION-send på klientsidan
- TASK-601: formell E2E-test med alla klienter

Planerat (CLAUDE.md routing):
- TASK-210: Scoring engine (detaljerad implementation mot `contracts/scoring.md`)
- TASK-211: Answer normalization + matching (fuzzy/alias)
