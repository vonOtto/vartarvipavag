# Testing Guide

Guide för att testa AI Content Generation pipeline.

## Quick Start

### 1. Setup Environment

```bash
cd services/ai-content
cp .env.example .env
```

Edit `.env` and add your API keys:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
ELEVENLABS_API_KEY=sk-your-key-here  # Optional for TTS
```

### 2. Start Service

```bash
npm run dev
```

### 3. Test Generation

#### Check Status
```bash
curl http://localhost:3001/generate/status
```

Expected response:
```json
{
  "configured": true,
  "model": "claude-sonnet-4-5-20250929",
  "antiLeakStrictMode": true,
  "maxRetries": 3
}
```

#### Generate a Round

```bash
curl -X POST http://localhost:3001/generate/round
```

This will take 30-60 seconds. Expected response:
```json
{
  "success": true,
  "contentPack": {
    "roundId": "uuid",
    "destination": { ... },
    "clues": [ ... ],
    "followups": [ ... ],
    "metadata": { ... }
  },
  "progress": {
    "currentStep": 8,
    "totalSteps": 8,
    "stepName": "Klar"
  }
}
```

#### Generate Test Packs

```bash
npm run generate-test-packs
```

This will generate 2 complete content packs and save them to `test-packs/`.

## Manual Testing Checklist

### Destination Quality

- [ ] Destination is a real place
- [ ] Name and country are correct
- [ ] Aliases make sense (lowercase, common variations)
- [ ] Place is interesting and guessable

### Clue Quality

- [ ] 5 clues with correct levels (10, 8, 6, 4, 2)
- [ ] Progressive difficulty (hardest → easiest)
- [ ] Level 10/8 don't mention destination name
- [ ] All clues are factually correct
- [ ] Clues follow style guide (start with "Här...")

### Anti-Leak Check

- [ ] Level 10 clue is subtle (hard to guess)
- [ ] Level 8 clue still doesn't give it away
- [ ] Level 6 clue requires knowledge
- [ ] Only level 4/2 make it obvious
- [ ] Can manually guess at correct level

### Followup Questions

- [ ] 2-3 questions generated
- [ ] Each has exactly 4 options
- [ ] Correct answer is one of the options
- [ ] Questions don't mention destination name
- [ ] Facts are correct
- [ ] Distractors are plausible but wrong

### Verification

- [ ] All facts verified or marked uncertain
- [ ] No rejected facts (would trigger regeneration)
- [ ] Sources provided for verification
- [ ] Anti-leak check passed

## API Testing

### Test Destination Generation Only

```bash
curl -X POST http://localhost:3001/generate/destination
```

Response:
```json
{
  "success": true,
  "destination": {
    "name": "Tokyo",
    "country": "Japan",
    "aliases": ["tokyo", "tokio", "edo"]
  }
}
```

### Test with Invalid Config

Stop service, remove API key from `.env`:
```bash
# Remove ANTHROPIC_API_KEY line
npm run dev
```

Try to generate:
```bash
curl -X POST http://localhost:3001/generate/round
```

Expected response:
```json
{
  "success": false,
  "error": "ANTHROPIC_API_KEY not configured. Cannot generate content."
}
```

## Load Testing

Generate multiple rounds in sequence:

```bash
for i in {1..5}; do
  echo "=== Round $i ==="
  curl -X POST http://localhost:3001/generate/round | jq '.contentPack.destination'
  echo ""
done
```

Monitor:
- Generation time (should be 30-60s each)
- Success rate (should be high)
- Quality consistency

## Regression Testing

### Test Anti-Leak Strict Mode

Edit `src/config.ts`:
```typescript
ANTI_LEAK_STRICT_MODE: false  // Disable
```

Generate round, check if it accepts leaky clues.

### Test Fact Verification

Generate 10 rounds, verify that:
- No obvious factual errors
- Dates/numbers are correct
- Geography is accurate

## Integration Testing

Test with backend:

```bash
# Terminal 1: AI Service
cd services/ai-content
npm run dev

# Terminal 2: Backend
cd services/backend
npm run dev

# Terminal 3: Test
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"hostName": "Test", "useAIContent": true}'
```

## Debugging

### Enable Verbose Logging

Edit code to add more console.log statements:

```typescript
// In generators/round-generator.ts
console.log('[DEBUG] Full Claude response:', response);
```

### Check Generated Files

```bash
cat test-packs/pack-1-*.json | jq
```

### Verify TTS Cache

```bash
ls -lah /tmp/pa-sparet-tts-cache/
```

## Common Issues

### "ANTHROPIC_API_KEY not configured"

Solution: Add API key to `.env` file

### "Failed to call Claude API after retries"

Possible causes:
- Invalid API key
- Rate limit hit
- Network issues
- Claude API down

Solution: Check API key, wait a bit, try again

### "Anti-leak check failed, retrying"

This is normal. System will retry up to 3 times.

If it keeps failing:
- Claude might be generating too-obvious clues
- Consider disabling strict mode for testing
- Check logs to see which clue leaked

### Generation takes too long

Normal time: 30-60 seconds
Includes:
- 3 API calls for generation
- 10+ API calls for verification
- Retry logic if needed

If consistently slow:
- Check network connection
- Monitor Claude API status
- Consider caching results

## Test Coverage

Manual test matrix:

| Feature | Test Case | Status |
|---------|-----------|--------|
| Destination Gen | European city | ⬜ |
| Destination Gen | Asian city | ⬜ |
| Destination Gen | American city | ⬜ |
| Clue Gen | Level 10 subtlety | ⬜ |
| Clue Gen | Progressive difficulty | ⬜ |
| Followup Gen | Factual correctness | ⬜ |
| Followup Gen | No name leak | ⬜ |
| Anti-Leak | Detect obvious leak | ⬜ |
| Anti-Leak | Accept good clues | ⬜ |
| Fact Check | Verify dates | ⬜ |
| Fact Check | Verify numbers | ⬜ |
| Retry Logic | Recover from leak | ⬜ |
| Retry Logic | Recover from fact error | ⬜ |

## Automated Testing (Future)

Consider adding:

```typescript
// tests/round-generator.test.ts
describe('Round Generator', () => {
  it('should generate valid content pack', async () => {
    const pack = await generateRound();
    expect(pack.clues).toHaveLength(5);
    expect(pack.followups).toHaveLength(2);
    expect(pack.metadata.verified).toBe(true);
  });

  it('should pass anti-leak check', async () => {
    const pack = await generateRound();
    expect(pack.metadata.antiLeakChecked).toBe(true);
  });
});
```
