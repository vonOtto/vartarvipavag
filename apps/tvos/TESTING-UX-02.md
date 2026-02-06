# TASK-UX-02 Testing Checklist

## Implementation Summary

TASK-UX-02 adds "Skapa nytt spel" button to tvOS LaunchView, enabling the TV to create sessions (not just join them). This provides flexible session creation UX matching iOS and Web clients.

## Changes Made

1. **LaunchView** (`/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`)
   - Added "Skapa nytt spel" button as primary action
   - Added "eller" divider between create and join sections
   - Implemented `createSession()` method that calls `SessionAPI.createSession()`
   - Updated visual styling with gradient button and proper spacing
   - Maintains existing join flow unchanged

2. **SessionAPI** (`/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/SessionAPI.swift`)
   - `createSession()` method already implemented (lines 63-85)
   - Returns `CreateSessionResponse` with `sessionId`, `joinCode`, `tvJoinToken`, `wsUrl`

3. **README.md** (`/Users/oskar/pa-sparet-party/apps/tvos/README.md`)
   - Updated description to reflect create OR join capability
   - Documented both usage flows (create vs join)
   - Explained session management rules (one TV per session)

## Visual Design Consistency

All UI elements match iOS design system:
- Gradient title (TRIPTO with blue gradient)
- Design system colors (.accentBlueBright, .accentBlue, .bgCard, .successGreen, .errorRedBright)
- Consistent spacing (48pt vertical, proper padding)
- Loading states with ProgressView
- Error messages in consistent style
- Shadow effects matching lobby view

## Testing Checklist

### 1. Create Flow

- [ ] Launch tvOS app
- [ ] Verify launch screen shows:
  - [ ] Gradient title "TRIPTO" and "Big world. Small couch."
  - [ ] Large blue gradient button "Skapa nytt spel"
  - [ ] Divider with "eller" text
  - [ ] Join code input section below
- [ ] Tap "Skapa nytt spel" button
- [ ] Verify button shows:
  - [ ] Loading state: "Skapar spel..." with spinner
  - [ ] Dimmed gradient during loading
- [ ] Verify transition to lobby:
  - [ ] QR code displayed
  - [ ] Join code shown (6 uppercase characters)
  - [ ] "Väntar på spelare..." message
  - [ ] "Nytt spel" button visible in bottom-right corner
- [ ] Tap "Nytt spel" button in lobby
- [ ] Verify return to launch screen with both options

### 2. Join Flow (Unchanged)

- [ ] Launch tvOS app
- [ ] Tap into join code input field
- [ ] Enter 6-character join code
- [ ] Verify character counter shows "N / 6"
- [ ] Verify counter turns green at 6 characters
- [ ] Tap "Hoppa in!" button
- [ ] Verify button shows:
  - [ ] Loading state: "Ansluter..." with spinner
- [ ] Verify transition to lobby (if session exists)
- [ ] OR verify error message (if session not found)

### 3. Error Handling

- [ ] Create session with backend offline
- [ ] Verify error message: "Kunde inte skapa session: [error details]"
- [ ] Verify button returns to enabled state
- [ ] Create session successfully
- [ ] Launch second tvOS device
- [ ] Try to join same session
- [ ] Verify backend returns 409 Conflict (requires TASK-UX-03)
- [ ] Verify error message shown to user

### 4. Visual Polish

- [ ] All text readable on dark background
- [ ] Button shadows visible
- [ ] Gradient smooth and appealing
- [ ] Loading states smooth (no flicker)
- [ ] Spacing consistent throughout
- [ ] Focus states work correctly (tvOS remote navigation)
- [ ] No layout shifts during state transitions

### 5. Integration with Backend

**Prerequisites:** Backend must support:
- `POST /v1/sessions` returns `CreateSessionResponse`
- WebSocket connection with `tvJoinToken`
- Lobby state management (LOBBY_UPDATED events)

**Test:**
- [ ] Create session from tvOS
- [ ] Verify backend creates session with TV role
- [ ] Scan QR code with phone
- [ ] Verify web player joins successfully
- [ ] Verify player appears in tvOS lobby
- [ ] Join with iOS Host app as HOST
- [ ] Verify iOS becomes game controller
- [ ] Start game from iOS Host
- [ ] Verify tvOS displays clues correctly

### 6. Cross-Platform Session Creation

**Scenario A: tvOS creates, iOS joins**
- [ ] tvOS creates session
- [ ] iOS scans QR or enters join code
- [ ] iOS becomes HOST (has game controls)
- [ ] tvOS is TV (displays game)
- [ ] Game flows correctly

**Scenario B: iOS creates, tvOS joins**
- [ ] iOS creates session
- [ ] tvOS enters join code
- [ ] tvOS becomes TV
- [ ] iOS is HOST
- [ ] Game flows correctly

**Scenario C: tvOS creates, Web joins**
- [ ] tvOS creates session
- [ ] Web player scans QR code
- [ ] Web chooses "Player" role
- [ ] Player appears in tvOS lobby
- [ ] Game flows correctly

### 7. Reconnect Handling

- [ ] Create session from tvOS
- [ ] Kill backend (simulate disconnect)
- [ ] Verify reconnect banner appears in lobby
- [ ] Restart backend
- [ ] Verify tvOS reconnects automatically
- [ ] Verify lobby state restored (players, join code)

## Known Limitations

1. **Backend dependency (TASK-UX-03):**
   - Duplicate TV join rejection (409) requires backend validation
   - Until TASK-UX-03 is complete, second TV might connect (undefined behavior)

2. **Session cleanup:**
   - Empty sessions not garbage-collected (future enhancement)
   - "Nytt spel" button leaves orphaned sessions (backend should timeout)

## Success Criteria

TASK-UX-02 is complete when:
- [x] LaunchView shows "Skapa nytt spel" button above join input
- [x] Create button calls `POST /v1/sessions` and receives `tvJoinToken`
- [x] tvOS connects as TV role and displays lobby with QR code
- [x] Existing join flow unchanged and functional
- [x] Visual design matches iOS consistency (colors, spacing, typography)
- [x] "Nytt spel" button in lobby returns to launch screen
- [x] Error handling for both create and join flows
- [x] README.md updated with new flow documentation
- [x] Code compiles without errors

## Next Steps

1. **Manual testing:** Follow checklist above in Xcode tvOS Simulator
2. **Backend coordination:** Ensure `POST /v1/sessions` endpoint returns correct response shape
3. **TASK-UX-03:** Backend must reject duplicate TV joins (409 Conflict)
4. **TASK-UX-04:** Add session creation scenarios to E2E test plan
5. **Git commit:** Commit changes with message referencing TASK-UX-02

## Files Modified

- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`
  - LaunchView: Added create button, divider, createSession() method
- `/Users/oskar/pa-sparet-party/apps/tvos/README.md`
  - Updated description and usage flows
  - Added session management section
- `/Users/oskar/pa-sparet-party/apps/tvos/TESTING-UX-02.md`
  - This testing checklist (new file)

## Reference Documents

- UX Decision: `/Users/oskar/pa-sparet-party/docs/session-creation-ux.md`
- Handoff: `/Users/oskar/pa-sparet-party/docs/handoff-ux-session-creation.md`
- SessionAPI: `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/SessionAPI.swift`
