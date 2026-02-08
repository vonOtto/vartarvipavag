# AI-genererade ledtrådar - Förbättringar

**Datum:** 2026-02-07
**Status:** Implementerat, redo för testning
**Syfte:** Dokumentera förbättringar av AI-genererade ledtrådar för att göra dem mer som riktiga "På Spåret"-ledtrådar.

---

## Problemanalys

### Problem med nuvarande system

**1. Nivå 10 är för lätt**
- Nuvarande exempel: "Här finns ett 324 meter högt järntorn som invigdes 1889."
- Problem: Alla vet att det är Eiffeltornet → uppenbart Paris
- För direkta referenser till världsberömda landmärken

**2. För faktamässiga, inte klurigt**
- Läser som Wikipedia-fakta
- Ingen "Aha!"-känsla
- Inte engagerande

**3. Ingen progressiv svårighetsgrad**
- Varje ledtråd är oberoende
- Bygger inte på tidigare information
- Käns inte som en resa

**4. Anti-leak för svag**
- Nivå 10/8 läcker ofta destinationen
- AI kan gissa för lätt

---

## Implementerade förbättringar

### 1. Uppdaterad clue-generator.ts

**Vad har ändrats:**
- Mycket mer detaljerade prompts för varje nivå
- Tydliga regler för vad som är tillåtet på varje nivå
- Fokus på "klurighet" över "faktapackning"
- Bättre exempel för Claude att följa

**Specifika förändringar:**

#### Nivå 10 (10 poäng):
```typescript
// FÖRE:
"Nivå 10 (svårast): Subtila, indirekta fakta. ABSOLUT INTE nämna stadens/platsens namn!"

// EFTER:
"NIVÅ 10 (10 poäng - SVÅRAST):
- Måste vara KLURIG, inte bara faktamässig
- Använd INDIREKTA historiska händelser, kulturella fenomen, geografiska beskrivningar
- ALDRIG nämn stadens/platsens/landets namn
- ALDRIG nämn världsberömda unika landmärken med namn (t.ex. 'Eiffeltornet')
- Omskriv istället: 'ett 324m högt järntorn' → 'en tillfällig metallkonstruktion för en världsutställning 1889'
- Ska vara möjlig men svår att gissa för en kunnig person
- Exempel: 'Här föll en mur som delat staden i 28 år den 9 november 1989' (Berlin)"
```

#### Nivå 8 (8 poäng):
```typescript
// EFTER:
"NIVÅ 8 (8 poäng):
- Mer specifik än nivå 10, men fortfarande utmanande
- KAN nämna kända personer/institutioner (men INTE var de är)
- ALDRIG nämn stadens/platsens/landets namn
- Kräver god allmänbildning
- Exempel: 'I denna stad krönte Napoleon sig själv till kejsare 1804 i en gotisk katedral på en ö' (Paris)"
```

#### Nivå 6 (6 poäng):
```typescript
// EFTER:
"NIVÅ 6 (6 poäng):
- Medelnivå, genomsnittlig spelare ska kunna gissa
- KAN nämna landmärken direkt (men INTE stadens namn än)
- Använd flera ledtrådar som tillsammans pekar mot platsen
- Exempel: 'Här ligger Louvren med sin glaspyramid, och du kan promenera längs Seine' (Paris)"
```

#### Nivå 4 (4 poäng):
```typescript
// EFTER:
"NIVÅ 4 (4 poäng):
- Mycket tydlig, de flesta ska kunna gissa
- KAN nämna landet och grannländer/städer
- Inkludera transport, infrastruktur
- Exempel: 'Härifrån tar du Eurostar till London på 2 timmar. Tunnelbanan heter Metro' (Paris)"
```

#### Nivå 2 (2 poäng):
```typescript
// EFTER:
"NIVÅ 2 (2 poäng - LÄTTAST):
- Helt uppenbar, ALLA ska kunna gissa
- MÅSTE nämna både stadens namn och landet
- Lista de mest kända landmärkena direkt
- Exempel: 'Paris, Frankrikes huvudstad vid Seine, känd för Eiffeltornet, Louvren och Champs-Élysées'"
```

### 2. Uppdaterad anti-leak-checker.ts

**Vad har ändrats:**
- Striktare system prompt för leak-checker
- Ber AI att aktivt FÖRSÖKA gissa
- Tydligare confidence-levels
- Extra strikt för nivå 10

**Specifika förändringar:**

```typescript
// FÖRE:
"Om du kan gissa med medium eller higher confidence - då läcker ledtråden"

// EFTER:
"VIKTIGT - Strikt bedömning:
- Du ska aktivt FÖRSÖKA gissa destinationen
- Använd all din kunskap om geografi, historia, kultur
- Om du kan komma på EN ENDA plats som passar bra → gissa den
- Bedöm din säkerhet ärligt

Confidence levels:
- 'high': Jag är 80-100% säker på att det är denna plats
- 'medium': Jag är 50-80% säker, skulle gissa detta
- 'low': Jag är 20-50% säker, skulle möjligen gissa detta
- 'none': Jag är <20% säker, kan inte gissa meningsfullt

LEAK-kriterier (för nivå 10/8):
- Om du kan gissa med 'high' confidence → LEAK
- Om du kan gissa med 'medium' confidence → LEAK
- Endast 'low' eller 'none' är acceptabelt för tidiga ledtrådar"
```

**Nivå-specifik guidance:**
```typescript
// Lägger till extra kontext för nivå 10:
const levelGuidance =
  clue.level === 10
    ? `\n\nDetta är en NIVÅ 10-ledtråd (svårast). Den ska vara MYCKET svår att gissa.
       Om du kan gissa med mer än "low" confidence är ledtråden FÖR LÄTT och ska REJEKTAS.`
    : clue.level === 8
      ? `\n\nDetta är en NIVÅ 8-ledtråd (svår). Den ska fortfarande vara utmanande.
         Om du kan gissa med "high" confidence är den FÖR LÄTT.`
      : '';
```

---

## Före/Efter Exempel

### Exempel 1: Paris

#### FÖRE (gamla systemet):
```
Nivå 10: "Här finns ett 324 meter högt järntorn som invigdes 1889."
Nivå 8:  "Staden kallas 'Ljusets stad' och är känd för sin konst och mode."
Nivå 6:  "Här ligger Louvren, världens mest besökta konstmuseum."
Nivå 4:  "Från denna stad kan du ta Thalys-tåget till Bryssel eller Amsterdam."
Nivå 2:  "Huvudstad i Frankrike, berömd för Champs-Élysées och Notre-Dame."
```

**Problem:**
- Nivå 10: "324m högt järntorn 1889" → alla vet Eiffeltornet → Paris (FÖR LÄTT)
- Nivå 8: "Ljusets stad" är ett känt smeknamn för Paris (FÖR LÄTT)
- Ingen progression, varje ledtråd är oberoende

#### EFTER (förbättrat system):
```
Nivå 10: "I denna stad hölls en världsutställning 1889 där en tillfällig metallkonstruktion
          protesterades av konstnärer men blev stadens symbol."
Nivå 8:  "I denna stad krönte Napoleon sig själv till kejsare 1804 i en gotisk katedral
          som ligger på en ö i en flod."
Nivå 6:  "Här ligger Louvren med sin glaspyramid, och du kan promenera längs Seine
          från Notre-Dame till Eiffeltornet."
Nivå 4:  "Härifrån tar du Eurostar till London på 2 timmar eller TGV till Lyon.
          Tunnelbanan heter Metro och har 16 linjer."
Nivå 2:  "Paris, Frankrikes huvudstad vid Seine, känd för Eiffeltornet, Louvren,
          Notre-Dame, Arc de Triomphe och Champs-Élysées."
```

**Förbättringar:**
- Nivå 10: Indirekt om Eiffeltornet genom historisk händelse, kräver kunskap
- Nivå 8: Napoleon-händelse kräver koppling mellan person och plats
- Nivå 6: Listar flera platser, börjar nämna landmärken direkt
- Nivå 4: Transport + infrastruktur, mycket tydligare
- Nivå 2: Säger allt direkt

---

### Exempel 2: Rom

#### FÖRE (konceptuellt):
```
Nivå 10: "Här finns en 2000 år gammal amfiteater som kunde ta 50 000 åskådare."
         → Problem: Alla vet att det är Colosseum → Rom
Nivå 8:  "Staden kallas 'den eviga staden' och har existerat i över 2700 år."
         → Problem: "Eviga staden" är ett känt smeknamn för Rom
```

#### EFTER (förbättrat):
```
Nivå 10: "Här grundades enligt myten en stad 753 f.Kr. av tvillingar som ammades av en varghona."
         → Bättre: Romulus & Remus-myten, indirekt
Nivå 8:  "Här ligger världens minsta stat, en enklav som styrs av påven sedan Lateranavtalet 1929."
         → Bättre: Vatikanstaten, kräver kunskap om geografi + historia
Nivå 6:  "Här kan du besöka Colosseum, Trevifontänen och Spanska trappan."
         → Nu OK att nämna landmärken direkt
Nivå 4:  "Denna stad är Italiens största och ligger vid floden Tibern. Härifrån når du
          Neapel på 1 timme med tåg."
         → Nämner land, grannstäder, geografi
Nivå 2:  "Rom, Italiens huvudstad och 'den eviga staden', med Colosseum, Vatikanen,
          Trevifontänen och Forum Romanum."
         → Säger allt direkt
```

---

### Exempel 3: Barcelona

#### FÖRBÄTTRAT (nytt system):
```
Nivå 10: "I denna stad började en arkitekt 1882 bygga en basilika som fortfarande inte är
          färdig och förväntas bli klar tidigast 2026."
         → Indirekt om Sagrada Familia och Gaudí, kräver arkitekturhistoria

Nivå 8:  "Här designade Antoni Gaudí sju byggnader som alla är UNESCO-världsarv,
          inklusive en park med färgglada mosaikbänkar."
         → Nämner Gaudí direkt, Park Güell-referens, mer specifik

Nivå 6:  "I denna stad kan du promenera längs La Rambla, besöka den gotiska katedralen
          och se Sagrada Familia."
         → Listar kända landmärken direkt

Nivå 4:  "Denna katalanska stad är Spaniens andra största, ligger vid Medelhavet och har
          en berömd fotbollsklubb som spelar på Camp Nou."
         → Nämner region, land, FC Barcelona

Nivå 2:  "Barcelona i Katalonien, Spanien, känd för Sagrada Familia, Las Ramblas,
          FC Barcelona och Gaudís arkitektur."
         → Säger allt direkt
```

---

### Exempel 4: Berlin

#### FÖRBÄTTRAT (nytt system):
```
Nivå 10: "Här föll en mur som delat staden i 28 år den 9 november 1989, vilket markerade
          slutet på kalla kriget."
         → Historisk händelse, indirekt

Nivå 8:  "I denna stad hölls olympiska spelen 1936 och staden delades senare mellan fyra
          ockupationsmakter efter andra världskriget."
         → Historiska events, mer specifik

Nivå 6:  "Här kan du besöka Brandenburger Tor, Reichstag och rester av Berlinmuren vid
          East Side Gallery."
         → Listar kända platser direkt

Nivå 4:  "Tysklands huvudstad och största stad, där du kan ta tåget till Prag på 4 timmar
          eller till Warszawa på 6 timmar."
         → Nämner land, grannstäder, transport

Nivå 2:  "Berlin, Tysklands huvudstad, känd för Brandenburger Tor, Berlinmuren, Reichstag
          och Checkpoint Charlie."
         → Säger allt direkt
```

---

## Testning

### Hur man testar förbättringarna

**1. Generera test-packs:**
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
tsx src/scripts/generate-improved-test-packs.ts
```

Detta genererar 3 test-packs i `/test-packs-improved/` med:
- Förbättrade ledtrådar enligt nya systemet
- Anti-leak validering med striktare kriterier
- Detaljerad loggning av varje ledtråd

**2. Manuell granskning:**
För varje genererad pack, kontrollera:

- [ ] **Nivå 10:** Kan du gissa destinationen med >50% säkerhet?
  - Om JA → Ledtråden är FÖR LÄTT
  - Om NEJ → Bra!

- [ ] **Nivå 8:** Kan du gissa med >70% säkerhet?
  - Om JA → Ledtråden är FÖR LÄTT
  - Om NEJ → Bra!

- [ ] **Progression:** Känns det som en naturlig progression från svår till lätt?
  - Varje ledtråd ska bygga på tidigare information

- [ ] **Klurighet:** Får ledtrådarna dig att tänka "Aha!"?
  - Inte bara faktapackning

**3. Jämförelse:**
Generera också gamla test-packs för jämförelse:
```bash
npm run generate-test-packs
```

Jämför `/test-packs/` (gamla) med `/test-packs-improved/` (nya).

---

## Förväntade resultat

### Metriker för framgång

**1. Anti-leak pass rate:**
- Mål: >90% av nivå 10/8-ledtrådar passerar anti-leak test
- Före: ~60% (uppskattning baserat på problemanalys)
- Efter: Förväntat >90%

**2. Klurighet (subjektiv bedömning):**
- Ledtrådar ska kännas som "gåtor" inte "fakta"
- Nivå 10 ska ge känslan "Jag VET att jag hört det här, men VAR?"

**3. Progression:**
- Varje ledtråd ska bygga på tidigare
- Känsla av "resa" från svår till lätt

---

## Nästa steg

1. **Generera test-packs** (3st med nya systemet)
2. **Manuell granskning** av alla ledtrådar
3. **Jämförelse** med gamla systemet
4. **Justera prompts** baserat på resultat
5. **Iterera** tills >90% anti-leak pass rate

---

## Filer som har ändrats

### Dokumentation:
- ✅ `/docs/pa-sparet-clue-analysis.md` - Analys av riktiga På Spåret-ledtrådar
- ✅ `/docs/clue-difficulty-guide.md` - Detaljerade riktlinjer för varje nivå
- ✅ `/docs/clue-improvements.md` - Detta dokument

### Kod:
- ✅ `/services/ai-content/src/generators/clue-generator.ts` - Förbättrade prompts
- ✅ `/services/ai-content/src/verification/anti-leak-checker.ts` - Striktare validering
- ✅ `/services/ai-content/src/scripts/generate-improved-test-packs.ts` - Test script

---

## Sammanfattning

**Problem identifierade:**
1. Nivå 10/8 för lätta - läcker destinationen
2. För faktamässiga, inte klurigt
3. Ingen progressiv svårighetsgrad
4. Anti-leak för svag

**Lösningar implementerade:**
1. Mycket mer detaljerade prompts per nivå
2. Fokus på "klurighet" över "faktapackning"
3. Striktare anti-leak validering
4. Tydliga exempel för Claude att följa

**Status:**
- Kod implementerad och redo för testning
- Dokumentation skapad
- Test script redo att köra
- Väntar på testgenerering och validering

**Nästa:**
- Kör test-generering
- Granska resultat
- Justera baserat på feedback
- Integrera i produktion om test lyckas
