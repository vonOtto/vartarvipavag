# TASK: Test förbättrade AI-ledtrådar

**Datum:** 2026-02-07
**Ägare:** game-designer / ai-content-agent
**Status:** Redo för testning

---

## Sammanfattning

Förbättringar har implementerats för att göra AI-genererade ledtrådar mer som riktiga "På Spåret"-ledtrådar:
- Mer klurigt, mindre faktamässiga
- Striktare anti-leak för nivå 10/8
- Bättre progressiv svårighetsgrad

Nu behöver vi generera test-packs och validera förbättringarna.

---

## Testinstruktioner

### Steg 1: Förberedelse

**Kontrollera att .env är konfigurerad:**
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
cat .env | grep ANTHROPIC_API_KEY
```

Om ANTHROPIC_API_KEY finns → fortsätt.

---

### Steg 2: Generera gamla test-packs (för jämförelse)

**Generera 2 packs med gamla systemet:**
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
npm run generate-test-packs
```

Detta skapar `/test-packs/pack-1-*.json` och `/test-packs/pack-2-*.json`.

**Granska gamla packs:**
```bash
ls -l test-packs/
cat test-packs/pack-1-*.json | jq '.clues'
```

Notera:
- Hur är nivå 10-ledtråden?
- Är den för lätt?
- Känns den faktamässig eller klurig?

---

### Steg 3: Generera nya förbättrade test-packs

**Generera 3 packs med nya systemet:**
```bash
cd /Users/oskar/pa-sparet-party/services/ai-content
tsx src/scripts/generate-improved-test-packs.ts
```

Detta skapar `/test-packs-improved/improved-pack-*.json` (3 stycken).

**Output kommer visa:**
- Destination för varje pack
- Alla 5 ledtrådar
- Om anti-leak test passerade
- Om faktaverifiering passerade

---

### Steg 4: Manuell granskning

För varje genererad improved pack, gå igenom följande checklista:

#### Pack 1 Granskning

**Destination:** [Ska fyllas i efter generering]

**Nivå 10-ledtråd:**
```
[Kopiera ledtråden här]
```

- [ ] **Leak test:** Kan du gissa destinationen med >50% säkerhet från BARA denna ledtråd?
  - Om JA → Markera som FÖR LÄTT
  - Om NEJ → PASS

- [ ] **Klurighet:** Känns den som en gåta eller som ett Wikipedia-faktum?
  - Gåta → BRA
  - Wikipedia → DÅLIGT

- [ ] **Namn:** Nämns stadens/landets namn direkt eller indirekt?
  - Om JA → DÅLIGT
  - Om NEJ → BRA

**Nivå 8-ledtråd:**
```
[Kopiera ledtråden här]
```

- [ ] **Leak test:** Kan du gissa med >70% säkerhet från nivå 10 + nivå 8?
  - Om JA → Markera som FÖR LÄTT
  - Om NEJ → PASS

- [ ] **Progression:** Bygger den på nivå 10 eller är den helt oberoende?
  - Bygger på → BRA
  - Oberoende → OK men inte optimalt

**Nivå 6-ledtråd:**
```
[Kopiera ledtråden här]
```

- [ ] **Tydlighet:** Borde en genomsnittlig spelare kunna gissa nu?
  - Om JA → BRA
  - Om NEJ → För svår för nivå 6

**Nivå 4-ledtråd:**
```
[Kopiera ledtråden här]
```

- [ ] **Direkthet:** Nämns land eller grannstäder?
  - Om JA → BRA
  - Om NEJ → För svag för nivå 4

**Nivå 2-ledtråd:**
```
[Kopiera ledtråden här]
```

- [ ] **Uppenbart:** Är det omöjligt att missa?
  - Om JA → BRA
  - Om NEJ → För svag för nivå 2

#### Pack 2 och 3 Granskning

Upprepa samma checklista för pack 2 och 3.

---

### Steg 5: Jämförelse gamla vs nya

**Skapa en jämförelsetabell:**

| Aspekt | Gamla systemet | Nya systemet | Förbättring? |
|--------|---------------|--------------|--------------|
| Nivå 10 läcker? | [Ja/Nej] | [Ja/Nej] | [✓/✗] |
| Nivå 8 läcker? | [Ja/Nej] | [Ja/Nej] | [✓/✗] |
| Klurighet (1-5) | [1-5] | [1-5] | [✓/✗] |
| Progression (1-5) | [1-5] | [1-5] | [✓/✗] |
| Anti-leak pass rate | [%] | [%] | [✓/✗] |

---

### Steg 6: Identifiera problem

Om några packs misslyckades anti-leak test eller känns för lätta:

**1. Analysera varför:**
- Var ledtråden för specifik?
- Nämndes något unikt landmärke för tidigt?
- Var kombinationen av information för unik?

**2. Justera prompts:**
Redigera `/services/ai-content/src/generators/clue-generator.ts`:
- Lägg till fler exempel på BRA vs DÅLIGA ledtrådar
- Skärp reglerna ytterligare
- Lägg till specifika varningar för vanliga misstag

**3. Testa igen:**
Generera nya packs och upprepa granskning.

---

### Steg 7: Dokumentera resultat

**Skapa en testrapport:**
```bash
# Kopiera mall:
cp /Users/oskar/pa-sparet-party/docs/TASK-clue-improvement-testing.md \
   /Users/oskar/pa-sparet-party/docs/clue-improvement-test-report-[DATUM].md
```

**I rapporten, dokumentera:**

1. **Sammanfattning:**
   - Antal packs genererade
   - Antal som passerade anti-leak
   - Övergripande kvalitetsbedömning

2. **Detaljerade resultat:**
   - För varje pack, lista destination och alla ledtrådar
   - Markera problem
   - Jämför med gamla systemet

3. **Slutsats:**
   - Är förbättringarna tillräckliga?
   - Behövs ytterligare justeringar?
   - Rekommendation: Deploy eller iterera?

---

## Framgångskriterier

Förbättringarna är godkända om:

1. **Anti-leak pass rate ≥ 90%**
   - 9 av 10 nivå 10-ledtrådar ska INTE läcka
   - 9 av 10 nivå 8-ledtrådar ska INTE läcka

2. **Klurighet ≥ 4/5** (subjektiv bedömning)
   - Ledtrådar känns som gåtor, inte fakta
   - "Aha!"-känsla när man förstår

3. **Progression tydlig**
   - Varje ledtråd bygger på tidigare
   - Känns som en resa från svår till lätt

4. **Ingen nivå 2 missas**
   - Alla nivå 2-ledtrådar måste vara 100% uppenbara

---

## Troubleshooting

### Problem: "Anti-leak test tar för lång tid"

**Lösning:**
Anti-leak checker använder Claude Haiku för snabbhet. Om det tar >5 min per pack:
- Kontrollera nätverksanslutning
- Kolla Anthropic API status
- Reducera antal packs (från 3 till 1)

### Problem: "Nivå 10 fortsätter att läcka"

**Lösning:**
1. Lägg till fler exempel på INDIREKTA ledtrådar i prompt
2. Öka antalet varningar om vad som INTE får nämnas
3. Överväg att använda två-stegs generering:
   - Steg 1: Generera ledtråd
   - Steg 2: "Gör denna ledtråd MINDRE uppenbar"

### Problem: "Ledtrådar känns fortfarande faktamässiga"

**Lösning:**
Lägg till explicit instruktion i prompt:
```
"Fokusera på MYSTERIER och GÅTOR, inte bara fakta.
Exempel:
- DÅLIGT: 'Staden har 2,1 miljoner invånare'
- BRA: 'I denna stad firades 1000-årsjubileum år 2000'"
```

---

## Uppföljning

Efter testning och godkännande:

1. **Deploy till produktion**
   - Använd nya prompts för alla framtida content pack-generationer

2. **Monitorera resultat**
   - Spara metriker för varje genererad pack
   - Spåra anti-leak pass rate över tid

3. **Iterera baserat på feedback**
   - Samla in spelarbedömningar
   - Justera prompts baserat på verklig användning

---

## Relaterade dokument

- `/docs/pa-sparet-clue-analysis.md` - Analys av riktiga På Spåret-ledtrådar
- `/docs/clue-difficulty-guide.md` - Detaljerade riktlinjer för varje nivå
- `/docs/clue-improvements.md` - Före/efter exempel och ändringar
- `/services/ai-content/src/generators/clue-generator.ts` - Kod
- `/services/ai-content/src/verification/anti-leak-checker.ts` - Kod

---

## Kommandosammanfattning

```bash
# Förberedelse
cd /Users/oskar/pa-sparet-party/services/ai-content

# Generera gamla packs (för jämförelse)
npm run generate-test-packs

# Generera nya förbättrade packs
tsx src/scripts/generate-improved-test-packs.ts

# Granska resultat
ls -l test-packs/
ls -l test-packs-improved/
cat test-packs-improved/improved-pack-1-*.json | jq '.clues'

# Jämför
diff <(cat test-packs/pack-1-*.json | jq '.clues') \
     <(cat test-packs-improved/improved-pack-1-*.json | jq '.clues')
```

---

**Status:** Redo för testning
**Nästa steg:** Kör kommandona ovan och genomför manuell granskning
