# Handoff: Session Creation UX Implementation

**Date:** 2026-02-06
**From:** CEO (PM)
**To:** ios-host agent, tvos agent, backend agent
**Priority:** HIGH (blocks final E2E testing)

---

## Context

User feedback from TASK-601 revealed a coordination issue:
> "Båda måste ju ha valet om man vill skapa eller gå med i befintlig"

Currently, iOS always creates sessions and tvOS always joins. This forces a specific start order. The fix: all clients offer CREATE or JOIN at launch.

**Decision document:** `/Users/oskar/pa-sparet-party/docs/session-creation-ux.md`

---

## Contract Package (unchanged)

No changes to existing contracts. All events and state schemas remain intact:
- `POST /v1/sessions` (create session) — existing
- `POST /v1/sessions/{id}/join` (join as player/host) — existing
- `POST /v1/sessions/{id}/tv` (join as TV) — existing
- `HELLO`, `WELCOME`, `LOBBY_UPDATED` — existing

New behavior is **client-side UX only** + backend validation for duplicate roles.

---

## Implementation Tasks

### TASK-UX-01: iOS Host Agent

**Goal:** Add launch screen with "Create" / "Join" buttons

**Files to modify:**
1. `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/App.swift`
   - Rename `CreateSessionView` → `LaunchView`
   - Add two buttons: "Skapa nytt spel" (existing logic) and "Gå med i spel" (new)
   - For "Gå med i spel": show text field (6-char code), call join API

2. `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostAPI.swift`
   - Add `static func joinSession(sessionId: String, hostToken: String?) async throws -> JoinResponse`
   - Endpoint: `POST /v1/sessions/{sessionId}/join` with body `{ joinToken: code, name: "Host" }`
   - Handle 409 error (host role taken) → show user-friendly message

**Acceptance criteria:**
- Launch screen shows two equal-weight buttons
- Create flow unchanged (existing TASK-402 logic)
- Join flow: 6-char code input → lookup session → join as HOST
- Error handling: "Session already has a host" if 409 received
- Both flows connect to WS and proceed to lobby

**Test:**
```
1. Launch iOS app → see "Skapa nytt spel" + "Gå med i spel"
2. Tap "Skapa nytt spel" → session created, QR shown ✓
3. Launch second iOS app → tap "Gå med i spel" → enter code → error shown ✓
4. Launch iOS app → tap "Gå med i spel" → enter tvOS code → becomes HOST ✓
```

---

### TASK-UX-02: tvOS Agent

**Goal:** Add "Create" button to existing LaunchView

**Files to modify:**
1. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`
   - `LaunchView` currently shows join-code input only
   - Add button above input: "Skapa nytt spel"
   - On tap: call `SessionAPI.createSession()`

2. `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/SessionAPI.swift`
   - Add `static func createSession() async throws -> CreateSessionResponse`
   - Endpoint: `POST /v1/sessions` (no body needed, or `{ clientType: "TV" }`)
   - Response: `{ sessionId, joinCode, tvJoinToken, wsUrl, joinUrlTemplate }`
   - Store `sessionId`, `joinCode`, `tvJoinToken` in `appState`

**Acceptance criteria:**
- Launch screen shows "Skapa nytt spel" button above existing join input
- Create flow: POST /v1/sessions → receive tvJoinToken → connect as TV
- Lobby shows QR code with `joinUrlTemplate` (replace {joinCode})
- Existing join flow unchanged
- "Nytt spel" button in lobby calls `appState.resetSession()` → returns to launch

**Test:**
```
1. Launch tvOS app → see "Skapa nytt spel" + join code input
2. Tap "Skapa nytt spel" → session created, QR shown, lobby ✓
3. Scan QR with web player → joins successfully ✓
4. Tap "Nytt spel" in lobby → returns to launch screen ✓
5. Launch second tvOS → enter same code → error "TV already connected" ✓
```

---

### TASK-UX-03: Backend Agent

**Goal:** Validate role assignments, reject duplicate HOST/TV joins

**Files to modify:**
1. `/Users/oskar/pa-sparet-party/services/backend/src/api/sessions.ts`
   - In `POST /v1/sessions/{id}/join` handler:
     - Check if `role === "HOST"` and session already has a host
     - If yes: return `409 Conflict` with `{ error: "HOST_ROLE_TAKEN", message: "This session already has a host" }`
   - In `POST /v1/sessions/{id}/tv` handler:
     - Check if session already has a TV connection
     - If yes: return `409 Conflict` with `{ error: "TV_ROLE_TAKEN", message: "TV already connected to this session" }`

2. `/Users/oskar/pa-sparet-party/services/backend/src/store/session-store.ts`
   - Add `hasHost: boolean` and `hasTv: boolean` to session state (or derive from connections array)
   - Update on HELLO/WELCOME for HOST and TV roles

**Acceptance criteria:**
- Duplicate HOST join returns 409 with helpful error
- Duplicate TV join returns 409 with helpful error
- First HOST/TV join succeeds normally
- Existing PLAYER joins unlimited (no change)

**Test:**
```
1. Create session → join as HOST → success ✓
2. Join same session as HOST again → 409 error ✓
3. Join as PLAYER → success (unlimited) ✓
4. Create session → join as TV → success ✓
5. Join same session as TV again → 409 error ✓
```

---

### TASK-UX-04: PM (CEO)

**Goal:** Update E2E test plan with new scenarios

**Files to create/modify:**
1. `/Users/oskar/pa-sparet-party/docs/sprint-1-test-checklist.md`
   - Add section: "Session Creation Flows"
   - Document 7 scenarios (see session-creation-ux.md § 5)

**Test scenarios:**
```
✅ Scenario 1: tvOS creates, iOS joins → iOS becomes HOST, tvOS is TV
✅ Scenario 2: iOS creates, tvOS joins → iOS is HOST, tvOS is TV
✅ Scenario 3: iOS creates, second iOS joins → error "host taken"
✅ Scenario 4: tvOS creates, second tvOS joins → error "TV taken"
✅ Scenario 5: iOS creates, web joins as "Host" → error "host taken"
✅ Scenario 6: tvOS creates, web joins as "Player" → success
✅ Scenario 7: Reset session from lobby → "Nytt spel" returns to launch
```

**Acceptance criteria:**
- All 7 scenarios documented with step-by-step instructions
- Each scenario has expected outcome and pass/fail criteria
- Checklist integrated into TASK-601 E2E test

---

## Coordination

**Execution order:**
1. **TASK-UX-03 (backend)** FIRST — blocks client testing
2. **TASK-UX-01 + TASK-UX-02 (clients)** in parallel — can test against updated backend
3. **TASK-UX-04 (test plan)** after clients merged — validates full flow

**No merge conflicts expected:**
- iOS and tvOS modify different files
- Backend changes isolated to sessions.ts + session-store.ts
- No contracts changes (architect not involved)

---

## Success Criteria

Implementation complete when:
1. All clients show create/join choice at launch
2. Backend rejects duplicate HOST/TV joins with 409
3. All 7 test scenarios pass
4. User can start game in any order without coordination

---

## References

- Decision doc: `/Users/oskar/pa-sparet-party/docs/session-creation-ux.md`
- Sprint backlog: `/Users/oskar/pa-sparet-party/docs/sprint-1.md` (P6 section)
- REST API spec: `/Users/oskar/pa-sparet-party/contracts/README.md`
- iOS Host codebase: `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/`
- tvOS codebase: `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/`
- Backend codebase: `/Users/oskar/pa-sparet-party/services/backend/src/`

---

**Questions?** Ping CEO (PM) before starting implementation.
