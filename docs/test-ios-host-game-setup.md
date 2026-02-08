# iOS Host Game Setup - Testing Guide

**Date**: 2026-02-07
**Feature**: Auto-generate 3 AI destinations on session creation

---

## Prerequisites

### 1. Backend Running
```bash
cd /Users/oskar/pa-sparet-party/services/backend
npm start
# Should start on http://localhost:3000
```

### 2. AI Content Service Running
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
npm start
# Should start on http://localhost:3001
```

### 3. Environment Variables
Ensure `.env` files have:
```bash
# services/backend/.env
AI_CONTENT_SERVICE_URL=http://localhost:3001

# services/ai-content/.env
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
```

---

## Test 1: Happy Path - Session Creation with Game Plan

### Steps
1. Open iOS Host app (Xcode or device)
2. Tap "Skapa nytt spel" on LaunchView
3. **Expected:**
   - App navigates to ConnectingView briefly
   - Then shows LobbyView with QR code
   - Shows spinner: "Genererar resmål..."
   - After 30-40s, spinner disappears
   - Shows: "🗺️ Redo med 3 resmål ✓"
   - Displays 3 destination chips with names + countries
   - "Starta spelet" button is disabled (no players yet)

4. Scan QR code with phone → join as player
5. **Expected:**
   - Player appears in lobby list
   - "Starta spelet" button becomes enabled

6. Tap "Starta spelet"
7. **Expected:**
   - Game starts with first destination
   - Clues appear as normal
   - Backend loaded destination 1 from generated game plan

### Success Criteria
- ✓ Game plan generated in 30-40s
- ✓ 3 destinations shown with correct names/countries
- ✓ Button states correct (disabled → enabled)
- ✓ Game starts normally

---

## Test 2: Multiple Sessions in Parallel

### Steps
1. Create session on iOS Host A → wait for game plan
2. Create session on iOS Host B (while A is generating) → wait for game plan
3. **Expected:**
   - Both sessions generate successfully
   - No interference between sessions
   - Each gets unique 3 destinations

### Success Criteria
- ✓ Both sessions complete
- ✓ Different destinations in each session

---

## Test 3: Slow Network (3G Simulation)

### Steps
1. Enable Network Link Conditioner on Mac
2. Select "3G" profile
3. Create session on iOS Host
4. **Expected:**
   - Spinner appears
   - Generation takes longer (60-90s)
   - Eventually completes
   - If timeout → error logged but session still usable

### Success Criteria
- ✓ UI remains responsive during generation
- ✓ Spinner shows entire time
- ✓ No crashes or hangs

---

## Test 4: Backend Unreachable During Game Plan Creation

### Steps
1. Start iOS Host app
2. Tap "Skapa nytt spel"
3. **WHILE SPINNER IS SHOWING**, kill AI content service:
   ```bash
   # In ai-content terminal: Ctrl+C
   ```
4. **Expected:**
   - Session created successfully (step 1 succeeds)
   - Game plan generation fails (step 2 fails)
   - Error logged in console
   - Session still works (single-destination mode)
   - Lobby shows QR code + players
   - "Starta spelet" enabled when players join
   - Game starts normally (with hardcoded content)

### Success Criteria
- ✓ Session creation succeeds
- ✓ Error logged: "Failed to generate game plan: ..."
- ✓ Game still playable

---

## Test 5: Backend Returns Invalid Game Plan

### Steps
1. Modify backend temporarily to return invalid response
2. Create session
3. **Expected:**
   - JSON decode error logged
   - Session still usable
   - Falls back to single-destination

### Success Criteria
- ✓ No crash
- ✓ Graceful fallback

---

## Test 6: Reset Session During Generation

### Steps
1. Create session → spinner appears
2. **WHILE GENERATING**, tap "Tillbaka" button
3. **Expected:**
   - Returns to LaunchView
   - Generation cancelled
   - State cleared (gamePlan = nil, isGeneratingPlan = false)

4. Create new session
5. **Expected:**
   - Fresh generation starts
   - No leftover state from previous attempt

### Success Criteria
- ✓ Reset works during generation
- ✓ No state leakage
- ✓ Second session works normally

---

## Test 7: Join Existing Session (No Game Plan)

### Steps
1. Create session on tvOS (old flow, no game plan)
2. On iOS Host, tap "Gå med i spel"
3. Enter join code
4. **Expected:**
   - iOS joins as host
   - No game plan shown (backward compatibility)
   - "Starta spelet" works normally

### Success Criteria
- ✓ Join works
- ✓ No errors about missing game plan
- ✓ Game starts normally

---

## Debugging Tips

### Console Logs to Check
```swift
// Success case
"Generated game plan with 3 destinations: Stockholm, Paris, Tokyo"

// Error case
"Failed to generate game plan: <error details>"
```

### Backend Logs to Check
```bash
# AI Content Service
POST /generate/batch - 201
Pack 1/3: Step 3/3 (TTS generation)
Pack 2/3: Step 3/3 (TTS generation)
Pack 3/3: Step 3/3 (TTS generation)

# Backend
POST /v1/sessions/:id/game-plan/generate-ai - 200
Game plan created: 3 destinations
```

### Common Issues

**Issue:** Spinner never completes
- **Check:** AI content service running? Check terminal
- **Check:** API keys in .env? Print `process.env.ANTHROPIC_API_KEY`
- **Check:** Backend can reach AI service? Check `AI_CONTENT_SERVICE_URL`

**Issue:** Destinations empty after generation
- **Check:** Response JSON structure matches types
- **Check:** Decoder error in console
- **Check:** Backend returned valid DestinationSummary array

**Issue:** Start button stays disabled
- **Check:** `isGeneratingPlan` is false
- **Check:** Players array not empty
- **Check:** Button logic in App.swift

---

## Expected API Calls (Wireshark / Charles Proxy)

```
1. POST http://localhost:3000/v1/sessions
   → 201 Created
   {
     "sessionId": "abc123",
     "joinCode": "XYZABC",
     "hostAuthToken": "...",
     "wsUrl": "ws://localhost:3000/ws"
   }

2. POST http://localhost:3000/v1/sessions/abc123/game-plan/generate-ai
   Body: { "numDestinations": 3 }
   → 200 OK (after 30-40s)
   {
     "gamePlan": {
       "destinations": [
         { "contentPackId": "pack-1", "sourceType": "ai", "order": 1 },
         { "contentPackId": "pack-2", "sourceType": "ai", "order": 2 },
         { "contentPackId": "pack-3", "sourceType": "ai", "order": 3 }
       ],
       "currentIndex": 0,
       "mode": "ai",
       "createdAt": 1738899600000
     },
     "destinations": [
       { "name": "Stockholm", "country": "Sverige" },
       { "name": "Paris", "country": "Frankrike" },
       { "name": "Tokyo", "country": "Japan" }
     ]
   }

3. WebSocket connection
   ws://localhost:3000/ws?token=...
   → WELCOME
   → STATE_SNAPSHOT (lobby state)
```

---

## Performance Benchmarks

### Target Times
- Session creation (step 1): < 500ms
- Game plan generation (step 2): 30-40s
- Total from tap to lobby ready: ~35s

### Cost per Session
- AI generation: $0.048 × 3 = $0.14
- TTS (80% cache): $0.06
- **Total**: ~$0.20

---

## Acceptance Criteria Summary

All tests pass if:
- [x] Session creates with 3 AI destinations in 30-40s
- [x] UI shows clear progress (spinner → destinations)
- [x] Destination preview displays names + countries
- [x] Start button logic works (disabled during gen, enabled with players)
- [x] Error handling graceful (network issues → logs error, game continues)
- [x] Backward compatible (can join sessions without game plan)
- [x] Reset/cancel works during generation
- [x] Swift compiles without warnings
- [x] TypeScript backend already tested (Phase 1)

---

## Next Phase Testing

When Phase 2 WebSocket commands are implemented, test:
- [ ] Play through destination 1 → advance to destination 2
- [ ] Complete all 3 destinations → finale screen
- [ ] Cumulative scoring across destinations
- [ ] Reconnect mid-game → resume at correct destination

---

**Ready to test!** Start with Test 1 (Happy Path), then Test 4 (Error Handling).
