# På Spåret - Ledtrådsanalys

**Datum:** 2026-02-07
**Syfte:** Dokumentera hur riktiga "På Spåret"-ledtrådar fungerar för att förbättra AI-genererade ledtrådar.

---

## Sammanfattning av research

Baserat på research av SVT:s "På Spåret" och fan-skapade exempel har jag analyserat mönster i hur ledtrådar konstrueras på olika nivåer.

### Källor
- [På spåret | SVT Play](https://www.svtplay.se/pa-sparet)
- [Den ultimata guiden till På spåret](https://www.spelregler.se/familjespel/pa-sparet/)
- [Egna På Spåret - av ett fan för fans](https://egnapasparet.wordpress.com/)
- [Lista över avsnitt av På spåret – Wikipedia](https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_avsnitt_av_P%C3%A5_sp%C3%A5ret)

---

## Poängsystemet

Precis som vårt spel använder På Spåret systemet **10-8-6-4-2 poäng**:
- **10 poäng** - Rätt svar efter 1:a ledtråden (svårast)
- **8 poäng** - Rätt svar efter 2:a ledtråden
- **6 poäng** - Rätt svar efter 3:e ledtråden
- **4 poäng** - Rätt svar efter 4:e ledtråden
- **2 poäng** - Rätt svar efter 5:e ledtråden (lättast)

---

## Huvudmönster i riktiga På Spåret-ledtrådar

### 1. Progressiv specificitet
- Tidiga ledtrådar är **vaga och breda**
- Senare ledtrådar blir **specifika och uppenbara**
- Nivå 10/8 kräver bred allmänbildning och kreativt tänkande
- Nivå 4/2 är direkta och nämner ofta destinationen

### 2. Typer av ledtrådar som används

#### A) Geografiska ledtrådar
- Klimat, landskap, position (utan att nämna platsen direkt)
- Exempel från Wien-episoden: "Här finns musiknotationssymboler" (indirekt)

#### B) Kulturella referenser
- Kända personer från platsen (utan att säga "född i X")
- Musik, konst, filmproduktion
- Exempel: "Sigmund Freud" (för Wien), "Arnold Schwarzenegger-filmer" (för Österrike)

#### C) Historiska events
- Viktiga händelser förknippade med platsen
- Årtal och perioder
- Exempel: "Här var en stad delad av en mur i 28 år" (Berlin)

#### D) Ordlekar och kryptiska gåtor
- Ofta på svenska
- Exempel: "Duofryst vatten" = Paris (duo = par, frost = is)
- Exempel: "Kvackton" = Ankara (kvack = ank, ton = ara)
- Exempel: "3,14 total" = Pisa (3,14 = pi, total = sa)

#### E) Kända landmärken
- Nivå 10/8: Beskrivs indirekt ("ett 324 meter högt järntorn från 1889")
- Nivå 4/2: Nämns direkt ("Eiffeltornet", "Louvren")

### 3. Vad gör en bra nivå 10-ledtråd?

Från analysen ser vi att nivå 10-ledtrådar är:

1. **Vaga men korrekta**
   - Ger information som KUNDE passa flera platser
   - Kräver bred kunskap för att koppla ihop

2. **Indirekta referenser**
   - Nämner ALDRIG platsen direkt
   - Använder omskrivningar ("detta land", "här finns")

3. **Kulturellt/historiskt kontextuella**
   - Kräver kunskap om kultur, historia, geografi
   - Inte bara "trivia" utan meningsfull information

4. **Klurigt utan att vara omöjlig**
   - En kunnig person kan gissa, men inte säkert
   - Ger en känsla av "aha!" när man förstår

### 4. Progressionen mellan nivåer

**Exempel: Wien (från forskningens semifinalavsnitt)**

Konceptuell rekonstruktion baserat på mönstret:

- **Nivå 10 (10p):** "I denna stad komponerade en man sin 'Månskenssonat' och förändrade musikhistorien."
  - *Kräver: Kunskap om Beethoven + geografi*
  - *Klurig: Kunde vara flera städer där Beethoven bodde*

- **Nivå 8 (8p):** "Här levde och dog psykoanalysens fader, som utvecklade teorin om drömmars tolkning."
  - *Kräver: Känna till Sigmund Freud + var han bodde*
  - *Klurig: Freud är mer känd, men fortfarande kräver koppling*

- **Nivå 6 (6p):** "Denna stad var centrum för det stora imperiet som styrde Centraleuropa i över 600 år."
  - *Kräver: Historia om Habsburgriket*
  - *Tydligare: Färre städer passar*

- **Nivå 4 (4p):** "Här finns världens äldsta djurpark, Schönbrunn, och staden är känd för sina kaféer och Sachertårta."
  - *Kräver: Grundläggande turistkunskap*
  - *Mycket tydligare: Nämner specifika landmärken*

- **Nivå 2 (2p):** "Österrikes huvudstad, hem för Wienfilharmonikerna och deras nyårskonsert."
  - *Uppenbart: Nämner landet och specifika kännetecken*

---

## Ordlekar och svenska språket

En stor del av På Spåret-charmen är **svenska ordlekar och kryptiska ledtrådar**:

- "Duofryst vatten" = Paris (duo = par, frost = is)
- "Kvackton" = Ankara (kvack = ank, ton = ara)
- "3,14 total" = Pisa (pi + sa)
- "Tofsredskap" = London (tofs = lock, redskap = don)

**Problem för vårt AI-system:**
- Dessa är mycket svåra att generera automatiskt
- Kräver djup förståelse av svenska språket och ordlekar
- Fungerar inte på engelska eller andra språk

**Lösning:**
- Fokusera på **kulturella, geografiska och historiska ledtrådar** istället
- Spara ordlekar till manuellt skapade specialupplagor
- Använd AI för faktabaserade ledtrådar med progressiv svårighetsgrad

---

## Jämförelse: Nuvarande AI vs Riktiga På Spåret

### Nuvarande AI-ledtrådar (problem)

Från vår clue-generator.ts SYSTEM_PROMPT:

```
EXEMPEL (Paris):
- Nivå 10: "Här finns ett 324 meter högt järntorn som invigdes 1889."
- Nivå 8: "Staden kallas 'Ljusets stad' och är känd för sin konst och mode."
- Nivå 6: "Här ligger Louvren, världens mest besökta konstmuseum."
- Nivå 4: "Från denna stad kan du ta Thalys-tåget till Bryssel eller Amsterdam."
- Nivå 2: "Huvudstad i Frankrike, berömd för Champs-Élysées och Notre-Dame."
```

**Problem:**
1. **Nivå 10 är för lätt!** - "324 meter högt järntorn 1889" → alla vet att det är Eiffeltornet → Paris
2. **Nivå 8 är för generisk** - "Ljusets stad" är ett känt smeknamn för Paris
3. **För faktamässiga** - Läser som Wikipedia-fakta, inte som klurighet
4. **Ingen progression** - Varje ledtråd är oberoende istället för att bygga på varandra

### Riktiga På Spåret-ledtrådar (bättre)

**Bättre exempel för Paris:**

- **Nivå 10 (10p):** "I denna stad hölls en världsutställning där en tillfällig konstruktion protesterades av konstnärer men blev stadens symbol."
  - *Indirekt: Nämner händelsen, inte tornet*
  - *Kräver: Kunskap om Eiffeltornets historia*

- **Nivå 8 (8p):** "Här ligger en katedral på en ö i en flod, där Napoleon krönte sig själv till kejsare 1804."
  - *Mer specifik: Notre-Dame + historisk händelse*
  - *Fortfarande inte uppenbart: Måste känna till Napoleon + geografi*

- **Nivå 6 (6p):** "Denna stad är känd för sin triangelformade konstglas-pyramid vid ett f.d. kungligt palats."
  - *Tydligare: Louvren beskrivs mer direkt*

- **Nivå 4 (4p):** "Från denna stad startar höghastighetståget TGV till Marseille och Lyon, och tunnelbanan heter Metro."
  - *Mycket tydligare: Transport + specifika städer*

- **Nivå 2 (2p):** "Frankrikes huvudstad vid Seine, känd för Eiffeltornet, Champs-Élysées och Arc de Triomphe."
  - *Uppenbart: Säger exakt var det är*

---

## Rekommendationer för AI-förbättring

### 1. Strikta nivåregler

**Nivå 10:**
- ALDRIG nämna platsen direkt
- ALDRIG nämna världsberömda landmärken med namn
- Använd historiska events, kulturella fenomen, geografiska beskrivningar
- Målet: "Jag VET att jag hört det här, men VAR?"

**Nivå 8:**
- ALDRIG nämna platsen direkt
- KAN nämna kända personer/event men inte platsnamn
- Mer specifik än nivå 10, men fortfarande klurig

**Nivå 6:**
- KAN nämna landmärken (men fortfarande inte platsnamn)
- Mer direkta fakta

**Nivå 4:**
- Mycket tydlig, KAN nämna grannländer/städer
- Ofta infrastruktur, transport, specifika platser

**Nivå 2:**
- MÅSTE nämna platsnamn och land
- Lista kända landmärken direkt

### 2. Typ av information per nivå

| Nivå | Typ av information | Exempel |
|------|-------------------|---------|
| 10 | Historisk händelse, kulturell referens | "En mur föll här 1989" |
| 8 | Känd person, kulturell institution | "Här föddes Mozart 1756" |
| 6 | Landmärke (omskrivning) | "Här finns en 130 meter hög klocktorn vid parlamentet" |
| 4 | Transport, grannländer | "Härifrån tar du Eurostar till London på 2 timmar" |
| 2 | Direkta namn | "Belgiens huvudstad, känd för EU-parlament" |

### 3. Anti-leak strategi

För varje ledtråd, testa:
1. **Kan Claude gissa platsen från bara denna ledtråd?**
2. **Hur säker är gissningen (high/medium/low)?**
3. **Om >50% säkerhet på nivå 10/8 → REJECT**

### 4. Prompt-förbättringar

Se separat dokument: `/docs/clue-difficulty-guide.md`

---

## Slutsatser

1. **Riktiga På Spåret är klurigt, inte bara faktamässigt**
   - Våra AI-ledtrådar måste bli mer indirekta
   - Fokus på "gissa" inte "veta"

2. **Progressionen är nyckeln**
   - Nivå 10 ska vara svår även för kunniga
   - Nivå 2 ska vara uppenbar för alla

3. **Anti-leak är kritiskt**
   - Striktare validering på nivå 10/8
   - Om AI kan gissa lätt → för lätt för spelare

4. **Svenska ordlekar är svåra för AI**
   - Fokusera på faktabaserade ledtrådar
   - Spara ordlekar för manuella specialupplagor

---

**Nästa steg:**
- Skapa detaljerade riktlinjer i `clue-difficulty-guide.md`
- Uppdatera prompts i `clue-generator.ts`
- Skärpa anti-leak tester i `anti-leak-checker.ts`
- Generera test-packs och jämför före/efter
