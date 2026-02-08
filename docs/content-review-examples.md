# Content Review Examples — Före/Efter

Detta dokument visar konkreta exempel från befintligt AI-genererat innehåll och hur det kan förbättras enligt Content Style Guide.

---

## Ledtrådar (Clues)

### Exempel 1: Stockholm — Nivå 10

**Nuvarande (från example-stockholm.json):**
```
"Här finns 14 öar sammanbundna av över 50 broar, och staden byggdes på platsen där Mälaren möter Östersjön."
```

**Bedömning:** ✅ BRA
- Aktiva verb ("finns", "byggdes", "möter")
- Konkreta siffror (14 öar, 50 broar)
- Naturligt språk
- Ingen läcka av stadens namn
- Lagom svårighetsgrad för nivå 10

**Ingen ändring behövs**

---

### Exempel 2: Stockholm — Nivå 8

**Nuvarande:**
```
"Staden är känd för sitt Nobelpris-ceremoni som hålls i stadshuset varje december."
```

**Problem:**
- Passiv konstruktion: "är känd för"
- Grammatikfel: "sitt Nobelpris-ceremoni" (fel genus)

**Förbättrat:**
```
"Nobelpriset delas ut i stadshuset här varje december."
```

**Förbättringar:**
- Aktivt verb: "delas ut"
- Rättat genus
- Mer direkt formulering
- Fortfarande avslöjar inte stadens namn

---

### Exempel 3: Stockholm — Nivå 6

**Nuvarande:**
```
"I denna stad ligger Gamla Stan, en av Europas bäst bevarade medeltida stadskärnor."
```

**Bedömning:** ✅ MESTADELS BRA
- Bra formulering
- Konkret exempel (Gamla Stan)
- Naturligt språk

**Möjlig förbättring (optional):**
```
"Här ligger Gamla Stan, en av Europas bäst bevarade medeltida stadskärnor."
```
- "Här" känns mer direkt än "I denna stad"

---

### Exempel 4: Stockholm — Nivå 4

**Nuvarande:**
```
"Vasamuseet i denna stad hyser ett 1600-talsskepp som sjönk på sin jungfruresa 1628."
```

**Problem:**
- "hyser" är onödigt formellt

**Förbättrat:**
```
"Vasamuseet här har ett 1600-talsskepp som sjönk på jungfruresa 1628."
```

**Förbättringar:**
- "har" istället för "hyser" (mer naturligt)
- "här" istället för "i denna stad"
- "på jungfruresa" istället för "på sin jungfruresa" (kortare)

---

### Exempel 5: Stockholm — Nivå 2

**Nuvarande:**
```
"Sveriges huvudstad och största stad, känd för sina vackra byggnader och vattenvägar."
```

**Problem:**
- Passiv: "känd för"
- Fluff: "vackra" (tillför inget konkret)
- Fragmentmening (saknar verb)

**Förbättrat:**
```
"Stockholm, Sveriges huvudstad och största stad med sina många vattenvägar."
```

**Förbättringar:**
- Namnger staden (OK för nivå 2)
- Aktivt språk
- "många" istället för vagt "vackra"
- Komplett mening

---

## Följdfrågor (Followups)

### Exempel 1: Vasa-skeppet

**Nuvarande:**
```
"Vilket år sjönk skeppet Vasa som nu visas i museet här?"
```

**Bedömning:** ✅ BRA
- Tydlig fråga
- Använder "här" (inte stadens namn)
- Naturligt språk
- Korrekt anti-leak

**Ingen ändring behövs**

---

### Exempel 2: Mälaren

**Nuvarande:**
```
"Vad heter sjön som möter Östersjön vid denna stad?"
```

**Bedömning:** ✅ BRA
- Använder "denna stad" (inte stadens namn)
- Tydlig fråga
- Naturligt språk

**Möjlig förbättring (optional):**
```
"Vilken sjö möter Östersjön här?"
```
- Kortare, mer direkt

---

## Banter (Common Phrases)

### Rätt svar — Förbättringar

**Nuvarande problem:**
- "Spot on!" (engelska)
- "Excellent!" (engelska)
- "Mycket väl svarat!" (för formellt)

**Förslag att ta bort:**
```diff
- 'Spot on!',
- 'Excellent!',
- 'Mycket väl svarat!',
```

**Förslag att lägga till:**
```typescript
'Exakt!',
'Rätt!',
'Yes!',
'Bingo!',
'Tjabo!',
'Klockrent!',
```

---

### Fel svar — Förbättringar

**Nuvarande problem:**
- "Tyvärr var det inte korrekt" (för formellt)
- "Det var ingen lyckträff" (konstigt)
- "Försök igen nästa gång" (trist)

**Förslag att ta bort:**
```diff
- 'Det var ingen lyckträff',
- 'Försök igen nästa gång',
- 'Tyvärr inte det vi sökte',
```

**Förslag att lägga till:**
```typescript
'Aj då!',
'Nej, tyvärr!',
'Fel den här gången!',
'Inte denna gång!',
'Det var inte rätt!',
```

---

## Instruktioner (Common Phrases)

### Round Start

**Nuvarande — Mestadels bra:**
```typescript
'Dags för en ny runda!',
'Här kommer nästa destination!',
'Nu börjar en ny omgång!',
```

**Mindre bra:**
```typescript
'På med hjälmarna, här kommer en ny runda!', // Lite för krystad
```

**Förslag att ta bort:**
```diff
- 'På med hjälmarna, här kommer en ny runda!',
```

**Förslag att lägga till:**
```typescript
'Ny destination!',
'Nästa runda!',
'Kör igång!',
```

---

### Brake Time

**Nuvarande — Bra:**
```typescript
'Tryck på bromsen när du vet svaret!',
'Snabbast på bromsen vinner!',
'Bromsa när du har svaret!',
```

**Bedömning:** ✅ ALLA BRA
- Tydliga
- Aktiva
- Engagerande

**Ingen ändring behövs**

---

### Answer Locked

**Nuvarande problem:**
```typescript
'Ditt svar är i säkert förvar!', // Lite väl dramatiskt
```

**Förslag att ta bort:**
```diff
- 'Ditt svar är i säkert förvar!',
```

**Förslag att lägga till:**
```typescript
'Klart!',
'Inlämnat!',
'Mottaget!',
```

---

## Sammanfattning av ändringar

### Common Phrases — Engelska att ta bort
- "Spot on!"
- "Excellent!"

### Common Phrases — För formella att ta bort
- "Mycket väl svarat!"
- "Tyvärr var det inte korrekt"
- "Ditt svar är i säkert förvar!"

### Common Phrases — Konstiga uttryck att ta bort
- "Det var ingen lyckträff"
- "På med hjälmarna, här kommer en ny runda!"

### Ledtrådar — Återkommande problem
1. Passiva konstruktioner: "är känd för" → "har"
2. Formella verb: "hyser" → "har", "erbjuder" → "finns"
3. Fluff-adjektiv: "vackra", "fantastiska" utan substans
4. "I denna stad" → "Här"

### Följdfrågor — Återkommande problem
1. Läckage av stadens namn (kontrolleras redan)
2. För långa formuleringar (kan förkortas)

---

## Post-Processing Regler

Dessa regler implementeras i `swedish-polish.ts`:

```typescript
// Passiva konstruktioner
text.replace(/är känd för att ha/gi, 'har')
text.replace(/är berömd för/gi, 'har')
text.replace(/är känd för sina/gi, 'har')

// Formella verb
text.replace(/\bhyser\b/gi, 'har')
text.replace(/erbjuder många/gi, 'har många')

// Fluff
text.replace(/detta fantastiska/gi, 'detta')
text.replace(/denna vackra/gi, 'denna')
text.replace(/många internationella/gi, 'många')

// Opersonligt → inkluderande
text.replace(/Man kan/gi, 'Du kan')
text.replace(/I denna stad/gi, 'Här')
text.replace(/i denna stad/gi, 'här')
```

---

## Versionshistorik

- v1.0 (2026-02-07): Initial analys baserad på example-stockholm.json och common-phrases.ts
