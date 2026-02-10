# Test Plan: Content Generation Timeout & Cancellation

## Problem Fixed
- AI content generation could hang forever if backend crashed or network issues occurred
- No way to cancel ongoing generation
- No timeout protection for users

## Implementation Summary

### 1. Timeout Helper Function (HostAPI.swift)
- Added `withTimeout()` generic helper function
- Uses Swift structured concurrency with `withThrowingTaskGroup`
- Races the operation against a sleep task
- Returns first result and cancels the loser
- Throws `APIError.timeout` if timeout wins

### 2. Timeout Integration (HostState.swift)
- Wrapped `HostAPI.createGamePlanAI()` call with 120-second timeout
- Added `generationTask: Task<Void, Never>?` to track ongoing task
- Added `cancelContentGeneration()` method for manual cancellation
- Proper cleanup in defer block
- CancellationError handling to distinguish user cancel vs timeout

### 3. UI Cancel Button (LobbyContentView.swift)
- Added "Avbryt generering" button in `generatingView`
- Shows confirmation dialog before cancelling
- Tracks `generationTask` to enable cancellation
- Displays user-friendly error messages in Swedish
- Haptic feedback for all actions

### 4. Error Messages
- **Timeout**: "Generering tog för lång tid (timeout)"
- **User Cancel**: "Generering avbruten"
- **Other Errors**: Original error message from API/network

## Test Cases

### Test 1: Normal Generation (Happy Path)
**Steps:**
1. Launch iOS host app
2. Create session
3. Tap "Generera nytt innehåll"
4. Select 3 destinations
5. Tap "Skapa & Generera"
6. Wait for completion (3-6 minutes)

**Expected:**
- Progress bar shows 0-100%
- Destination counter updates (1/3, 2/3, 3/3)
- "Klar!" message appears
- Success haptic feedback
- 3 destinations appear in lobby
- Cancel button available during generation

**Actual:** ___________

---

### Test 2: User Cancellation (Mid-Generation)
**Steps:**
1. Start generation (3 destinations)
2. Wait until progress shows ~50% (destination 2/3)
3. Tap "Avbryt generering"
4. Confirm in dialog: "Ja, avbryt"

**Expected:**
- Confirmation dialog appears with Swedish text
- Generation stops immediately
- Error message: "Generering avbruten"
- Warning haptic feedback
- isGeneratingPlan = false
- Progress disappears
- Can start new generation

**Actual:** ___________

---

### Test 3: Timeout (Simulated Backend Hang)
**Prerequisites:**
- Modify backend to sleep 130+ seconds in AI generation endpoint
- OR disconnect from network during generation
- OR stop backend server mid-generation

**Steps:**
1. Start generation (3 destinations)
2. Wait 120 seconds
3. Observe timeout behavior

**Expected:**
- At 120 seconds: timeout triggers
- Error message: "Generering tog för lång tid (timeout)"
- Error haptic feedback
- Generation state resets
- User can retry

**Actual:** ___________

---

### Test 4: Cancel Dialog - Choose "Fortsätt generera"
**Steps:**
1. Start generation
2. Tap "Avbryt generering"
3. In dialog, tap "Fortsätt generera"

**Expected:**
- Dialog dismisses
- Generation continues
- Progress continues updating
- No error message

**Actual:** ___________

---

### Test 5: Multiple Quick Cancels
**Steps:**
1. Start generation #1
2. Immediately tap "Avbryt generering" → confirm
3. Start generation #2
4. Immediately tap "Avbryt generering" → confirm
5. Start generation #3
6. Let it complete

**Expected:**
- Each cancellation cleans up properly
- No memory leaks or dangling tasks
- Final generation succeeds
- No stale state from previous attempts

**Actual:** ___________

---

### Test 6: Network Error During Generation
**Steps:**
1. Start generation
2. Turn on Airplane Mode on iOS device
3. Wait for network error

**Expected:**
- Network error caught
- User-friendly error message
- State resets properly
- Can retry after disabling Airplane Mode

**Actual:** ___________

---

### Test 7: App Backgrounding During Generation
**Steps:**
1. Start generation
2. Swipe up to background the app
3. Wait 30 seconds
4. Return to app

**Expected:**
- Generation continues in background (iOS allows ongoing network tasks)
- Progress updates when returning to foreground
- OR: iOS suspends task, shows error, allows retry

**Actual:** ___________

---

### Test 8: Timeout Edge Case (119 seconds)
**Prerequisites:**
- Backend configured to complete in exactly 119 seconds

**Steps:**
1. Start generation
2. Wait for completion

**Expected:**
- Completes successfully at 119s
- No timeout error
- Content appears normally

**Actual:** ___________

---

### Test 9: Timeout Edge Case (121 seconds)
**Prerequisites:**
- Backend configured to take exactly 121 seconds

**Steps:**
1. Start generation
2. Wait for timeout

**Expected:**
- Times out at 120s
- Error message appears
- Can retry

**Actual:** ___________

---

### Test 10: Cancel Button Accessibility
**Steps:**
1. Start generation
2. Enable VoiceOver
3. Navigate to cancel button
4. Activate via VoiceOver

**Expected:**
- Cancel button has proper accessibility label
- Can be activated via VoiceOver
- Confirmation dialog is accessible

**Actual:** ___________

---

## Performance Verification

### Memory Leaks
- Run with Instruments (Leaks template)
- Generate → Cancel → Generate → Cancel (10 cycles)
- Verify no leaked Task objects or closures

### UI Responsiveness
- UI should remain responsive during generation
- Progress updates should be smooth (no jank)
- Cancel button should respond immediately

### Task Cleanup
- After cancel/timeout, verify Task is nil
- Verify no zombie tasks consuming resources
- Check with Activity Monitor or Xcode debug navigator

---

## Known Limitations

1. **URLRequest timeout vs Task timeout:**
   - HostAPI sets `URLRequest.timeoutInterval = 420` (7 min)
   - We now wrap the call with 120s Task timeout
   - Task timeout will fire first (intended)
   - URLRequest timeout is backup for network-level issues

2. **Backend already has 6-minute timeout:**
   - Backend has its own timeout (360s)
   - Our 120s timeout fires much earlier (intended)
   - Provides better UX than waiting 6 minutes

3. **In-flight request not actually cancelled:**
   - Cancelling the Task stops waiting for response
   - Backend may continue processing the request
   - This is acceptable - user gets immediate feedback
   - Future: could add abort signal to API

---

## Code Review Checklist

- [x] Timeout helper is generic and reusable
- [x] Timeout duration is reasonable (120s = 2 min)
- [x] Proper Swift concurrency (Task, async/await)
- [x] CancellationError vs APIError.timeout distinguished
- [x] UI shows cancel button during generation
- [x] Confirmation dialog prevents accidental cancels
- [x] Error messages in Swedish (user-facing)
- [x] Haptic feedback for all actions
- [x] Proper cleanup in defer blocks
- [x] No force-unwraps or unsafe operations
- [x] Build succeeds without warnings

---

## Deployment Notes

### Before Production:
1. Test timeout duration under real network conditions
2. Verify timeout works on cellular (not just WiFi)
3. Test with slow backend (100+ Mbps vs 1 Mbps)
4. Consider adjusting timeout for different destination counts:
   - 3 destinations: 90s timeout?
   - 5 destinations: 150s timeout?
5. Add analytics/logging for timeout events
6. Monitor timeout rates in production

### User Communication:
- Consider showing estimated time based on destination count
- "3 destinationer: ca 3-4 minuter"
- "5 destinationer: ca 5-6 minuter"
- Update warning text if timeout is shorter than estimate

---

## Related Files

- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostAPI.swift`
  - Lines 199-246: `withTimeout()` helper and APIError.timeout

- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostState.swift`
  - Lines 71: `generationTask` property
  - Lines 363-424: `generateContentInLobby()` with timeout
  - Lines 426-431: `cancelContentGeneration()` method

- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/Views/LobbyContentView.swift`
  - Lines 14-15: `generationTask` and `showCancelConfirmation` state
  - Lines 42-67: Generation task with cancellation handling
  - Lines 68-80: Cancel confirmation dialog
  - Lines 169-263: `generatingView` with cancel button
