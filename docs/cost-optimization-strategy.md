# Cost Optimization Strategy
**Datum**: 2026-02-07
**Mål**: Minimera AI & TTS-kostnader samtidigt som vi behåller hög kvalitet

---

## 📊 Kostnadsanalys (per omgång)

### Claude API (Content Generation)
| Steg | API Calls | Tokens (est.) | Kostnad | Optimerbar? |
|------|-----------|---------------|---------|-------------|
| Destination generation | 1 | 2,000 | $0.006 | ⚠️ Delvis |
| Clue generation (×5) | 5 | 5,000 | $0.015 | ✅ Ja |
| Followup generation (×2-3) | 3 | 4,000 | $0.012 | ✅ Ja |
| Fact verification | 3-5 | 3,000 | $0.009 | ✅ Ja |
| Anti-leak checking | 3-5 | 2,000 | $0.006 | ✅ Ja |
| **TOTALT** | **13-19** | **16,000** | **~$0.048** | |

### ElevenLabs TTS
| Content | Chars | Kostnad | Optimerbar? |
|---------|-------|---------|-------------|
| 5 ledtrådar | ~800 | $0.024 | ✅ Ja |
| 2-3 följdfrågor | ~400 | $0.012 | ✅ Ja |
| Banter/narration | ~600 | $0.018 | ✅✅ Mycket |
| Destination reveal | ~100 | $0.003 | ⚠️ Nej |
| **TOTALT** | **~1,900** | **~$0.057** | |

### Total kostnad per omgång: **~$0.10**

---

## 🎯 Optimeringsstrategier

### 1. Content Pack Pooling (Sparar 90%+)
**Problem**: Varje session genererar nytt content = dyrt
**Lösning**: Pre-generera pool med 50-100 content packs

```
Scenario A (Nuvarande): Generera on-demand
- 100 spelsessioner = 100 generationer
- Kostnad: 100 × $0.10 = $10.00

Scenario B (Pool): Pre-generera 50 packs, rotera
- 100 spelsessioner = återanvänder 50 packs (2× vardera)
- Kostnad: 50 × $0.10 = $5.00
- Besparing: 50%

Scenario C (Pool + Smart rotation): 50 packs, statistik-baserad rotation
- Populära packs spelas oftare
- Sällan spelade packs känns nya
- Besparing: 50-70%
```

**Implementation:**
- `scripts/generate-content-pool.ts` - Batch-generera 50 packs
- Backend pool manager - Rotera smart baserat på usage stats
- Admin UI - Visa pool status, generera fler vid behov

---

### 2. TTS Aggressive Caching (Sparar 80%+)
**Problem**: Samma fraser genereras om och om igen
**Lösning**: Återanvänd TTS för alla identiska texter

```typescript
// services/ai-content/src/tts-client.ts
// REDAN IMPLEMENTERAT: SHA-256 cache key = text + voiceId
// Identiska texter = samma cached MP3

// Förbättringar:
// 1. Persistent disk cache (inte bara runtime)
// 2. Pre-generera common phrases
// 3. Dela cache mellan miljöer
```

**Common phrases att pre-generera:**
- "Dags att svara!" (~30 varianter)
- "Tiden går ut" (~20 varianter)
- "Rätt svar!" / "Fel svar!" (~40 varianter)
- Banter clips (~100 varianter)
- Instruktioner (~20 varianter)

**Besparing:**
- Utan cache: 1,900 chars × 100 sessions = 190,000 chars = $5.70
- Med cache: 1,900 chars × 1 gen + 50 packs × 200 chars (unika) = ~12,000 chars = $0.36
- **Besparing: 94%**

---

### 3. Billigare Modeller för Vissa Steg
**Problem**: Använder Sonnet för allt (dyrt)
**Lösning**: Använd Haiku för enkla uppgifter

```typescript
// Nuvarande: Sonnet för allt (~$0.048/round)
// Optimerat:
// - Haiku för simple tasks (~$0.001/call)
// - Sonnet för creative tasks (~$0.003/call)

Uppgift                    | Model   | Kostnad | Motivering
---------------------------|---------|---------|------------------
Destination generation     | Sonnet  | $0.006  | Kreativitet viktig
Clue generation            | Sonnet  | $0.015  | Kreativitet viktig
Followup generation        | Sonnet  | $0.012  | Kreativitet viktig
Fact verification          | Haiku   | $0.003  | Enkel ja/nej check
Anti-leak checking         | Haiku   | $0.002  | Enkel leak detection
Format normalization       | Haiku   | $0.001  | Strukturell task

Total: $0.039 (sparar 19%)
```

---

### 4. Batch Generation (Sparar tid + pengar)
**Problem**: Generera en och en = långsamt + ineffektivt
**Lösning**: Batch-generera flera rounds samtidigt

```bash
# Generera 10 rounds parallellt
npm run generate-batch -- --count 10 --parallel 3

# Tid: 30s × 10 = 5 min (seriellt)
#      30s × 4 batches = 2 min (parallellt)
# API cost: samma, men snabbare deployment
```

---

### 5. Smart Content Reuse
**Idé**: Vissa komponenter kan återanvändas mellan destinationer

**Generiska följdfrågor** (kan användas för många destinationer):
- "Vilken är den största sjön i Europa?"
- "I vilket land ligger Himalaya?"
- "Vilken valuta används i Japan?"

**Implementation:**
```typescript
// Generic followup pool (100 frågor)
// Mixas med destination-specifika frågor

interface FollowupPool {
  generic: FollowupQuestion[];      // 100 allmänna frågor
  specific: Map<string, FollowupQuestion[]>;  // Per destination
}

// Vid generation: 60% generiska, 40% specifika
```

**Besparing:**
- Generiska frågor: genereras 1× gång
- Används i 100+ rounds
- TTS cost för generiska: ~$0.30 (engångskostnad)
- TTS cost utan: ~$1.20 (100 rounds × 40% × $0.03)
- **Besparing: 75% på followups**

---

### 6. Komprimera TTS Text (Sparar 20-30%)
**Problem**: Långa meningar = dyrt
**Lösning**: Optimera text utan att förlora naturlighet

```typescript
// Före: "Detta fantastiska land är känt för sina vackra fjäll och djupa skogar"
// Efter: "Landet är känt för fjäll och djupa skogar"
// Besparing: 30% chars, samma mening

// Implementation: text-compression.ts
function compressTTSText(text: string): string {
  return text
    .replace(/detta fantastiska/gi, '')
    .replace(/väldigt/, '')
    .replace(/är känt för att ha/, 'har')
    // ... fler regler
}
```

**Besparing:** 20-30% chars = $0.011-0.017 per round

---

### 7. Dynamisk Voice Selection
**Problem**: Premium voices ($0.30/1k chars) vs Standard ($0.15/1k chars)
**Lösning**: Använd premium endast där det syns/hörs mest

```typescript
// Clue narration: Premium voice (viktigaste momentet)
// Banter: Standard voice (bakgrund)
// Instructions: Standard voice (funktionellt)
// Followups: Premium voice (viktigt)

// Mix: 60% standard, 40% premium
// Kostnad: (1,140 × $0.15 + 760 × $0.30) / 1,000 = $0.399
// Tidigare: 1,900 × $0.30 / 1,000 = $0.57
// Besparing: 30%
```

---

## 📈 Sammanfattad Besparing

| Strategi | Implementation | Besparing | Komplexitet |
|----------|----------------|-----------|-------------|
| Content pack pooling | Hög | 50-70% | Låg |
| TTS aggressive caching | Hög | 80-94% | Låg |
| Billigare modeller (Haiku) | Medel | 15-20% | Låg |
| Batch generation | Hög | 0% cost, 60% tid | Låg |
| Generic followup pool | Medel | 30-40% | Medel |
| Text compression | Låg | 20-30% | Låg |
| Dynamic voice selection | Medel | 30% | Medel |

### Total potential besparing: **85-92%**

---

## 🎬 Implementation Plan

### Fas 1: Quick Wins (1-2 dagar)
1. ✅ TTS caching (redan implementerat)
2. Content pack pool (50 packs)
3. Batch generation script

**Resultat:** 60-70% besparing direkt

### Fas 2: Model Optimization (2-3 dagar)
1. Haiku för verification steps
2. Dynamic model selection
3. Cost tracking & metrics

**Resultat:** +15-20% besparing

### Fas 3: Advanced Reuse (3-5 dagar)
1. Generic followup pool
2. Common phrase library
3. Smart rotation algoritm

**Resultat:** +10-15% besparing

---

## 💰 Exempel: 1,000 Spelsessioner

| Scenario | Metod | Total Kostnad |
|----------|-------|---------------|
| Naive | On-demand generation | $100.00 |
| Pool (50 packs) | Rotera packs | $50.00 |
| Pool + Cache | Smart återanvändning | $15.00 |
| Pool + Cache + Haiku | Optimerade modeller | $10.00 |
| **Full optimization** | Alla strategier | **$8-12** |

**Besparing: 88-92%**

---

## 🔧 Monitoring & Metrics

Lägg till cost tracking:

```typescript
// services/backend/src/metrics/cost-tracker.ts
interface CostMetrics {
  claudeApiCalls: number;
  claudeTokens: number;
  elevenLabsChars: number;
  cacheHitRate: number;
  estimatedCost: number;
}

// Dashboard endpoint: GET /admin/metrics/cost
```

---

## ✅ Next Steps

1. **Implementera content pool system** (högsta prioritet)
   - Script för batch-generering
   - Backend pool manager
   - Smart rotation

2. **Pre-generera common phrases**
   - Banter library (~100 clips)
   - Instructions (~20 clips)
   - Generic followups (~50 frågor)

3. **Setup cost monitoring**
   - Track API usage
   - Dashboard för kostnadspolicy
   - Alerts när budget överskrids

4. **Optimize models**
   - Byt till Haiku för verification
   - Test kvalitet vs kostnad

---

**Slutsats:**
Med smart pooling + caching kan vi sänka kostnaden från **$0.10/round till $0.01-0.02/round** (90% besparing) utan att kompromissa på kvalitet eller naturlighet.
