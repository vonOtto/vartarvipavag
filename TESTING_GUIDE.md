# Testing Guide: AI Content Generation from iOS Host

## Quick Status Check

```bash
# 1. Check ai-content service
curl http://localhost:3001/generate/status
# Should return: {"configured":true,"model":"claude-sonnet-4-5-20250929",...}

# 2. Check backend service
curl http://localhost:3000/health
# Should return: {"ok":true,...}

# 3. Test direct generation (optional)
curl -X POST http://localhost:3001/generate/round -H 'Content-Type: application/json'
# Should take ~90 seconds and return a complete content pack
```

## From iOS Host App

### Step 1: Create Session
1. Open iOS Host app
2. Tap "Skapa nytt spel"
3. Wait for session creation

### Step 2: Generate AI Game Plan
1. In lobby view, tap "Generera AI-destinationer" or similar
2. The app should call:
   ```
   POST /v1/sessions/{sessionId}/game-plan/generate-ai
   Body: {"numDestinations": 3}
   ```
3. Wait 2-3 minutes for generation to complete
4. If successful, you should see 3 destinations listed

### Expected Behavior

**Success:**
- Loading indicator shows progress
- After ~2-3 minutes, 3 destinations appear
- Each shows: name (e.g., "Reykjavik") and country (e.g., "Island")

**If it fails:**
- Check error message in app
- If "503": API key not configured → restart ai-content service
- If "500": Check logs (see below)
- If timeout: Increase timeout or check service logs

## Monitoring Logs

### AI-Content Service
```bash
tail -f /tmp/ai-content-new.log
```

Look for:
- `[generate] Starting batch generation...`
- `[generate] Pack 1/3: Step X/8 - ...`
- `[generate] Batch generation complete: 3 packs generated`

### Backend Service
```bash
# Find backend process
ps aux | grep "backend.*tsx"

# If using systemd or pm2, check logs there
# Otherwise, check stdout/stderr
```

Look for:
- `[info] Generating AI game plan`
- `[info] AI game plan created`

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"
```bash
# 1. Check .env file
cat /Users/oskar/pa-sparet-party/services/ai-content/.env | grep ANTHROPIC

# 2. Restart service
pkill -f "tsx.*ai-content"
cd /Users/oskar/pa-sparet-party/services/ai-content
npm run dev > /tmp/ai-content-new.log 2>&1 &

# 3. Verify
curl http://localhost:3001/generate/status
```

### Error: "Validation error: count must be between 3 and 5"
The app is sending wrong count parameter. Check iOS code:
- File: `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostAPI.swift`
- Look for `generateAIGamePlan` function
- Ensure it sends `{"numDestinations": 3}` (or 4, 5)

### Error: "Timeout" or "Request took too long"
Increase timeout in backend:
- File: `/Users/oskar/pa-sparet-party/services/backend/src/routes/game-plan.ts`
- Line ~171: `timeout: 180000` (3 minutes)
- Try increasing to 300000 (5 minutes) if needed

### Generation Fails After 3 Retries
This means anti-leak strict mode is causing issues. Already disabled in config, but if re-enabled:
```bash
# Edit config
# File: /Users/oskar/pa-sparet-party/services/ai-content/src/config.ts
# Change: ANTI_LEAK_STRICT_MODE: false
```

## Verify Generated Content

### Check Content Pack Structure
After successful generation, check the response:
```json
{
  "gamePlan": {
    "destinations": [
      {"contentPackId": "...", "sourceType": "ai", "order": 1},
      {"contentPackId": "...", "sourceType": "ai", "order": 2},
      {"contentPackId": "...", "sourceType": "ai", "order": 3}
    ],
    "mode": "ai",
    "generatedBy": "ai-content"
  },
  "destinations": [
    {"name": "Reykjavik", "country": "Island"},
    {"name": "Marrakech", "country": "Marocko"},
    {"name": "...", "country": "..."}
  ]
}
```

### Verify Content Packs Are Loadable
The backend should store these content packs in memory. When the game starts, it will load them via `loadContentPack(contentPackId)`.

To test manually:
```bash
# Check backend logs for "Storing AI-generated content pack"
# Or add logging to verify packs are stored
```

## Performance Expectations

| Operation | Expected Time | Max Time |
|-----------|--------------|----------|
| Single round generation | 60-90s | 120s |
| 3-destination batch | 2-3 min | 5 min |
| 5-destination batch | 3-5 min | 8 min |

## Cost Tracking

Check generation costs:
```bash
# View all metrics
ls -lh /tmp/pa-sparet-metrics/

# Check specific round cost
cat /tmp/pa-sparet-metrics/metrics-<roundId>.json
```

Example output:
```json
{
  "roundId": "1e7c6260-bf4e-42ec-8956-c4ab52f395cf",
  "totalCost": 0.0477,
  "totalTokens": 15897,
  "timestamp": "2026-02-08T11:26:21.520Z"
}
```

## Next Steps After Successful Test

1. **Test Game Flow**
   - Start game with generated destinations
   - Verify clues display correctly on tvOS
   - Test followup questions
   - Check scoring

2. **TTS Integration**
   - Verify TTS files are generated for clues
   - Check audio playback on tvOS
   - Monitor TTS cache

3. **Multi-Region Testing**
   - Try generating with region filters:
     ```json
     {"numDestinations": 3, "regions": ["Europe", "Asia"]}
     ```

4. **Production Readiness**
   - Re-enable anti-leak strict mode
   - Add content pack caching
   - Set up monitoring/alerting
   - Add rate limiting

## Support

If issues persist:
1. Collect logs from both services
2. Note exact error message
3. Check network connectivity between services
4. Verify all environment variables are set

Files to check:
- `/Users/oskar/pa-sparet-party/services/ai-content/.env`
- `/Users/oskar/pa-sparet-party/services/backend/.env`
- `/tmp/ai-content-new.log`
- iOS Host console logs
