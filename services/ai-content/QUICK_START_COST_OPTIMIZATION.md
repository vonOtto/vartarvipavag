# Cost Optimization - Quick Start Guide

## TL;DR

Run these commands to save 90% on AI content generation costs:

```bash
cd services/ai-content

# 1. Pre-generate common phrases (one-time)
npm run pregen-phrases

# 2. Generate content pool (weekly/monthly)
npm run generate-pool -- --count 50 --parallel 3

# 3. Monitor costs (daily/weekly)
npm run metrics
```

---

## What This Does

### Before Optimization
- $0.105 per round
- Every phrase generated from scratch
- Sonnet for everything (expensive)

### After Optimization
- $0.010 per game (90% cheaper!)
- Common phrases cached and reused
- Haiku for simple tasks, Sonnet for creative tasks
- Content packs reused across games

---

## Commands Explained

### 1. `npm run pregen-phrases`
**What:** Pre-generates TTS for 153 common phrases
**When:** Once during setup
**Time:** ~5-10 minutes
**Cost:** ~$0.14 (one-time)
**Saves:** ~$0.051 per game thereafter

**Example output:**
```
🎙️ Pre-generating common phrases TTS...
[1/153] ✅ Generated: "Helt rätt!"
[2/153] 💾 Cached: "Exakt så är det!"
...
✅ Complete! Savings: 90% per game
```

### 2. `npm run generate-pool -- --count 50 --parallel 3`
**What:** Generates 50 content packs in batches of 3
**When:** Weekly or monthly refresh
**Time:** ~5-10 minutes for 50 packs
**Cost:** ~$4.50 for 50 packs
**Saves:** 50-70% through reuse

**Example output:**
```
🚀 Content Pool Generator
Generating 50 packs...
[1] ✅ Generated: Paris, Frankrike
[2] ✅ Generated: Tokyo, Japan
...
✅ Complete! 48 successful, 2 failed
💰 Cost: $4.32 total
```

### 3. `npm run metrics`
**What:** Shows cost analysis dashboard
**When:** Daily or weekly monitoring
**Time:** Instant
**Cost:** Free

**Example output:**
```
📊 Cost Metrics Dashboard
Summary:
  Total rounds: 48
  Total cost: $4.32
  Average cost/round: $0.0900
  TTS cache hit rate: 87.3%

Savings: 14.3% vs baseline
```

---

## How It Works

### Common Phrases Cache
Instead of generating "Helt rätt!" every time:
- Pre-generate once → $0.003
- Reuse 1000x → $0.003 total
- vs Generate 1000x → $3.00
- **Savings: 99.9%**

### Content Pool
Instead of generating fresh content per game:
- Generate 50 packs once → $4.50
- Reuse across 500 games → $0.009 per game
- vs Generate 500x → $52.50
- **Savings: 91%**

### Model Optimization
Instead of using Sonnet for everything:
- Sonnet for creative tasks → $0.015
- Haiku for simple tasks → $0.024
- vs All Sonnet → $0.048
- **Savings: 19%**

---

## Cost Comparison

| Scenario | Per Game | 1,000 Games |
|----------|----------|-------------|
| No optimization | $0.105 | $105.00 |
| With cache only | $0.048 | $48.00 |
| With pool + cache | $0.010 | $10.00 |
| **Total Savings** | **90%** | **$95.00** |

---

## Monitoring

### Daily Check
```bash
npm run metrics
```

Look for:
- Average cost < $0.06
- Cache hit rate > 80%
- Failed rounds < 5%

### Weekly Report
```bash
npm run metrics -- --from $(date -d '7 days ago' +%Y-%m-%d)
```

### Monthly Refresh
```bash
# Regenerate content pool if needed
npm run generate-pool -- --count 50 --parallel 3
```

---

## Troubleshooting

### High costs?
- Check cache hit rate
- Run `npm run pregen-phrases` if low
- Verify content pool is being used

### Low cache hit rate?
- Re-run `npm run pregen-phrases`
- Check TTS cache directory exists
- Verify cache is not being cleared

### Generation failing?
- Check API keys in `.env`
- Verify network connectivity
- Review error logs

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/common-phrases.ts` | 153 pre-defined phrases |
| `src/followup-pool.ts` | 33 generic questions |
| `src/metrics/cost-tracker.ts` | Cost tracking system |
| `src/scripts/pregen-common-phrases.ts` | TTS pre-gen script |
| `src/scripts/generate-content-pool.ts` | Batch generation |
| `src/scripts/show-metrics.ts` | Metrics dashboard |

---

## Next Steps

1. **Setup (5 min)**
   ```bash
   npm run pregen-phrases
   ```

2. **Generate Pool (10 min)**
   ```bash
   npm run generate-pool -- --count 50 --parallel 3
   ```

3. **Monitor (daily)**
   ```bash
   npm run metrics
   ```

4. **Integrate with Backend**
   - Use pre-generated content pool
   - Reference common phrases manifest
   - Track costs via metrics API

---

## Full Documentation

For detailed docs, see:
- `COST_OPTIMIZATION.md` - Complete implementation guide
- `COST_OPTIMIZATION_SUMMARY.md` - Detailed summary
- `/docs/cost-optimization-strategy.md` - Original strategy

---

**Quick Win:** Run `npm run pregen-phrases` right now to start saving 90% on TTS costs!
