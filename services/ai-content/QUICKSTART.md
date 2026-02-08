# Quick Start Guide

Kom igång med AI Content Service på 5 minuter.

## 1. Install Dependencies

```bash
cd services/ai-content
npm install
```

## 2. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
ELEVENLABS_API_KEY=sk-your-key-here  # Optional
```

## 3. Start Service

```bash
npm run dev
```

Service starts on `http://localhost:3001`

## 4. Test Endpoints

### Health Check
```bash
curl http://localhost:3001/health
# → {"ok":true}
```

### Status
```bash
curl http://localhost:3001/generate/status
# → {"configured":true,"model":"claude-sonnet-4-5-20250929",...}
```

### Generate Content (requires ANTHROPIC_API_KEY)
```bash
curl -X POST http://localhost:3001/generate/round
```

Takes 30-60 seconds, returns complete content pack.

## 5. Generate Test Packs

```bash
npm run generate-test-packs
```

Generates 2 sample rounds and saves to `test-packs/`.

## Common Commands

```bash
# Development
npm run dev              # Start with hot reload

# Production
npm start               # Start service

# Testing
npm run generate-test-packs  # Generate sample content

# Type checking
npx tsc --noEmit        # Verify TypeScript
```

## API Examples

### Generate Destination Only
```bash
curl -X POST http://localhost:3001/generate/destination
```

### Pre-generate TTS
```bash
curl -X POST http://localhost:3001/tts/batch \
  -H "Content-Type: application/json" \
  -d '{
    "roundId": "test-123",
    "voiceLines": [
      {
        "phraseId": "clue_10",
        "text": "Här finns ett 324 meter högt järntorn.",
        "voiceId": "Rachel"
      }
    ]
  }'
```

## Troubleshooting

**"ANTHROPIC_API_KEY not configured"**
→ Add key to `.env`

**Port 3001 already in use**
→ Change PORT in `.env` or kill process: `lsof -ti:3001 | xargs kill`

**Generation fails**
→ Check API key is valid
→ Check Claude API status
→ Review logs

## Next Steps

1. Review [README.md](./README.md) for full documentation
2. Check [docs/architecture.md](./docs/architecture.md) for system overview
3. See [docs/integration.md](./docs/integration.md) for backend integration
4. Read [docs/testing.md](./docs/testing.md) for testing guide

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/generate/status` | GET | Configuration status |
| `/generate/round` | POST | Generate content pack (30-60s) |
| `/generate/destination` | POST | Generate destination only |
| `/tts/batch` | POST | Pre-generate TTS |
| `/tts` | POST | Generate single TTS |

## Need Help?

Check:
- Service logs: `tail -f /tmp/ai-content.log`
- Documentation: `docs/`
- Example content: `test-packs/example-stockholm.json`
