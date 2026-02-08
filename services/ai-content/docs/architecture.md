# Architecture Overview

AI Content Generation Pipeline för På Spåret-spelet.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Content Service                          │
│                     (services/ai-content)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   POST /generate/round  POST /tts/batch    GET /generate/status
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Content    │      │     TTS      │     │    Status    │
│  Generator   │      │  Pre-gen     │     │    Check     │
└──────────────┘      └──────────────┘     └──────────────┘
```

## Content Generation Flow

```
1. START
   │
   ▼
2. Generate Destination ──────► Claude API
   │                              │
   │ ◄────────────────────────────┘
   │ {name, country, aliases}
   ▼
3. Generate Clues (5x) ───────► Claude API
   │                              │
   │ ◄────────────────────────────┘
   │ [{level: 10, text}, ...]
   ▼
4. Generate Followups (2-3x) ─► Claude API
   │                              │
   │ ◄────────────────────────────┘
   │ [{question, options, answer}]
   ▼
5. Verify Facts ──────────────► Claude API (parallel)
   │                              │
   │ ◄────────────────────────────┘
   │ [verified/uncertain/rejected]
   │
   ├─► If rejected: RETRY from step 2
   │
   ▼
6. Anti-Leak Check ───────────► Claude API (simulate player)
   │                              │
   │ ◄────────────────────────────┘
   │ [leak detected: yes/no]
   │
   ├─► If leak detected: RETRY from step 2
   │
   ▼
7. Content Pack Ready
   │
   ▼
8. (Optional) TTS Pre-generation ──► ElevenLabs API
   │                                   │
   │ ◄─────────────────────────────────┘
   │ [audio URLs]
   ▼
9. COMPLETE
```

## Module Structure

```
services/ai-content/
├── src/
│   ├── index.ts                      # Express server + routes
│   ├── config.ts                     # Configuration
│   ├── claude-client.ts              # Claude API wrapper
│   ├── tts-client.ts                 # ElevenLabs TTS client
│   │
│   ├── types/
│   │   └── content-pack.ts           # TypeScript types
│   │
│   ├── generators/                   # Content generation
│   │   ├── destination-generator.ts  # Generate destinations
│   │   ├── clue-generator.ts         # Generate clues
│   │   ├── followup-generator.ts     # Generate followup questions
│   │   └── round-generator.ts        # Orchestrator (main)
│   │
│   ├── verification/                 # Quality checks
│   │   ├── fact-checker.ts           # Verify facts with Claude
│   │   └── anti-leak-checker.ts      # Check for premature reveals
│   │
│   ├── routes/
│   │   └── generate.ts               # API endpoints
│   │
│   └── scripts/
│       └── generate-test-packs.ts    # Generate sample data
│
├── test-packs/                       # Generated test content
├── docs/                             # Documentation
├── package.json
├── tsconfig.json
└── .env                              # API keys (not committed)
```

## Key Components

### 1. Claude Client (`claude-client.ts`)

Wrapper around Anthropic SDK:
- Retry logic (3 attempts with exponential backoff)
- JSON parsing with error handling
- Configurable model and parameters

### 2. Generators

#### Destination Generator
- Uses Claude to pick interesting cities/places
- Generates aliases (lowercase variations)
- Returns: `{name, country, aliases}`

#### Clue Generator
- Generates 5 clues with progressive difficulty
- Enforces level order: 10 → 8 → 6 → 4 → 2
- Uses detailed system prompt for style consistency
- Returns: `[{level, text}, ...]`

#### Followup Generator
- Generates 2-3 multiple-choice questions
- Each question has exactly 4 options
- Avoids mentioning destination name
- Returns: `[{questionText, options, correctAnswer}, ...]`

### 3. Verifiers

#### Fact Checker
- Verifies each clue and followup with Claude
- Uses Claude's knowledge to check facts
- Returns: `verified | uncertain | rejected`
- Triggers retry if critical facts are rejected

#### Anti-Leak Checker
- Simulates a player trying to guess destination
- Checks early clues (levels 10, 8, 6)
- Checks followup questions
- Returns: `{leaks: boolean, reason: string}`
- Triggers retry if leaks detected in strict mode

### 4. Round Generator (Orchestrator)

Main coordinator that:
1. Calls all generators in sequence
2. Runs all verifications
3. Handles retries (max 3 attempts)
4. Reports progress via callback
5. Returns complete content pack

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Content Pack JSON                          │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   roundId: "uuid",                                              │
│   destination: {                                                │
│     name: "Paris",                                              │
│     country: "Frankrike",                                       │
│     aliases: ["paris", "paree"]                                 │
│   },                                                            │
│   clues: [                                                      │
│     {level: 10, text: "..."},                                   │
│     {level: 8, text: "..."},                                    │
│     {level: 6, text: "..."},                                    │
│     {level: 4, text: "..."},                                    │
│     {level: 2, text: "..."}                                     │
│   ],                                                            │
│   followups: [                                                  │
│     {                                                           │
│       questionText: "...",                                      │
│       options: ["A", "B", "C", "D"],                            │
│       correctAnswer: "B"                                        │
│     }                                                           │
│   ],                                                            │
│   metadata: {                                                   │
│     generatedAt: "2025-02-07T...",                              │
│     verified: true,                                             │
│     antiLeakChecked: true,                                      │
│     verificationDetails: { ... }                                │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Backend Service (optional)                      │
│                 Convert to internal format                      │
└─────────────────────────────────────────────────────────────────┘
```

## API Integration Points

### 1. External APIs

- **Anthropic Claude API**
  - Model: claude-sonnet-4-5-20250929
  - Usage: Content generation + verification
  - ~10-15 API calls per round
  - Cost: ~$0.05-0.10 per round

- **ElevenLabs API** (optional)
  - Usage: TTS pre-generation
  - ~10-15 audio clips per round
  - Cost: Variable based on character count

### 2. Internal API

Backend can integrate via:

```typescript
// Generate content
POST /generate/round
→ Returns: ContentPack JSON

// Pre-generate TTS
POST /tts/batch
Body: {roundId, voiceLines: [{phraseId, text, voiceId}]}
→ Returns: {clips: [{phraseId, url, durationMs}]}

// Check status
GET /generate/status
→ Returns: {configured, model, antiLeakStrictMode}
```

## Performance Characteristics

| Operation | Time | API Calls | Cost Estimate |
|-----------|------|-----------|---------------|
| Generate Destination | 2-3s | 1 | ~$0.003 |
| Generate Clues | 5-8s | 1 | ~$0.01 |
| Generate Followups | 4-6s | 1 | ~$0.008 |
| Verify Facts | 10-15s | 7 (parallel) | ~$0.02 |
| Anti-Leak Check | 8-12s | 3-4 | ~$0.01 |
| **Total per round** | **30-60s** | **13-14** | **~$0.05-0.10** |

## Error Handling Strategy

### Retry Logic

```
Attempt 1: Generate → Verify → Anti-leak
           │          │         │
           └─ Fail? ──┴─ Fail? ─┴─ RETRY

Attempt 2: Generate → Verify → Anti-leak
           │          │         │
           └─ Fail? ──┴─ Fail? ─┴─ RETRY

Attempt 3: Generate → Verify → Anti-leak
           │          │         │
           └─ Fail? ──┴─ Fail? ─┴─ THROW ERROR
```

### Graceful Degradation

1. **AI Service Down**: Backend falls back to hardcoded content
2. **TTS Service Down**: Generate on-demand during game
3. **Verification Uncertain**: Accept content (fail open)
4. **Anti-leak Failed**: Regenerate (up to 3 times)

## Security Considerations

1. **API Keys**: Stored in `.env`, never committed
2. **Rate Limiting**: Batch requests, exponential backoff
3. **Input Validation**: Sanitize all Claude responses
4. **Output Filtering**: Check for inappropriate content
5. **Cost Control**: Cache results, limit retries

## Scaling Strategy

### Phase 1: On-Demand Generation
- Generate content when host creates session
- 30-60s wait time acceptable for demo

### Phase 2: Pre-Generation Pool
- Generate 50-100 rounds during off-hours
- Store in database
- Pull from pool when session created
- Replenish pool automatically

### Phase 3: Content Library
- Curate high-quality rounds
- Manual review process
- Player feedback loop
- Continuous improvement

## Future Enhancements

1. **Streaming Progress**: Use SSE for real-time updates
2. **Difficulty Tuning**: Easy/Medium/Hard presets
3. **Theme Selection**: Landmarks, Nature, History, etc.
4. **Multi-language**: Generate in Swedish, English, etc.
5. **Quality Metrics**: Track player feedback, adjust prompts
6. **A/B Testing**: Compare prompt variations
7. **Content Moderation**: Filter inappropriate content
8. **Personalization**: Player preferences (interests, difficulty)
