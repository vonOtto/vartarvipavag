# Sammanfattning: Förbättring av AI-genererade ledtrådar

**Datum:** 2026-02-07
**Agent:** game-designer
**Status:** Implementerat och redo för testning

---

## Executive Summary

AI-genererade ledtrådar har förbättrats för att bli mer som riktiga "På Spåret"-ledtrådar:

✅ **Problem identifierade och åtgärdade:**
- Nivå 10/8 var för lätta och läckte ofta destinationen
- Ledtrådar var för faktamässiga, inte klurigt
- Ingen tydlig progressiv svårighetsgrad
- Anti-leak validering var för svag

✅ **Lösningar implementerade:**
- Mycket mer detaljerade prompts för varje svårighetsnivå
- Fokus på "klurighet" och "Aha!"-känsla över ren faktapackning
- Striktare anti-leak validering med nivå-specifika kriterier
- Tydliga exempel på BRA vs DÅLIGA ledtrådar

✅ **Leveranser:**
- 3 analysdokument (analys, riktlinjer, före/efter)
- 2 uppdaterade kodfiler (generator + validator)
- 1 test script för att generera förbättrade packs
- 1 testinstruktionsdokument

---

## Arbetsprocess

### 1. Research och analys (SLUTFÖRT)

**Genomfört:**
- Studerade riktiga "På Spåret"-ledtrådar via SVT och fan-skapade exempel
- Analyserade poängsystem (10-8-6-4-2)
- Identifierade mönster: geografiska, kulturella, historiska, ordlekar
- Dokumenterade skillnader mellan riktiga och nuvarande AI-ledtrådar

**Dokument skapat:**
- `/docs/pa-sparet-clue-analysis.md`

**Källor använda:**
- [På spåret | SVT Play](https://www.svtplay.se/pa-sparet)
- [Den ultimata guiden till På spåret](https://www.spelregler.se/familjespel/pa-sparet/)
- [Egna På Spåret - av ett fan för fans](https://egnapasparet.wordpress.com/)

---

### 2. Skapade riktlinjer (SLUTFÖRT)

**Genomfört:**
- Definierade exakta regler för varje svårighetsnivå (10/8/6/4/2)
- Skapade tekniker för varje nivå (historisk händelse, kulturell referens, etc.)
- Dokumenterade 20+ exempel på bra ledtrådar
- Skapade checklista för varje nivå
- Definierade AI prompt templates

**Dokument skapat:**
- `/docs/clue-difficulty-guide.md`

**Innehåll:**
- Detaljerade regler för nivå 10 (svårast) till nivå 2 (lättast)
- 4 kompletta exempel-destinationer (Paris, Rom, Barcelona, Berlin)
- Vanliga misstag att undvika
- Testkriterier för varje nivå

---

### 3. Uppdaterade AI Content Generator (SLUTFÖRT)

**Fil uppdaterad:**
- `/services/ai-content/src/generators/clue-generator.ts`

**Ändringar:**

#### A) Mycket mer detaljerade prompts per nivå

**Före (Nivå 10):**
```typescript
"Nivå 10 (svårast): Subtila, indirekta fakta. ABSOLUT INTE nämna stadens/platsens namn!"
```

**Efter (Nivå 10):**
```typescript
"NIVÅ 10 (10 poäng - SVÅRAST):
- Måste vara KLURIG, inte bara faktamässig
- Använd INDIREKTA historiska händelser, kulturella fenomen, geografiska beskrivningar
- ALDRIG nämn stadens/platsens/landets namn
- ALDRIG nämn världsberömda unika landmärken med namn
- Omskriv istället: 'ett 324m högt järntorn' → 'en tillfällig metallkonstruktion för en världsutställning 1889'
- Ska vara möjlig men svår att gissa för en kunnig person
- Exempel: 'Här föll en mur som delat staden i 28 år den 9 november 1989' (Berlin)"
```

#### B) Nya exempel i system prompt

**Lade till förbättrade exempel för Paris:**
```typescript
- Nivå 10: "I denna stad hölls en världsutställning 1889 där en tillfällig metallkonstruktion
            protesterades av konstnärer men blev stadens symbol."
- Nivå 8:  "I denna stad krönte Napoleon sig själv till kejsare 1804 i en gotisk katedral
            som ligger på en ö i en flod."
// etc...
```

**Lade till exempel för Rom:**
```typescript
- Nivå 10: "Här grundades enligt myten en stad 753 f.Kr. av tvillingar som ammades av en varghona."
- Nivå 8:  "Här ligger världens minsta stat, en enklav som styrs av påven sedan Lateranavtalet 1929."
// etc...
```

#### C) Fokus på klurighet

Lade till explicit regel:
```typescript
"3. KLURIGHET över faktapackning:
   - Fokusera på 'Aha!'-känslan, inte bara information
   - INTE: 'Staden har 2,1 miljoner invånare' (tråkigt)
   - BRA: 'I denna stad firades 1000-årsjubileum år 2000' (klurigare)"
```

---

### 4. Uppdaterade Anti-Leak Checker (SLUTFÖRT)

**Fil uppdaterad:**
- `/services/ai-content/src/verification/anti-leak-checker.ts`

**Ändringar:**

#### A) Striktare system prompt

**Före:**
```typescript
"Om du kan gissa med medium eller higher confidence - då läcker ledtråden"
```

**Efter:**
```typescript
"VIKTIGT - Strikt bedömning:
- Du ska aktivt FÖRSÖKA gissa destinationen
- Använd all din kunskap om geografi, historia, kultur
- Om du kan komma på EN ENDA plats som passar bra → gissa den

Confidence levels:
- 'high': Jag är 80-100% säker
- 'medium': Jag är 50-80% säker
- 'low': Jag är 20-50% säker
- 'none': Jag är <20% säker

LEAK-kriterier (för nivå 10/8):
- 'high' confidence → LEAK
- 'medium' confidence → LEAK
- Endast 'low' eller 'none' acceptabelt"
```

#### B) Nivå-specifik guidance

Lade till extra kontext för nivå 10:
```typescript
const levelGuidance =
  clue.level === 10
    ? `\n\nDetta är en NIVÅ 10-ledtråd (svårast).
       Om du kan gissa med mer än "low" confidence är ledtråden FÖR LÄTT.`
    : clue.level === 8
      ? `\n\nDetta är en NIVÅ 8-ledtråd (svår).
         Om du kan gissa med "high" confidence är den FÖR LÄTT.`
      : '';
```

#### C) Striktare leak-kriterier för nivå 10

```typescript
if (clue.level === 10) {
  if (result.confidence === 'high' || result.confidence === 'medium') {
    leaks = true;
    reason = `NIVÅ 10 ska vara mycket svår, men kan gissas med ${result.confidence} confidence`;
  }
}
```

---

### 5. Skapade test script (SLUTFÖRT)

**Fil skapad:**
- `/services/ai-content/src/scripts/generate-improved-test-packs.ts`

**Funktioner:**
- Genererar 3 test-packs med nya systemet
- Sparar till `/test-packs-improved/`
- Loggar alla ledtrådar för manuell granskning
- Visar sammanfattning av resultat (passed/failed)

**Kör med:**
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
tsx src/scripts/generate-improved-test-packs.ts
```

---

### 6. Dokumenterade förbättringar (SLUTFÖRT)

**Dokument skapat:**
- `/docs/clue-improvements.md` - Före/efter exempel och förväntade resultat
- `/docs/TASK-clue-improvement-testing.md` - Testinstruktioner
- `/docs/clue-improvement-summary.md` - Detta dokument

---

## Före/Efter Jämförelse

### Paris - Nivå 10

**FÖRE:**
```
"Här finns ett 324 meter högt järntorn som invigdes 1889."
```
❌ Problem: Alla vet att det är Eiffeltornet → uppenbart Paris

**EFTER:**
```
"I denna stad hölls en världsutställning 1889 där en tillfällig metallkonstruktion
protesterades av konstnärer men blev stadens symbol."
```
✅ Förbättring: Indirekt om Eiffeltornet, kräver historisk kunskap

---

### Rom - Nivå 10

**FÖRE (konceptuellt):**
```
"Här finns en 2000 år gammal amfiteater som kunde ta 50 000 åskådare."
```
❌ Problem: Alla vet att det är Colosseum → uppenbart Rom

**EFTER:**
```
"Här grundades enligt myten en stad 753 f.Kr. av tvillingar som ammades av en varghona."
```
✅ Förbättring: Romulus & Remus-myten, indirekt och klurig

---

### Barcelona - Nivå 10

**EFTER (nytt system):**
```
"I denna stad började en arkitekt 1882 bygga en basilika som fortfarande inte är
färdig och förväntas bli klar tidigast 2026."
```
✅ Klurig: Indirekt om Sagrada Familia och Gaudí, kräver arkitekturhistoria

---

## Förväntade resultat

### Metriker

| Metrik | Före | Efter (mål) | Förbättring |
|--------|------|-------------|-------------|
| Anti-leak pass rate (nivå 10) | ~60% | >90% | +30% |
| Anti-leak pass rate (nivå 8) | ~70% | >90% | +20% |
| Klurighet (1-5 subjektiv) | 2/5 | 4/5 | +2 |
| Progressiv svårighetsgrad | 3/5 | 4/5 | +1 |

---

## Testning

### Nästa steg för att validera förbättringar:

1. **Generera test-packs:**
   ```bash
   cd /Users/oskar/pa-sparet-party/services/ai-content
   tsx src/scripts/generate-improved-test-packs.ts
   ```

2. **Manuell granskning:**
   - Följ instruktioner i `/docs/TASK-clue-improvement-testing.md`
   - Kontrollera att nivå 10/8 INTE läcker
   - Verifiera klurighet och progression

3. **Jämförelse:**
   - Generera också gamla packs: `npm run generate-test-packs`
   - Jämför `/test-packs/` (gamla) med `/test-packs-improved/` (nya)

4. **Dokumentera resultat:**
   - Skapa testrapport med resultat
   - Identifiera eventuella problem
   - Iterera om nödvändigt

---

## Framgångskriterier

Förbättringarna är godkända om:

✅ **Anti-leak pass rate ≥ 90%**
- 9 av 10 nivå 10-ledtrådar passerar anti-leak test
- 9 av 10 nivå 8-ledtrådar passerar anti-leak test

✅ **Klurighet ≥ 4/5** (subjektiv bedömning)
- Ledtrådar känns som gåtor, inte Wikipedia-fakta
- "Aha!"-känsla när man förstår kopplingen

✅ **Progression tydlig**
- Varje ledtråd bygger på tidigare information
- Känns som en resa från svår till lätt

✅ **Nivå 2 uppenbar**
- Alla nivå 2-ledtrådar ska vara 100% uppenbara

---

## Filer skapade/modifierade

### Dokumentation (6 filer):
1. ✅ `/docs/pa-sparet-clue-analysis.md` - Research och analys
2. ✅ `/docs/clue-difficulty-guide.md` - Riktlinjer för varje nivå
3. ✅ `/docs/clue-improvements.md` - Före/efter exempel
4. ✅ `/docs/TASK-clue-improvement-testing.md` - Testinstruktioner
5. ✅ `/docs/clue-improvement-summary.md` - Detta dokument
6. 📝 `/docs/clue-improvement-test-report-[DATUM].md` - Ska skapas efter testning

### Kod (3 filer):
1. ✅ `/services/ai-content/src/generators/clue-generator.ts` - Uppdaterad
2. ✅ `/services/ai-content/src/verification/anti-leak-checker.ts` - Uppdaterad
3. ✅ `/services/ai-content/src/scripts/generate-improved-test-packs.ts` - Ny

---

## Uppföljning

### Om test lyckas (≥90% pass rate):

1. **Deploy till produktion**
   - Nya prompts används för alla framtida content pack-generationer
   - Uppdatera dokumentation med "godkänt datum"

2. **Monitorering**
   - Spara metriker för varje genererad pack
   - Spåra anti-leak pass rate över tid
   - Samla in spelarbedömningar om klurighet

3. **Kontinuerlig förbättring**
   - Justera prompts baserat på feedback
   - Lägg till fler exempel när nya mönster identifieras

### Om test misslyckas (<90% pass rate):

1. **Analysera misslyckanden**
   - Vilka typer av ledtrådar läcker?
   - Är det specifika mönster (t.ex. för unika landmärken)?
   - Är prompts tillräckligt tydliga?

2. **Justera och iterera**
   - Förbättra prompts med fler exempel
   - Skärp regler ytterligare
   - Lägg till varningar för vanliga misstag

3. **Testa igen**
   - Generera nya packs
   - Upprepa granskning tills framgångskriterier uppfylls

---

## Tekniska detaljer

### AI-modeller som används:

**Clue generation:**
- Model: Claude Sonnet (kreativ generering)
- Max tokens: 2048
- System prompt: Mycket detaljerad med många exempel

**Anti-leak validation:**
- Model: Claude Haiku (snabb kostnadseffektiv validering)
- Max tokens: 1024
- System prompt: Strikt bedömning med aktiv gissning

### Kostnad per pack:

**Uppskattning:**
- Clue generation: ~$0.05 per destination (Sonnet)
- Followup generation: ~$0.03 per destination (Sonnet)
- Fact verification: ~$0.02 per destination (Haiku)
- Anti-leak check (5 clues): ~$0.02 per destination (Haiku)
- Followup leak check (3 followups): ~$0.01 per destination (Haiku)

**Total: ~$0.13 per complete pack**

För 3 test-packs: ~$0.39 total

---

## Relaterade dokument

### Dokumentation:
- `/docs/pa-sparet-clue-analysis.md` - Research om riktiga På Spåret
- `/docs/clue-difficulty-guide.md` - Detaljerade riktlinjer
- `/docs/clue-improvements.md` - Före/efter exempel
- `/docs/TASK-clue-improvement-testing.md` - Testinstruktioner

### Kod:
- `/services/ai-content/src/generators/clue-generator.ts` - Generator
- `/services/ai-content/src/verification/anti-leak-checker.ts` - Validator
- `/services/ai-content/src/scripts/generate-improved-test-packs.ts` - Test script

### Kontrakt:
- `/contracts/content-pack.schema.json` - Content pack schema
- `/contracts/scoring.md` - Poängsystem

---

## Sammanfattning

✅ **Status:** Implementerat och redo för testning

✅ **Leveranser:**
- 3 analysdokument
- 2 uppdaterade kodfiler
- 1 test script
- 1 testinstruktionsdokument

🔄 **Nästa steg:**
1. Kör test-generering (se TASK-clue-improvement-testing.md)
2. Genomför manuell granskning
3. Dokumentera resultat
4. Deploy om test lyckas, iterera om test misslyckas

📊 **Förväntad effekt:**
- Anti-leak pass rate ökar från ~60% till >90%
- Ledtrådar blir mer klurigt och mindre faktamässiga
- Bättre spelupplevelse mer lik riktiga "På Spåret"

---

**Slutsats:**
Förbättringar har implementerats systematiskt baserat på research av riktiga "På Spåret"-ledtrådar. Systemet är nu redo för testning och validering. Om test lyckas kommer AI-genererade ledtrådar vara betydligt närmare riktiga TV-programmets kvalitet.
