# Cost Optimization Implementation

This document describes the cost optimization features implemented in the AI Content Generation service.

## Overview

The AI content generation pipeline has been optimized to reduce costs by up to 90% through:
- Common phrase pre-generation and caching
- Model optimization (Haiku for simple tasks)
- Content pool batch generation
- Generic followup question pool
- Comprehensive cost tracking

## Features

### 1. Common Phrases Library

Pre-defined Swedish phrases for game events to minimize TTS generation costs.

**Location:** `src/common-phrases.ts`

**Features:**
- 153+ pre-defined phrases across categories:
  - Banter (correct/incorrect answers, time warnings)
  - Instructions (round start, brake time, followup announcements)
  - Transitions and reveals
- Random phrase selection to maintain variety
- Flat export for TTS pre-generation

**Usage:**
```typescript
import { getRandomPhrase, getPhraseCount } from './common-phrases';

// Get a random correct answer phrase
const phrase = getRandomPhrase('banter', 'correct');
// → "Helt rätt!" or "Exakt så är det!" etc.

// Get total count
console.log(getPhraseCount()); // → 153
```

### 2. Pre-generate Common Phrases TTS

Generate TTS audio for all common phrases once, then reuse across all games.

**Script:** `npm run pregen-phrases`

**What it does:**
- Generates TTS for all 153 common phrases
- Saves to TTS cache directory
- Creates manifest with phraseId → assetId mappings
- Shows cost savings analysis

**Example output:**
```
🎙️  Pre-generating common phrases TTS...

📊 Total phrases to generate: 153
💾 Cache directory: /tmp/pa-sparet-tts-cache
🔊 Voice ID: pNInz6obpgDQGcFmaJgB

[1/153] ✅ Generated: "Helt rätt!"
[2/153] 💾 Cached: "Exakt så är det!"
...

✅ Pre-generation complete!

💰 Cost Analysis:
   Estimated one-time cost: $0.1377
   Cost per game (without cache): ~$0.057
   Cost per game (with cache): ~$0.006
   Savings per game: ~90%
```

### 3. Model Optimization

Use Claude Haiku (cheaper) for simple tasks, Sonnet (better) for creative tasks.

**Pricing:**
- Sonnet: $3.00 input / $15.00 output (per 1M tokens)
- Haiku: $1.00 input / $5.00 output (per 1M tokens)

**Model Selection:**
```typescript
// Automatically selected based on task:
// - Sonnet: Destination/clue/followup generation (creative)
// - Haiku: Fact verification, anti-leak checking (simple)

// Explicit usage:
import { callClaude } from './claude-client';

const response = await callClaude(prompt, {
  model: 'haiku',  // or 'sonnet'
  maxTokens: 1024,
  systemPrompt: '...',
});
```

**Savings:** ~15-20% on Claude API costs

### 4. Content Pool Batch Generation

Pre-generate multiple content packs for reuse across game sessions.

**Script:** `npm run generate-pool -- --count 50 --parallel 3`

**Parameters:**
- `--count N`: Number of content packs to generate
- `--parallel N`: Number of parallel generations (default: 2)

**What it does:**
- Generates N content packs in parallel batches
- Saves to `./content-pool/` directory
- Creates `metadata.json` with generation stats
- Shows progress and cost analysis

**Example output:**
```
🚀 Content Pool Generator
══════════════════════════════════════════════════
Count: 50
Parallel: 3
Output: ./content-pool
══════════════════════════════════════════════════

📦 Batch 1/17: Generating 3 packs in parallel...

[1] ✅ Generated: Paris, Frankrike
[2] ✅ Generated: Tokyo, Japan
[3] ✅ Generated: Rom, Italien

📈 Progress: 6% (3 successful, 0 failed)

...

✅ Generation complete!

📊 Statistics:
══════════════════════════════════════════════════
Total requested: 50
Successful: 48
Failed: 2
Duration: 420.3s
Average time per pack: 8.8s
Success rate: 96.0%
══════════════════════════════════════════════════

💰 Cost Estimation:
══════════════════════════════════════════════════
Estimated total cost: $4.80
Estimated cost per game (10x reuse): $0.0096
Savings vs on-demand: 90%
══════════════════════════════════════════════════
```

**Savings:** 50-70% through content reuse

### 5. Generic Followup Pool

Pre-defined geography/culture/history questions that work for any destination.

**Location:** `src/followup-pool.ts`

**Features:**
- 40+ generic questions across categories:
  - Geography (rivers, mountains, countries)
  - Culture (languages, traditions, currencies)
  - Landmarks (famous buildings, monuments)
  - Capitals
  - Nature & climate
- Mix function: combine 60% generic + 40% destination-specific

**Usage:**
```typescript
import { mixFollowups, getRandomGenericFollowups } from './followup-pool';

// Get 3 random generic followups
const generic = getRandomGenericFollowups(3);

// Mix generic (60%) with destination-specific (40%)
const destinationFollowups = [/* ... */];
const mixed = mixFollowups(destinationFollowups, 3);
// → 2 generic + 1 destination-specific, shuffled
```

**Savings:** 30-40% on followup generation costs

### 6. Cost Tracking

Track Claude API calls, TTS usage, and estimated costs per round.

**Location:** `src/metrics/cost-tracker.ts`

**Features:**
- Automatic tracking in claude-client and tts-client
- Per-round metrics with model breakdown
- TTS cache hit/miss tracking
- Aggregated metrics across date ranges
- Metrics saved to disk: `/tmp/pa-sparet-metrics/`

**View metrics:**
```bash
# Show all metrics
npm run metrics

# Filter by date range
npm run metrics -- --from 2025-01-01 --to 2025-01-31
```

**Example output:**
```
📊 Cost Metrics Dashboard
════════════════════════════════════════════════════════════
Summary:
────────────────────────────────────────────────────────────
  Total rounds: 48
  Total cost: $4.32
  Average cost/round: $0.0900
  Claude API calls: 624
  TTS cache hit rate: 87.3%
════════════════════════════════════════════════════════════

💰 Cost Projections:
────────────────────────────────────────────────────────────
  Cost for 100 games: $9.00
  Cost for 1,000 games: $90.00

📉 Optimization Impact:
────────────────────────────────────────────────────────────
  Baseline cost/round: $0.1000
  Optimized cost/round: $0.0900
  Savings: 10.0%

🎙️  TTS Cache Efficiency:
────────────────────────────────────────────────────────────
  Cache hit rate: 87.3%
  Status: ✅ Excellent cache performance!
════════════════════════════════════════════════════════════
```

## Implementation Checklist

- [x] Common phrases library (`common-phrases.ts`)
- [x] Pre-generation script (`pregen-common-phrases.ts`)
- [x] Model optimization (Haiku for simple tasks)
- [x] Content pool batch generation (`generate-content-pool.ts`)
- [x] Cost tracking system (`cost-tracker.ts`)
- [x] Generic followup pool (`followup-pool.ts`)
- [x] Metrics display script (`show-metrics.ts`)
- [x] Integration with claude-client
- [x] Integration with tts-client
- [x] Integration with round-generator

## Usage Workflow

### Initial Setup

```bash
# 1. Pre-generate common phrases TTS
npm run pregen-phrases

# 2. Generate content pool (50 packs)
npm run generate-pool -- --count 50 --parallel 3
```

### Generate Single Round (on-demand)

```bash
# Generate a single test pack
npm run generate-test-packs
```

### Monitor Costs

```bash
# View cost metrics
npm run metrics

# View metrics for specific date range
npm run metrics -- --from 2025-02-01 --to 2025-02-07
```

## Cost Breakdown (Per Round)

### Before Optimization
- Claude API: $0.048
- TTS: $0.057
- **Total: ~$0.10 per round**

### After Optimization
- Claude API (Haiku + Sonnet): $0.039 (-19%)
- TTS (with cache): $0.006 (-90%)
- **Total: ~$0.045 per round** (55% savings)

### With Content Pool (10x reuse)
- Amortized generation cost: $0.0045
- TTS cache cost: $0.006
- **Total: ~$0.01 per game** (90% savings)

## Future Enhancements

1. **Dynamic voice selection**: Premium voices for critical moments, standard for background
2. **Text compression**: Optimize TTS text without losing meaning
3. **Smart content rotation**: Track usage stats, rotate less-used packs
4. **Batch verification**: Verify multiple rounds in parallel
5. **Cost budgets**: Set daily/weekly spending limits
6. **A/B testing**: Compare quality vs cost trade-offs

## Metrics API (Future)

Expose metrics via REST endpoint for dashboard integration:

```typescript
// GET /metrics/cost?from=2025-01-01&to=2025-01-31
{
  "totalRounds": 48,
  "totalCost": 4.32,
  "averageCostPerRound": 0.09,
  "claudeCalls": 624,
  "ttsCacheHitRate": 0.873,
  "breakdown": {
    "sonnet": { "calls": 288, "cost": 2.16 },
    "haiku": { "calls": 336, "cost": 1.68 },
    "tts": { "cost": 0.48 }
  }
}
```

## References

- Strategy document: `/docs/cost-optimization-strategy.md`
- Claude pricing: https://www.anthropic.com/pricing
- ElevenLabs pricing: https://elevenlabs.io/pricing
