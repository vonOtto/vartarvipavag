# Session Creation UX — Unified Flow for All Clients

**Version:** 1.0
**Date:** 2026-02-06
**Status:** DECISION
**Owner:** CEO (PM)

---

## Background

**User feedback from TASK-601 E2E testing:**
> "Båda måste ju ha valet om man vill skapa eller gå med i befintlig"

**Current state:**
- **Web Player**: Works correctly — user enters join code, then chooses "Player" or "Host" role (if no host exists)
- **iOS Host**: Always auto-creates session on launch (POST /v1/sessions)
- **tvOS**: After recent fix — can only JOIN (removed auto-create)

**Problem:**
Depending on start order, users can't coordinate sessions. All clients need the same choice: CREATE or JOIN.

---

## Decision: Unified Launch Flow

All clients (iOS Host, tvOS, Web) SHALL present the same two options at launch:

```
┌─────────────────────────────┐
│     PÅ SPÅRET               │
│     PARTY EDITION           │
│                             │
│   [Skapa nytt spel]         │  ← POST /v1/sessions
│   [Gå med i spel]           │  ← Enter join code → lookup → join
└─────────────────────────────┘
```

---

## Architecture

### 1. Launch Screen UX

**All clients show two primary actions:**

1. **"Skapa nytt spel"** (Create new game)
   - Calls `POST /v1/sessions`
   - Receives `sessionId`, `joinCode`, appropriate token (tvJoinToken / hostAuthToken)
   - Connects to WebSocket with assigned role (TV / HOST)
   - Proceeds to lobby

2. **"Gå med i spel"** (Join existing game)
   - Shows input field for 6-character join code
   - Calls `POST /v1/sessions/lookup?joinCode={code}` (if endpoint exists) OR attempts join directly
   - Then calls appropriate join endpoint:
     - iOS: `POST /v1/sessions/{id}/join` with role preference "HOST" (takes host if available)
     - tvOS: `POST /v1/sessions/{id}/tv` (joins as TV)
     - Web: `POST /v1/sessions/{id}/join` with role preference "PLAYER" or "HOST"
   - Connects to WebSocket
   - Proceeds to lobby

---

### 2. Role Assignment Logic

**When creating a session:**
- **iOS creates** → becomes HOST (gets hostAuthToken)
- **tvOS creates** → becomes TV (gets tvJoinToken), no host controls
- **Web creates** → shows role picker: "Host" or "Player"

**When joining an existing session:**
- **iOS joins** →
  - If `hasHost = false` → becomes HOST (sent hostAuthToken)
  - If `hasHost = true` → becomes observer (read-only host view, OR show error "Session already has host")
- **tvOS joins** → always becomes TV (only one TV per session)
- **Web joins** →
  - Shows role picker: "Host" (if !hasHost) or "Player"
  - If "Host" selected but session already has host → shows error "Host role taken"

**Backend role logic:**
- One HOST per session (first come, first served)
- One TV per session (first TV connection wins; subsequent TV join attempts rejected OR show "TV already connected")
- Multiple PLAYERs allowed (unlimited)

---

### 3. Edge Cases

#### Q: What if tvOS creates session and iOS joins?
**A:**
- tvOS is TV (no game controls)
- iOS becomes HOST (pro view + game controls)
- Result: Normal game setup (HOST controls, TV displays)

#### Q: What if iOS creates session and another iOS device joins?
**A:**
- First iOS is HOST
- Second iOS join attempt:
  - Option A (RECOMMENDED): Show error "Session already has a host. Use this device as a player via web browser."
  - Option B: Allow as read-only observer (same pro-view but no controls)
- Decision: **Option A** — keep iOS Host app exclusive to one host per session

#### Q: What if two tvOS devices try to join the same session?
**A:**
- First tvOS becomes TV
- Second tvOS join attempt rejected with error: "TV already connected to this session"
- User must either:
  - Create a new session, OR
  - Disconnect first TV and retry

#### Q: What if iOS creates session, no players join, and host wants to cancel?
**A:**
- Host can press "Nytt spel" button (already implemented in tvOS lobby)
- Calls `appState.resetSession()` → disconnects → returns to launch screen
- Server garbage-collects empty sessions after timeout (e.g., 10 minutes)

---

### 4. Backend Implications

**New or modified endpoints:**

#### Option A: Add lookup endpoint (RECOMMENDED)
```
GET /v1/sessions/lookup?joinCode={CODE}
Returns: { sessionId, hasHost, hasTv, playerCount }
```
Allows clients to query session state before joining.

#### Option B: Existing join endpoints return role assignment
Already implemented:
- `POST /v1/sessions/{id}/join` returns `{ playerId, playerAuthToken, role, wsUrl }`
- `POST /v1/sessions/{id}/tv` returns `{ tvAuthToken, wsUrl }`

No schema changes needed if clients handle role assignment client-side.

**Decision:** Use **Option B** (no new endpoint). Clients attempt join and handle rejection gracefully.

---

### 5. Implementation Plan

#### TASK-UX-01: iOS Host — Add Launch Screen with Create/Join Choice
**Owner:** ios-host agent
**Scope:** Replace auto-create with two-button launch screen
**Files:**
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/App.swift` (modify CreateSessionView → LaunchView)
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostAPI.swift` (add joinSession method)

**Acceptance Criteria:**
- Launch screen shows "Skapa nytt spel" and "Gå med i spel"
- "Skapa nytt spel" → existing flow (POST /v1/sessions)
- "Gå med i spel" → input field (6-char code) → POST /v1/sessions/{id}/join with hostAuthToken request
- If join fails (host exists), show error: "Session already has a host"
- Connect to WebSocket and proceed to lobby on success

---

#### TASK-UX-02: tvOS — Restore Create Option on Launch Screen
**Owner:** tvos agent
**Scope:** Add "Skapa nytt spel" button to existing LaunchView
**Files:**
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift` (modify LaunchView)
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/SessionAPI.swift` (add createSession method)

**Acceptance Criteria:**
- Launch screen shows "Skapa nytt spel" and "Gå med i spel" (existing join flow)
- "Skapa nytt spel" → POST /v1/sessions → receives tvJoinToken
- Connect to WebSocket as TV role
- Proceed to lobby, display QR code for players to join
- "Nytt spel" button in lobby works (calls resetSession → returns to launch screen)

---

#### TASK-UX-03: Backend — Handle Multiple Join Attempts Gracefully
**Owner:** backend agent
**Scope:** Validate role assignments, reject duplicate HOST/TV joins
**Files:**
- `/Users/oskar/pa-sparet-party/services/backend/src/api/sessions.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/store/session-store.ts`

**Acceptance Criteria:**
- `POST /v1/sessions/{id}/join` with role="HOST" rejected if session already has host (return 409 Conflict)
- `POST /v1/sessions/{id}/tv` rejected if session already has TV (return 409 Conflict)
- Error responses include helpful message: `{ error: "HOST_ROLE_TAKEN", message: "This session already has a host" }`
- Update contracts/README.md with role assignment rules

---

#### TASK-UX-04: Update TASK-601 Test Plan
**Owner:** ceo (PM)
**Scope:** Add new test scenarios for session creation flows
**Files:**
- `/Users/oskar/pa-sparet-party/docs/sprint-1-test-checklist.md`

**Test scenarios:**
1. **tvOS creates, iOS joins** → iOS becomes HOST, tvOS is TV ✅
2. **iOS creates, tvOS joins** → iOS is HOST, tvOS is TV ✅
3. **iOS creates, second iOS joins** → Second iOS shows error ✅
4. **tvOS creates, second tvOS joins** → Second tvOS shows error ✅
5. **iOS creates, web joins as "Host"** → Web shows error (host taken) ✅
6. **tvOS creates, web joins as "Player"** → Web is PLAYER ✅
7. **Reset session from lobby** → "Nytt spel" button returns to launch screen ✅

---

## UX Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     LAUNCH SCREEN (all clients)                 │
│                                                                 │
│   ┌─────────────────────┐      ┌─────────────────────┐        │
│   │  Skapa nytt spel    │      │  Gå med i spel      │        │
│   │  (Create)           │      │  (Join)             │        │
│   └──────────┬──────────┘      └──────────┬──────────┘        │
│              │                             │                   │
│              │                             │                   │
│              ▼                             ▼                   │
│   POST /v1/sessions            Input join code (6-char)       │
│       ↓                                    ↓                   │
│   sessionId, joinCode,        POST /v1/sessions/{id}/join     │
│   token (HOST/TV)                  OR /tv                     │
│       ↓                                    ↓                   │
│   Connect WS as HOST/TV       Connect WS as HOST/TV/PLAYER    │
│       ↓                                    ↓                   │
└───────┴────────────────────────────────────┴───────────────────┘
                             │
                             ▼
                        ┌─────────┐
                        │  LOBBY  │
                        └─────────┘
```

---

## Rationale

**Why this design:**
1. **Consistency:** All clients offer same two choices — no confusion about "who creates"
2. **Flexibility:** Users can start with any device (TV, iOS, Web)
3. **Coordination:** Start order doesn't matter — first device creates, others join
4. **Web player parity:** Matches existing web UX (create OR join)
5. **Future-proof:** Easy to add "Recent sessions" or "Session browser" later

**Alternative considered (rejected):**
- Auto-create on first launch: Too rigid, forces specific start order
- Session code sharing via clipboard: Requires extra steps, not TV-friendly
- QR code on iOS for tvOS to scan: Reverses expected flow (TV is the "hub")

---

## Migration Path

**Existing behavior (before this decision):**
- iOS Host: Auto-creates on launch
- tvOS: Join-only (recent fix)
- Web: Already supports create/join

**After implementation:**
- All clients: Create OR join at launch
- No breaking changes to backend events/state (TASK-101, TASK-102 unchanged)
- Clients updated independently (no coordination needed)

---

## Success Criteria

This decision is successfully implemented when:
1. All three clients (iOS, tvOS, Web) show create/join choice at launch
2. Any client can create a session and become HOST or TV
3. Any client can join an existing session with role assignment
4. Duplicate HOST/TV join attempts are rejected with clear error message
5. TASK-601 test scenarios (7 new scenarios) all pass
6. User can start game in any order without coordination issues

---

## Next Steps

1. **Immediate:** Delegate TASK-UX-01 to ios-host agent
2. **Immediate:** Delegate TASK-UX-02 to tvos agent
3. **Blocking:** Backend validation (TASK-UX-03) must be done before client testing
4. **Follow-up:** Update TASK-601 test plan (TASK-UX-04)
5. **Documentation:** Update README files in apps/ios-host and apps/tvos with new launch flow

---

**Decision approved by:** CEO (PM)
**Implementation start:** 2026-02-06
**Target completion:** Sprint 1 (before final E2E testing)
