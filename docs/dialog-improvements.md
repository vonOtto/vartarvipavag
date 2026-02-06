# Dialog-förbättringar v1.2.0

## Syfte

Detta dokument visar förbättringarna i spelets dialog och script, med fokus på timing, naturlighet och kontext-anpassning.

## Problem (före)

1. **För kort timing**: Inga pauser mellan satser - texten körde ihop
2. **Mekaniska formuleringar**: "Ledtråden — 10 poäng:" kändes robotisk
3. **Brist på variation**: Samma fraser upprepades varje gång
4. **Saknade andrum**: Ingen tid för lyssnaren att processa information

## Lösning (efter)

### 1. SSML Breaks för naturliga pauser

Alla dialogmallar innehåller nu `<break time="XXXms"/>` för att skapa naturlig timing.

#### Exempel: Clue Read (Nivå 10)

**Före:**
```
Ledtråden — 10 poäng: Här grundades Nobelmuseet år 2001.
```

**Efter:**
```
Vi börjar med den första ledtråden<break time="500ms"/> värd tio poäng<break time="800ms"/> Här grundades Nobelmuseet år 2001.
```

**Resultat:**
- 500ms paus efter "ledtråden" ger tid att förbereda sig
- 800ms paus innan ledtråden själv låter den sjunka in
- Känns som en naturlig TV-presentatör

---

### 2. Varierade formuleringar

Flera alternativa fraser per moment för att undvika upprepning.

#### Exempel: After Brake

**Före (endast en variant):**
```
Där bromsar vi! Låt se vad ni kommit fram till.
```

**Efter (6 varianter):**
```
1. Där bromsar vi!<break time="600ms"/> Låt oss se vad ni kommit fram till.
2. Och där fick vi en broms!<break time="500ms"/> Vad säger ni?<break time="400ms"/> Vad tror ni?
3. Stopp där!<break time="700ms"/> Någon har en teori.<break time="500ms"/> Spännande!
4. Tåget stannar!<break time="600ms"/> Har ni knäckt koden?
5. Där kom bromsen!<break time="500ms"/> Nu är det dags att sätta sig.<break time="400ms"/> Vad blir svaret?
6. Aj då<break time="300ms"/> någon vill svara!<break time="600ms"/> Låt se om ni har rätt.
```

**Resultat:**
- Varje spelomgång känns unik
- Mer energi och personlighet
- Bättre flow

---

### 3. Kontext-anpassade toner

Olika paustider och formuleringar beroende på spelmoment.

#### Exempel: Before Reveal (Bygger spänning)

**Före:**
```
Nu ska vi se om ni har rätt...
```

**Efter:**
```
Nu ska vi se<break time="800ms"/> har ni rätt?<break time="1200ms"/>
```

**Resultat:**
- 800ms paus efter "se" bygger spänning
- 1200ms paus innan reveal = dramatisk timing
- Matchar TV-show format

#### Exempel: Round Intro (Sätter tonen)

**Före:**
```
En ny resa väntar. Vart är vi på väg?
```

**Efter:**
```
Välkomna till en ny resa!<break time="700ms"/> Var tror ni vi ska?<break time="500ms"/> Är ni redo?
```

**Resultat:**
- Mer välkomnande och energisk
- Interaktiv (ställer frågor till spelarna)
- Skapar förväntning

---

### 4. Nivå-specifika variationer för ledtrådar

Ledtråds-läsningarna varierar nu beroende på nivå och progression.

#### Ledtråd 1 (10 poäng) - Början

```
Vi börjar med den första ledtråden<break time="500ms"/> värd tio poäng<break time="800ms"/>
```

Lugn och informativ ton - vi sätter igång.

#### Ledtråd 4 (4 poäng) - Närmar sig slutet

```
Ledtråd fyra<break time="400ms"/> nu för fyra poäng<break time="300ms"/> den här kan vara avgörande<break time="900ms"/>
```

Mer brådska, kortare pauser mellan meningar, längre paus innan ledtråden = ökad spänning.

#### Ledtråd 5 (2 poäng) - Sista chansen

```
Sista ledtråden<break time="500ms"/> bara två poäng kvar<break time="400ms"/> nu måste ni ha det<break time="1000ms"/>
```

Dramatik och tydlig signal om att det är sista ledtråden.

---

### 5. Följdfråge-variationer

Fråge-läsningar har också fått mer variation och bättre timing.

#### Exempel: Question Read

**Före:**
```
Frågan är: Vilket år grundades Stockholm?
```

**Efter (5 varianter):**
```
1. Här kommer frågan<break time="700ms"/> Vilket år grundades Stockholm?
2. Nästa fråga lyder<break time="600ms"/> Vilket år grundades Stockholm?
3. Lyssna på det här<break time="700ms"/> Vilket år grundades Stockholm?
4. Okej<break time="400ms"/> frågan blir<break time="600ms"/> Vilket år grundades Stockholm?
5. Nu blir det svårare<break time="600ms"/> Vilket år grundades Stockholm?
```

**Resultat:**
- Varierad presentation
- Paus innan frågan ger tid att fokusera
- "Nu blir det svårare" bygger spänning

---

## Teknisk Implementation

### Filstruktur

```
services/ai-content/src/script-templates.ts
└── Centraliserade mallar med SSML
    ├── ROUND_INTRO_TEMPLATES
    ├── CLUE_TEMPLATES (per nivå)
    ├── BEFORE_CLUE_TEMPLATES
    ├── AFTER_BRAKE_TEMPLATES
    ├── BEFORE_REVEAL_TEMPLATES
    ├── REVEAL_CORRECT/INCORRECT_TEMPLATES
    ├── QUESTION_INTRO_TEMPLATES
    ├── BEFORE_FINAL_TEMPLATES
    └── Utility functions:
        ├── buildClueRead(level, text)
        ├── buildQuestionRead(text)
        ├── buildFollowupIntro(destination)
        ├── estimateDuration(text)
        └── stripSSML(text)
```

### Integration

1. **tts-prefetch.ts**: Importerar templates och använder dem för batch-generering
2. **audio-director.ts**: Emitterar AUDIO_PLAY events med färdiga TTS-clips
3. **ElevenLabs TTS**: Processerar SSML breaks och genererar audio med pauser

### Fallback-strategi

Om TTS inte är tillgängligt:
- `stripSSML()` tar bort SSML-markup för text-display
- `estimateDuration()` beräknar ungefärlig duration för timing
- Systemet faller tillbaka till text-only mode (Sprint 1.1 beteende)

---

## Paus-riktlinjer (Timing Guidelines)

| Kontext | Paus-längd | Användning |
|---------|-----------|------------|
| Mellan meningar (samma tanke) | 300-500ms | "Ledtråd fyra<break time="400ms"/> nu för fyra poäng" |
| Mellan tankar | 700-1000ms | "Här kommer frågan<break time="700ms"/> Vilket år..." |
| Innan dramatik | 1200-1500ms | "Nu ska vi se<break time="1200ms"/> vem har vunnit?" |
| Innan reveal/finale | 1500-2000ms | N/A (används i audio_timeline.md) |

---

## Testing

### Manuell test-checklista

- [ ] Clue reads känns naturliga på alla nivåer (10, 8, 6, 4, 2)
- [ ] Pauser är tillräckligt långa för att höras men inte obekvämt långa
- [ ] Olika varianter spelas upp vid olika rundor (ingen upprepning)
- [ ] After-brake fraser matchar energin i spelet
- [ ] Before-reveal bygger spänning effektivt
- [ ] Question reads ger tid att förbereda sig
- [ ] Followup intro känns som en naturlig övergång
- [ ] SSML breaks renderas korrekt av ElevenLabs
- [ ] Fallback fungerar om TTS är otillgängligt

### Exempel på testscript

```bash
# Kör backend med ai-content
cd services/backend && npm run dev
cd services/ai-content && npm run dev

# Skapa session och spela igenom en runda
# Lyssna på:
# 1. Timing mellan satser
# 2. Variation i formuleringar
# 3. Naturlighet i röstens rytm
# 4. Spänningsuppbyggnad vid key moments
```

---

## Resultat

### Före-mätningar (användare feedback)
- "Det känns lite för kort mellan fortfarande"
- "Känns inte så naturligt"
- "Passar inte in på vissa ställen"

### Efter-förbättringar
- ✅ Naturliga pauser mellan satser med SSML breaks
- ✅ Varierade formuleringar för att undvika upprepning
- ✅ Kontext-anpassade toner (spänning vs reveal vs intro)
- ✅ Nivå-specifika variationer som följer spelets progression
- ✅ Professionell TV-show känsla

### Kvalitetsmått
- **Pausvariabilitet**: 300ms - 2000ms beroende på kontext
- **Formuleringar**: 4-6 varianter per moment
- **SSML-täckning**: 100% av alla voice lines
- **Fallback-support**: Ja (stripSSML + estimateDuration)

---

## Framtida förbättringar

1. **Dynamisk spänning**: Justera pauslängder baserat på score (jämnt = längre pauser)
2. **Spelar-namn integration**: "Team Röd bromsar!" istället för generisk text
3. **Säsongsvarianter**: Jul/sommar-teman med anpassade fraser
4. **AI-genererade variations**: Använd LLM för att skapa nya varianter dynamiskt
5. **Prosody controls**: SSML `<prosody>` för tonhöjd och tempo-variation

---

**Version**: 1.2.0
**Datum**: 2026-02-06
**Status**: Implementerad och redo för test
