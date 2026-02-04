# Role-Based Projections v1.1.0

## Overview

The server maintains ONE authoritative state but sends DIFFERENT projections to each role. This is **critical for security and fairness** - clients must never receive information they shouldn't have access to.

## Architectural Rules

1. **Server is authoritative**: Only the server knows the full truth
2. **No secrets leak**: TV and PLAYER never see correct answers before reveal
3. **Host needs control**: HOST sees everything for game management
4. **Projections are server-side**: Filtering happens before broadcast, not client-side

## Role Definitions

### HOST
- Primary game controller (iOS/iPadOS app)
- Starts/stops game, manages settings
- Sees all secrets for verification and control
- Single host per session

### PLAYER
- Players joining via web/PWA (QR code)
- Submit brake pulls and answers
- See only their own submissions
- Multiple players per session

### TV
- Apple TV displaying game on big screen
- Public-facing display
- Never shows secrets before reveal
- Shows all players and their actions (but not their answers)

---

## State Projection Rules

### Full State Structure (Server Internal)

```json
{
  "version": 1,
  "phase": "CLUE_LEVEL",
  "sessionId": "abc123",
  "joinCode": "PLAY",
  "players": [...],
  "destination": {
    "name": "Paris",
    "country": "France",
    "aliases": ["Paree", "City of Light"],
    "revealed": false
  },
  "clueLevelPoints": 8,
  "clueText": "This city is home to the Eiffel Tower",
  "brakeOwnerPlayerId": "player1",
  "lockedAnswers": [
    {
      "playerId": "player1",
      "answerText": "Paris",
      "lockedAtLevelPoints": 10,
      "lockedAtMs": 1234567890
    }
  ],
  "scoreboard": [...],
  "timer": {...},
  "audioState": {...}
}
```

### HOST Projection

**ACCESS**: Full state with NO filtering

**Rationale**: Host needs to verify answers, manage game flow, and debug issues.

**Fields visible**:
- ✅ `destination.name` - always visible
- ✅ `destination.country` - always visible
- ✅ `destination.aliases` - always visible
- ✅ `lockedAnswers[].answerText` - all players' answers visible in real-time
- ✅ All other fields as-is

**Example**:
```json
{
  "destination": {
    "name": "Paris",
    "country": "France",
    "aliases": ["Paree", "City of Light"],
    "revealed": false
  },
  "lockedAnswers": [
    {
      "playerId": "player1",
      "answerText": "Paris",
      "lockedAtLevelPoints": 10,
      "lockedAtMs": 1234567890
    }
  ]
}
```

---

### PLAYER Projection

**ACCESS**: Filtered state - own data only, no secrets

**Rationale**: Players should only see their own submissions and public game state. Cannot see correct answer or other players' answers until reveal.

**Fields visible**:
- ❌ `destination.name` = `null` (until `revealed: true`)
- ❌ `destination.country` = `null` (until `revealed: true`)
- ❌ `destination.aliases` = `[]` (until `revealed: true`)
- ✅ `destination.revealed` - visible
- ✅ `players` - players with `role === 'player'` only (host/tv entries filtered out)
- ✅ `scoreboard` - full standings
- ⚠️ `lockedAnswers` - **ONLY OWN ANSWER** visible
  - Filter to `lockedAnswers.filter(a => a.playerId === currentPlayerId)`
  - Other players' answers completely hidden

**Example for player1**:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  },
  "lockedAnswers": [
    {
      "playerId": "player1",
      "answerText": "Paris",
      "lockedAtLevelPoints": 10,
      "lockedAtMs": 1234567890
    }
  ]
}
```

Player2 would see ONLY their own answer in `lockedAnswers`, not player1's.

---

### TV Projection

**ACCESS**: Public display state - no secrets, no individual answers

**Rationale**: TV is visible to everyone in the room. Cannot leak answers or give unfair advantage.

**Fields visible**:
- ❌ `destination.name` = `null` (until `revealed: true`)
- ❌ `destination.country` = `null` (until `revealed: true`)
- ❌ `destination.aliases` = `[]` (until `revealed: true`)
- ✅ `destination.revealed` - visible
- ✅ `players` - players with `role === 'player'` only (host/tv entries filtered out)
- ✅ `scoreboard` - full standings
- ⚠️ `lockedAnswers` - **COUNT ONLY, NO TEXT**
  - Show `lockedAnswers.length` or hide array entirely
  - `answerText` is **NEVER** included for TV, regardless of reveal state

**Example**:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  },
  "lockedAnswers": []
}
```

Or if showing count:
```json
{
  "lockedAnswersCount": 1,
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  }
}
```

---

## Event Projection Rules

### STATE_SNAPSHOT
- Server MUST filter state based on recipient role before sending
- Use projection rules above

### BRAKE_ANSWER_LOCKED
- `payload.answerText` field:
  - ✅ HOST: sees answer text
  - ❌ PLAYER: field omitted
  - ❌ TV: field omitted

### DESTINATION_REVEAL
- After this event, all roles see `destination.name`, `destination.country`, `destination.aliases`
- State changes: `destination.revealed = true`

### DESTINATION_RESULTS
- All roles see all answers and results
- This is the first time TV and PLAYER see other players' answers

---

### FOLLOWUP_QUESTION_PRESENT
- `payload.correctAnswer`:
  - ✅ HOST: sees correct answer immediately
  - ❌ PLAYER: field omitted
  - ❌ TV: field omitted

### FOLLOWUP_ANSWERS_LOCKED
- `payload.answersByPlayer` array:
  - ✅ HOST: full array (playerId, playerName, answerText)
  - ❌ PLAYER: field omitted
  - ❌ TV: field omitted
- `payload.lockedPlayerCount`: visible to all roles

### FOLLOWUP_RESULTS
- Identical payload to all roles — `correctAnswer` and all `results[].answerText`
  are now public.  This is the reveal moment for follow-up questions.

---

## Follow-up Question Projection (STATE_SNAPSHOT)

The `followupQuestion` object in STATE_SNAPSHOT follows the same
secret-until-reveal pattern used by `destination` and `lockedAnswers`.

| Field | HOST | PLAYER | TV |
|-------|------|--------|----|
| `questionText` | visible | visible | visible |
| `options` | visible | visible | visible |
| `currentQuestionIndex` | visible | visible | visible |
| `totalQuestions` | visible | visible | visible |
| `correctAnswer` | visible | **null** | **null** |
| `answersByPlayer` | full array | **empty array** | **empty array** |
| `timer` | visible | visible | visible |
| `answeredByMe` | — | visible | — |

`correctAnswer` and `answersByPlayer` become public only after
`FOLLOWUP_RESULTS` is broadcast; at that point the phase advances past
`FOLLOWUP_QUESTION` and the object is cleared or replaced by the next
question.

---

## Audio State Projection (STATE_SNAPSHOT)

`audioState` is playback-control data consumed exclusively by tvOS.
`ttsManifest` is a debug / monitoring field that lists every
pre-generated TTS clip for the current round — it must never reach
TV or PLAYER.

| Field | HOST | TV | PLAYER |
|-------|------|----|--------|
| `currentTrackId` | visible | visible | **omitted** |
| `isPlaying` | visible | visible | **omitted** |
| `gainDb` | visible | visible | **omitted** |
| `activeVoiceClip` | visible | visible | **omitted** |
| `ttsManifest` | visible | **omitted** | **omitted** |

Rationale:
- **PLAYER omitted entirely** — players have no audio output; the
  field adds payload size with zero benefit.
- **TV omits `ttsManifest`** — TV only needs *what is playing now*
  (for reconnect resume).  The full manifest is a pre-gen artefact
  owned by the backend, surfaced only to HOST for monitoring.

---

## After DESTINATION_REVEAL

Once `destination.revealed = true`, all projections receive full destination data:

**All roles see**:
- ✅ `destination.name`
- ✅ `destination.country`
- ✅ `destination.aliases`

**lockedAnswers after reveal**:
- ✅ HOST: full array including `answerText`
- ✅ PLAYER: own entry only, including `answerText`
- ❌ TV: array entries present (for `isCorrect` / `pointsAwarded` display) but `answerText` is **always omitted**; answers are revealed to the room via `DESTINATION_RESULTS` instead

This ensures the dramatic reveal moment is synchronized across all clients
while TV never caches or displays raw answer text.

---

## Implementation Guidance

### Backend (Server-Side Filtering)

```typescript
function projectState(fullState: GameState, role: Role): GameState {
  const projected = { ...fullState };

  if (role === "HOST") {
    // No filtering for host
    return projected;
  }

  // Filter destination for PLAYER and TV
  if (!projected.destination.revealed) {
    projected.destination.name = null;
    projected.destination.country = null;
    projected.destination.aliases = [];
  }

  // Filter locked answers
  if (role === "PLAYER") {
    // Only show own answers
    projected.lockedAnswers = projected.lockedAnswers.filter(
      a => a.playerId === currentPlayerId
    );
  } else if (role === "TV") {
    // Show count only or hide entirely
    projected.lockedAnswersCount = projected.lockedAnswers.length;
    projected.lockedAnswers = [];
  }

  return projected;
}
```

### Clients (Trust Server, Never Compute Secrets)

Clients MUST:
- ✅ Trust server-provided state
- ✅ Handle `null` values gracefully
- ❌ NEVER try to guess or compute secrets locally
- ❌ NEVER cache sensitive data across states

---

## Projection Safety Checklist

These rules are **mandatory invariants**.  Any change to
`state-projection.ts`, `lobby-events.ts`, or the broadcast helpers in
`server.ts` MUST be validated against all three before merge.

### Rule 1 — TV and PLAYER never receive `answerText` in STATE_SNAPSHOT

`answerText` is the single most sensitive field in the state.  The
per-event `BRAKE_ANSWER_LOCKED` broadcast already strips it for
non-HOST roles; the STATE_SNAPSHOT projection **must do the same**, in
every code-path and regardless of `destination.revealed`.

- HOST: `answerText` visible on every `lockedAnswers` entry, always.
- PLAYER: `answerText` visible **only on own entry** (`playerId` match).
- TV: `answerText` **never** present — not before reveal, not after.

### Rule 2 — Lobby player list is filtered to `role === 'player'`

The authoritative `state.players` array contains a host entry (and
potentially a synthetic TV entry).  Neither must appear in any lobby
view.  Both the `LOBBY_UPDATED` event payload and the `players` array
inside every STATE_SNAPSHOT sent to TV or PLAYER roles must be filtered
to entries where `role === 'player'`.

### Pre-merge test points

Before any projection-related change lands on `main`, run these three
checks:

1. **`answer-submission-test.ts`** — asserts HOST receives `answerText`
   and PLAYER does not, both in the `BRAKE_ANSWER_LOCKED` event and in
   the subsequent STATE_SNAPSHOT.  *(8 assertions)*

2. **E2E sofa test** (`/tmp/e2e-sofa-test.ts`) — step 12 asserts that
   the TV's final STATE_SNAPSHOT contains a `lockedAnswers` array with
   **zero** `answerText` fields, even though `destination.revealed` is
   `true` at that point; steps 3–4 assert lobby player counts are
   exactly the number of joined players (no host/tv leak).  *(49
   assertions, focus steps 3, 4, 12)*

3. **`game-flow-test.ts`** — assertion "Player does not see destination
   name" confirms the destination projection gate still fires; used as a
   smoke-check that the projection function itself has not regressed.
   *(19 assertions)*

---

## Security Checklist

Before releasing a state change or event:

- [ ] Does this event reveal the correct destination answer?
  - If NO and `revealed: false`: Filter destination fields for PLAYER and TV
- [ ] Does this event include player-submitted answers?
  - Filter `answerText` based on role
- [ ] Is this a STATE_SNAPSHOT?
  - Apply full projection rules before sending
- [ ] Could any field leak information indirectly?
  - Check array lengths, timestamps, etc.

---

## Testing Projection Rules

### Test Case 1: Pre-Reveal State
- **Setup**: CLUE_LEVEL phase, answer locked, not revealed
- **Verify HOST**: sees destination name and all answers
- **Verify PLAYER**: sees only own answer, no destination name
- **Verify TV**: sees no destination name, no answer text

### Test Case 2: Post-Reveal State
- **Setup**: DESTINATION_REVEAL sent, `revealed: true`
- **Verify ALL**: now see destination name
- **Verify ALL**: see all answers with results

### Test Case 3: Reconnect (STATE_SNAPSHOT)
- **Setup**: Player disconnects and reconnects during CLUE_LEVEL
- **Verify**: STATE_SNAPSHOT applies correct projection
- **Verify**: No secrets leaked in snapshot

---

## FAQ

**Q: Why not filter client-side?**
A: Security. Client-side filtering can be bypassed by inspecting network traffic or modifying client code. Server-side filtering ensures secrets never leave the server until appropriate.

**Q: What if HOST disconnects and rejoins?**
A: HOST receives full STATE_SNAPSHOT with all secrets. Host role is privileged and trusted.

**Q: Can PLAYER see other players' scores?**
A: Yes, scores are public via `scoreboard`. Only answer text is hidden pre-reveal.

**Q: What about followup questions (Sprint 2+)?**
A: Same rules apply: correct answers hidden until reveal, player answers filtered by role.

**Q: How does TV show "X players have answered"?**
A: Use `lockedAnswersCount` or `lockedAnswers.length` before filtering array.

---

## Version History

- **v1.0.0**: Initial projection rules for Sprint 1
- **v1.1.0**: Added audioState field, clarified FINAL_RESULTS phase (Sprint 1.1)
- **v1.2.0**: Added Projection Safety Checklist (Rule 1: TV/PLAYER never get answerText in STATE_SNAPSHOT; Rule 2: lobby players filtered to role=player). Corrected post-reveal TV lockedAnswers rule. Added 3 mandatory pre-merge test points.
- **v1.3.0**: Added Audio State Projection table. `audioState` omitted for PLAYER; `ttsManifest` omitted for TV and PLAYER.

---

**END OF DOCUMENT**
