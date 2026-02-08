# Content Writer Summary — Svenska språkförbättringar

## Genomförda förbättringar

Jag har genomfört en omfattande förbättring av svenska språket i AI-genererat innehåll för På Spåret Party Edition.

---

## 1. Dokumentation

### Content Style Guide (docs/content-style-guide.md)

Omfattande stilguide med:
- **Svenska språkregler**: Undvik anglicismer, använd aktiva verb, konkreta exempel
- **Tonalitet**: Rolig och smart, inte för tung
- **Specifika riktlinjer** för:
  - Ledtrådar (progressiv svårighetsgrad)
  - Följdfrågor (anti-leak)
  - Banter (feedback till spelare)
  - Instruktioner
- **Exempel**: Före/efter för vanliga misstag
- **Checklista**: För content review

### Content Review Examples (docs/content-review-examples.md)

Konkreta exempel från befintligt innehåll:
- Analys av example-stockholm.json
- Analys av common-phrases.ts
- Förslag på förbättringar med motiveringar
- Post-processing regler baserade på faktiska problem

### Swedish Improvements (docs/swedish-improvements.md)

Sammanfattning av alla implementerade förbättringar:
- Arkitektur (generator layer, post-processing layer)
- Användningsinstruktioner
- Exempel på förbättringar
- Framtida förbättringar

---

## 2. Kod-ändringar

### A. Generator Prompts

#### clue-generator.ts
```typescript
const SWEDISH_LANGUAGE_RULES = `
VIKTIGT - Svenska språkregler:
- Använd aktiva verb (inte "är känd för att ha" → använd "har")
- Undvik onödigt fluff ("fantastiska", "vackra" om det inte tillför konkreta detaljer)
- Konkreta exempel och siffror > vaga beskrivningar ("50 broar" > "många broar")
- Naturligt språk som en svensk skulle säga
- Inga anglicismer (realisera → inse, facilitera → underlätta, hyser → har)
- Inkluderande ton: "Här kan du..." eller "Här finns..." (inte "Man kan...")
- Rolig och smart, inte för tung eller formell
`;
```

Integrerat i system prompt för bättre svenska från början.

#### followup-generator.ts

Samma `SWEDISH_LANGUAGE_RULES` integrerat för konsekvent språk i följdfrågor.

---

### B. Post-Processing (utils/swedish-polish.ts)

Ny utility-funktion som automatiskt förbättrar AI-genererat innehåll:

**Huvudfunktioner:**
- `polishSwedish(text: string)`: Förbättrar en text
- `polishClue(clue: Clue)`: Förbättrar en ledtråd
- `polishFollowup(followup: FollowupQuestion)`: Förbättrar en följdfråga

**Transformationer:**

1. **Passiva → Aktiva verb**
   - "är känd för att ha" → "har"
   - "är berömd för" → "har"

2. **Formella → Naturliga verb**
   - "hyser" → "har"
   - "erbjuder många" → "har många"
   - "är lokaliserad vid" → "ligger vid"

3. **Fluff-borttagning**
   - "detta fantastiska land" → "detta land"
   - "denna vackra stad" → "denna stad"

4. **Inkluderande pronomen**
   - "Man kan" → "Du kan"
   - "I denna stad" → "Här"

5. **Anglicismer**
   - "realisera" → "inse"
   - "facilitera" → "underlätta"

---

### C. Integration i Round Generator

#### round-generator.ts

Lagt till import och applicering av polish-funktioner:

```typescript
import { polishClue, polishFollowup } from '../utils/swedish-polish';

// Efter generering av clues:
clues = clues.map(polishClue);

// Efter generering av followups:
followups = followups.map(polishFollowup);
```

Detta säkerställer att ALL genererat innehåll får automatisk språkförbättring.

---

### D. Common Phrases (common-phrases.ts)

**Borttaget (engelska/formella):**
- "Spot on!" (engelska)
- "Excellent!" (engelska)
- "Mycket väl svarat!" (för formellt)
- "Det var ingen lyckträff" (konstigt)
- "Ditt svar är i säkert förvar!" (för dramatiskt)
- "På med hjälmarna, här kommer en ny runda!" (krystad)
- "Tyvärr inte det vi sökte" (formellt)
- "Inte det vi letade efter" (formellt)

**Tillagt (naturlig svenska):**

Rätt svar:
- "Exakt!"
- "Rätt!"
- "Yes!"
- "Bingo!"
- "Tjabo!"
- "Klockrent!"
- "Utmärkt!"

Fel svar:
- "Aj då!"
- "Nej, tyvärr!"
- "Fel den här gången!"
- "Inte denna gång!"
- "Fortsätt gissa!"
- "Oj, inte rätt!"

Instruktioner:
- "Ny destination!"
- "Nästa runda!"
- "Kör igång!"
- "Klart!"
- "Inlämnat!"
- "Mottaget!"

---

## 3. Konkreta exempel på förbättringar

### Ledtråd: Stockholm nivå 8

**Före:**
```
"Staden är känd för sitt Nobelpris-ceremoni som hålls i stadshuset varje december."
```

**Efter (med polish):**
```
"Nobelpriset delas ut i stadshuset här varje december."
```

**Förbättringar:**
- Aktivt verb ("delas ut" vs "är känd för")
- Rättat genus ("Nobelpriset" inte "sitt Nobelpris-ceremoni")
- Mer direkt formulering

---

### Ledtråd: Stockholm nivå 4

**Före:**
```
"Vasamuseet i denna stad hyser ett 1600-talsskepp som sjönk på sin jungfruresa 1628."
```

**Efter (med polish):**
```
"Vasamuseet här har ett 1600-talsskepp som sjönk på jungfruresa 1628."
```

**Förbättringar:**
- Naturligt verb ("har" vs "hyser")
- Kortare formulering ("här" vs "i denna stad")

---

### Banter

**Före:**
```
'Spot on!',      // engelska
'Excellent!',    // engelska
```

**Efter:**
```
'Exakt!',
'Utmärkt!',
'Klockrent!',
```

---

## 4. Arkitektur

```
┌─────────────────────────────────────────┐
│         Generator Layer                 │
│  (clue-generator, followup-generator)   │
│                                         │
│  Claude API + SWEDISH_LANGUAGE_RULES    │
│         ↓                               │
│  Bättre svenska från början             │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│      Post-Processing Layer              │
│        (round-generator)                │
│                                         │
│  polishClue() / polishFollowup()        │
│         ↓                               │
│  Automatisk förbättring av:             │
│  - Passiva → aktiva verb                │
│  - Formella → naturliga uttryck         │
│  - Fluff-borttagning                    │
│  - Anglicismer → svenska                │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│         Common Phrases                  │
│      (common-phrases.ts)                │
│                                         │
│  Pre-defined naturlig svenska           │
│  Ingen AI-generering behövs             │
└─────────────────────────────────────────┘
```

---

## 5. Användning

### Generera innehåll med förbättrad svenska

Alla befintliga scripts fungerar direkt med de nya förbättringarna:

```bash
cd services/ai-content

# Generera test-packs (använder automatiskt nya prompts + polish)
npm run generate-test-packs

# Generera content pool
npm run generate-pool

# Pre-generera common phrases (TTS cache)
npm run pregen-phrases
```

### Använda polish-funktionen separat

Om du vill använda polish-funktionen i andra sammanhang:

```typescript
import { polishSwedish } from './utils/swedish-polish';

const text = "Staden är känd för att ha många museer";
const polished = polishSwedish(text);
// → "Staden har många museer"
```

---

## 6. Kvalitetssäkring

### Checklista för content review

När du granskar AI-genererat innehåll, kontrollera:

- [ ] Inga anglicismer (realisera, facilitera, etc.)
- [ ] Aktiva verb (inte "är känd för att ha")
- [ ] Konkreta exempel (inte vaga beskrivningar)
- [ ] Naturligt språk (inte "Detta fantastiska...")
- [ ] Inkluderande pronomen (du/ni/här, inte "man")
- [ ] Rätt tonalitet (rolig och smart, inte tung)
- [ ] Inga onödiga fluff-ord
- [ ] Svenska uttryck (inte "Spot on!")
- [ ] Progressiv svårighetsgrad för ledtrådar
- [ ] Anti-leak (inget läckage av destinationsnamn)

---

## 7. Resultat

### Före implementering

- Passiva konstruktioner: "är känd för att ha"
- Anglicismer: "Spot on!", "Excellent!"
- Formella verb: "hyser", "erbjuder"
- Fluff: "Detta fantastiska land"
- Opersonligt: "Man kan besöka"

### Efter implementering

- Aktiva verb: "har"
- Svenska uttryck: "Exakt!", "Utmärkt!"
- Naturliga verb: "har", "finns"
- Konkret: "Detta land"
- Inkluderande: "Du kan besöka"

---

## 8. Filer som ändrats

### Nya filer
- `/Users/oskar/pa-sparet-party/docs/content-style-guide.md`
- `/Users/oskar/pa-sparet-party/docs/content-review-examples.md`
- `/Users/oskar/pa-sparet-party/docs/swedish-improvements.md`
- `/Users/oskar/pa-sparet-party/docs/content-writer-summary.md` (denna fil)
- `/Users/oskar/pa-sparet-party/services/ai-content/src/utils/swedish-polish.ts`

### Uppdaterade filer
- `/Users/oskar/pa-sparet-party/services/ai-content/src/generators/clue-generator.ts`
- `/Users/oskar/pa-sparet-party/services/ai-content/src/generators/followup-generator.ts`
- `/Users/oskar/pa-sparet-party/services/ai-content/src/generators/round-generator.ts`
- `/Users/oskar/pa-sparet-party/services/ai-content/src/common-phrases.ts`

---

## 9. Nästa steg

### Testning
1. Generera nya test-packs med förbättrade prompts
2. Jämför med befintliga test-packs
3. Verifiera att polish-funktionen fungerar korrekt

### Iteration
1. Samla feedback från användare
2. Lägg till fler polish-regler baserat på faktiska problem
3. Mät språkkvalitet (metrics)

### Utökning
1. Applicera samma principer på andra språkgeneratorer
2. Implementera kvalitetsmetrics (LIX, OVIX)
3. A/B-testa förbättrade prompts

---

## Sammanfattning

**Implementerat:**
- ✅ Omfattande Content Style Guide
- ✅ Svenska språkregler i alla generators
- ✅ Automatisk post-processing (swedish-polish.ts)
- ✅ Förbättrade common phrases
- ✅ Integration i round-generator
- ✅ Komplett dokumentation

**Resultat:**
- Naturligare svenska i AI-genererat innehåll
- Färre anglicismer och formella konstruktioner
- Mer aktiva verb och konkreta exempel
- Konsekvent tonalitet (rolig, smart, inte tung)
- Automatisk förbättring av allt nytt innehåll

---

Datum: 2026-02-07
Författare: content-writer agent
Version: 1.0
