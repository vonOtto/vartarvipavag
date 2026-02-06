# CHANGELOG — Dialog-förbättringar v1.2.0

**Datum**: 2026-02-06
**Version**: 1.2.0
**Status**: Implementerad och redo för test

---

## Översikt

Förbättrade alla dialoger i spelet med SSML breaks för naturliga pauser och varierade formuleringar för bättre upplevelse.

## Problemformulering (före)

Användare rapporterade:
- "Det är lite för kort mellan fortfarande"
- "Känns inte så naturligt"
- "Passar inte in på vissa ställen"

## Lösning

### 1. SSML Breaks för timing

Alla voice lines innehåller nu `<break time="XXXms"/>` tags:
- Korta pauser (300-500ms): mellan meningar
- Medellånga (700-1000ms): mellan tankeskiften
- Långa (1200-2000ms): innan dramatiska moment

### 2. Varierade formuleringar

Ökade antalet varianter per moment:
- Round intro: 4 → 5 varianter
- After brake: 4 → 6 varianter
- Before reveal: 4 → 5 varianter
- Reveal reactions: 3 → 5 varianter (correct/incorrect)
- Question read: 4 → 5 varianter
- Before final: 3 → 4 varianter

### 3. Kontext-anpassade toner

Olika paus-längder beroende på moment:
- **Round intro**: Välkomnande, medellånga pauser
- **Clue read**: Nivå-specifik progression (mer spänning på lägre nivåer)
- **After brake**: Energisk, kortare pauser
- **Before reveal**: Bygger spänning, längre pauser
- **Before final**: Dramatisk, längsta pauserna

### 4. Nivå-specifika clue reads

Ledtråds-läsningarna varierar nu:
- **Nivå 10**: "Vi börjar med..." — lugn introduktion
- **Nivå 8**: "Vi fortsätter..." — fortsatt flow
- **Nivå 6**: "Ledtråd nummer tre..." — halva vägen
- **Nivå 4**: "Den här kan vara avgörande..." — ökad spänning
- **Nivå 2**: "Sista ledtråden..." — sista chansen

---

## Filer som ändrats

### Nya filer

1. **services/ai-content/src/script-templates.ts**
   - Centraliserade dialogmallar med SSML
   - Export av templates och utility functions

2. **services/backend/src/game/script-templates.ts**
   - Duplicerad för att undvika cross-service dependencies
   - Synkad manuellt med ai-content version

3. **docs/dialog-improvements.md**
   - Detaljerad dokumentation av förbättringar
   - Före/efter-exempel
   - Testinstruktioner

4. **docs/CHANGELOG-dialog-v1.2.0.md** (denna fil)
   - Sammanfattning av ändringar

### Modifierade filer

1. **services/backend/src/game/tts-prefetch.ts**
   - Import av script-templates
   - Uppdaterade BANTER_POOL med SSML
   - `generateClueVoice()` använder `buildClueRead()`
   - `generateQuestionVoice()` använder `buildQuestionRead()`
   - `generateFollowupIntroVoice()` använder `buildFollowupIntro()`

2. **contracts/banter.md**
   - Uppdaterad version till 1.2.0
   - Ny SSML Timing Guidelines sektion
   - Dokumenterade paustyper och exempel

---

## API-ändringar

### Nya funktioner (script-templates.ts)

```typescript
// Bygger clue read med SSML
buildClueRead(clueLevel: number, clueText: string): string

// Bygger question read med SSML
buildQuestionRead(questionText: string): { text: string; slotSuffix: number }

// Bygger followup intro med SSML
buildFollowupIntro(destinationName: string): string

// Estimerar duration från SSML text
estimateDuration(text: string): number

// Tar bort SSML markup (fallback display)
stripSSML(text: string): string

// Väljer random template
pickRandom<T>(templates: T[]): T
```

### Exports

```typescript
// Template arrays
export const ROUND_INTRO_TEMPLATES: string[]
export const CLUE_TEMPLATES: Record<number, ClueTemplate[]>
export const BEFORE_CLUE_TEMPLATES: string[]
export const AFTER_BRAKE_TEMPLATES: string[]
export const BEFORE_REVEAL_TEMPLATES: string[]
export const REVEAL_CORRECT_TEMPLATES: string[]
export const REVEAL_INCORRECT_TEMPLATES: string[]
export const QUESTION_INTRO_TEMPLATES: QuestionTemplate[]
export const BEFORE_FINAL_TEMPLATES: string[]
```

---

## Exempel på förbättringar

### Clue Read (Nivå 10)

**Före:**
```
Ledtråden — 10 poäng: Här grundades Nobelmuseet år 2001.
```

**Efter:**
```
Vi börjar med den första ledtråden<break time="500ms"/> värd tio poäng<break time="800ms"/> Här grundades Nobelmuseet år 2001.
```

### After Brake

**Före:**
```
Där bromsar vi! Låt se vad ni kommit fram till.
```

**Efter (variant 2):**
```
Och där fick vi en broms!<break time="500ms"/> Vad säger ni?<break time="400ms"/> Vad tror ni?
```

### Before Reveal

**Före:**
```
Nu ska vi se om ni har rätt...
```

**Efter:**
```
Nu ska vi se<break time="800ms"/> har ni rätt?<break time="1200ms"/>
```

---

## Testing

### Manuell checklista

- [ ] Clue reads känns naturliga på alla nivåer (10, 8, 6, 4, 2)
- [ ] Pauser är tillräckligt långa men inte obekvämt långa
- [ ] Olika varianter vid olika rundor (ingen upprepning)
- [ ] After-brake matcher energin
- [ ] Before-reveal bygger spänning
- [ ] Question reads ger tid att förbereda
- [ ] Followup intro känns som naturlig övergång
- [ ] SSML breaks renderas av ElevenLabs
- [ ] Fallback fungerar utan TTS

### Test-kommando

```bash
# Terminal 1: Backend
cd services/backend && npm run dev

# Terminal 2: AI-content
cd services/ai-content && npm run dev

# Spela igenom en runda och lyssna på:
# - Timing mellan satser
# - Variation i formuleringar
# - Naturlighet i röstens rytm
# - Spänningsuppbyggnad vid key moments
```

---

## Backwards Compatibility

✅ **Fully backwards compatible**

- Befintliga TTS-clips utan SSML fungerar fortfarande
- ElevenLabs ignorerar okända SSML-tags gracefully
- Fallback till text-only mode om TTS misslyckas
- `stripSSML()` rensar markup för display

---

## Kända begränsningar

1. **Manual sync**: script-templates.ts duplicerad mellan backend/ai-content
   - **Lösning**: Håll filer synkade manuellt tills shared package skapas

2. **SSML support**: Beror på ElevenLabs API
   - **Lösning**: Graceful fallback om breaks inte stöds

3. **Duration estimation**: Ungefärlig (~150ms/ord + breaks)
   - **Lösning**: Acceptabel för scheduling, använd faktiska durations när tillgängliga

---

## Framtida förbättringar

1. **Shared package**: Flytta script-templates till eget package
2. **Dynamisk spänning**: Justera pauser baserat på score
3. **Prosody controls**: SSML `<prosody>` för pitch/rate variation
4. **AI-genererade varianter**: LLM för nya formuleringar
5. **Spelar-namn**: Personliga hälsningar ("Team Röd bromsar!")
6. **Säsongs-teman**: Jul/sommar-varianter

---

## Migration Guide

Ingen migration behövs - ändringar är bakåtkompatibla.

Om du vill testa de nya dialogerna:
1. Starta backend + ai-content
2. Skapa ny session
3. Spela igenom en runda
4. Lyssna på förbättrad timing och variation

---

## Support

Vid frågor eller problem:
1. Se `docs/dialog-improvements.md` för detaljerad dokumentation
2. Kontrollera `contracts/banter.md` för SSML-guidelines
3. Inspektera `services/backend/src/game/script-templates.ts` för templates

---

**Slutsats**: Dialog-systemet har nu betydligt bättre timing, naturlighet och variation. Användare bör uppleva mer professionell TV-show känsla med andrum mellan satser och varierade formuleringar.
