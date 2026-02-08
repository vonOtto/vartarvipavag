# AI Content Service

AI-driven content generation pipeline för På Spåret-spelet.

## Funktioner

- **Destination Generation**: AI genererar intressanta städer/platser
- **Clue Generation**: 5 ledtrådar med progressiv svårighetsgrad (10/8/6/4/2 poäng)
- **Followup Generation**: 2-3 följdfrågor med 4 svarsalternativ vardera
- **Fact Verification**: Verifierar att alla fakta är korrekta
- **Anti-Leak Check**: Säkerställer att tidiga ledtrådar inte avslöjar destinationen
- **Overlap Check**: Förhindrar att följdfrågor frågar om saker som redan nämnts i ledtrådar
- **TTS Integration**: Pre-genererar alla röstklipp via ElevenLabs

## Installation

```bash
npm install
```

## Environment Setup

### 1. Kopiera environment template

```bash
cp .env.example .env
```

### 2. Skaffa API-nycklar

#### Anthropic API Key (Obligatorisk för AI-generation)

1. Gå till [Anthropic Console](https://console.anthropic.com/)
2. Logga in eller skapa konto
3. Navigera till "API Keys"
4. Klicka "Create Key"
5. Kopiera din nyckel (börjar med `sk-ant-api03-...`)
6. Lägg till i `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-din-nyckel-här
   ```

**Viktigt:** Om ANTHROPIC_API_KEY saknas kommer AI-generering att returnera **503 Service Unavailable**. Du kan fortfarande använda pre-genererade content packs (se Workaround nedan).

#### ElevenLabs API Key (Optional för TTS)

1. Gå till [ElevenLabs](https://elevenlabs.io/)
2. Skapa konto och gå till API-inställningar
3. Kopiera din API-nyckel
4. Lägg till i `.env`:
   ```
   ELEVENLABS_API_KEY=sk-din-elevenlabs-nyckel
   ```

Om ElevenLabs API-nyckel saknas körs TTS i **mock mode** (genererar tysta WAV-filer).

### 3. Verifiera konfiguration

Kör servern och kontrollera startup-loggen:

```bash
npm run dev
```

Du bör se:
```
[ai-content] Service running on :3001
[ai-content] TTS mode: live (eller mock)
[ai-content] AI generation: enabled (eller disabled (no API key))
```

### Environment Variables

| Variabel | Obligatorisk | Default | Beskrivning |
|----------|--------------|---------|-------------|
| `ANTHROPIC_API_KEY` | Ja (för AI-gen) | - | Claude API-nyckel från console.anthropic.com |
| `ELEVENLABS_API_KEY` | Nej | - | ElevenLabs för TTS. Mock mode utan. |
| `ELEVENLABS_DEFAULT_VOICE_ID` | Nej | `21m00Tcbv0mMvdtTrqFLmxvi` | Voice ID (Rachel) |
| `PORT` | Nej | `3001` | Server port |
| `PUBLIC_BASE_URL` | Nej | `http://localhost:3001` | För TTS URLs. Sätt till LAN IP för tvOS. |
| `TTS_CACHE_DIR` | Nej | `/tmp/pa-sparet-tts-cache` | Cache för TTS audio clips |
| `CONTENT_PACKS_DIR` | Nej | `./data/content-packs` | Persistent storage för genererade content packs |

### Workaround: Pre-genererade Content Packs

Om du saknar Anthropic API-nyckel kan du använda pre-genererade packs:

```bash
npm run generate-test-packs
```

Detta skapar exempel-packs i `test-packs/` som backend kan ladda direkt utan att anropa AI-tjänsten.

## Content Pack Storage

Genererade content packs sparas automatiskt till persistent storage för återanvändning.

### Storage Location

Default: `./data/content-packs` (relativ till service root)

Detta säkerställer att packs överlever omstarter (till skillnad från `/tmp`).

För att ändra location, sätt `CONTENT_PACKS_DIR` miljövariabel:

```bash
CONTENT_PACKS_DIR=/custom/path/to/packs
```

### Deduplication

Innan en ny destination genereras, kontrollerar systemet om destinationen redan finns:

- Case-insensitive matchning på destinationsnamn
- Om match hittas, returneras befintlig pack utan ny generation
- Sparar API-kostnader och tid
- Loggar när befintlig pack återanvänds

### Content Pack Index

Systemet underhåller en index-fil (`content-packs-index.json`) som innehåller:

- Lista på alla genererade packs
- Metadata per pack (destination, country, verified status, timestamps)
- Snabb tillgång till pack-information utan att ladda hela filer

Index uppdateras automatiskt när nya packs genereras.

## API Endpoints

### POST /generate/round

Genererar en komplett content pack (destination + ledtrådar + följdfrågor).

**Deduplication:** Om destinationen redan finns, returneras befintlig pack.

**Response:**
```json
{
  "success": true,
  "contentPack": {
    "roundId": "uuid",
    "destination": {
      "name": "Paris",
      "country": "Frankrike",
      "aliases": ["paris", "paree"]
    },
    "clues": [
      {"level": 10, "text": "..."},
      {"level": 8, "text": "..."},
      {"level": 6, "text": "..."},
      {"level": 4, "text": "..."},
      {"level": 2, "text": "..."}
    ],
    "followups": [
      {
        "questionText": "...",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "B"
      }
    ],
    "metadata": {
      "generatedAt": "2025-01-01T00:00:00.000Z",
      "verified": true,
      "antiLeakChecked": true,
      "overlapChecked": true
    }
  },
  "progress": {
    "currentStep": 8,
    "totalSteps": 8,
    "stepName": "Klar"
  }
}
```

### GET /generate/packs/index

Returnerar index över alla sparade content packs.

**Response:**
```json
{
  "success": true,
  "index": {
    "version": "1.0",
    "lastUpdated": "2025-01-01T00:00:00.000Z",
    "totalPacks": 42,
    "packs": [
      {
        "roundId": "uuid",
        "destination": "Paris",
        "country": "Frankrike",
        "generatedAt": "2025-01-01T00:00:00.000Z",
        "verified": true,
        "antiLeakChecked": true,
        "filePath": "uuid.json"
      }
    ]
  }
}
```

### GET /generate/packs/:roundId

Laddar en specifik content pack från storage.

**Response:**
```json
{
  "success": true,
  "contentPack": { /* full content pack */ }
}
```

### POST /generate/destination

Genererar bara en destination (för testing).

### GET /generate/status

Returnerar konfigurationsstatus.

### POST /tts/batch

Pre-genererar TTS för alla voice lines i en round. Se [TTS dokumentation](./docs/tts.md).

## Användning

### Starta servern

```bash
npm run dev
```

### Generera test-packs

```bash
npm run generate-test-packs
```

Detta genererar 2 exempel content packs och sparar dem i `test-packs/` directory.

## Arkitektur

### Generators

- `destination-generator.ts`: Genererar destinationer
- `clue-generator.ts`: Genererar ledtrådar med progressiv svårighet
- `followup-generator.ts`: Genererar följdfrågor
- `round-generator.ts`: Huvudorchestrator som kombinerar allt

### Verification

- `fact-checker.ts`: Verifierar faktakorrekthet med Claude
- `anti-leak-checker.ts`: Kontrollerar att tidiga ledtrådar inte läcker destination
- `overlap-checker.ts`: Kontrollerar att följdfrågor inte frågar om saker redan nämnda i ledtrådar

### Flow

1. **Generera destination** - Claude väljer intressant stad/plats
2. **Generera ledtrådar** - 5 ledtrådar med progressiv svårighet
3. **Generera följdfrågor** - 2-3 frågor med 4 alternativ vardera
4. **Verifiera fakta** - Kontrollera att allt stämmer
5. **Anti-leak check** - Säkerställ att nivå 10/8/6 inte avslöjar destination
6. **Overlap check** - Kontrollera att följdfrågor inte överlappar med ledtrådar
7. **Retry if needed** - Om verifiering, anti-leak eller overlap failar, generera om
8. **Return content pack** - Färdig för TTS och spel

## Quality Control Systems

### Anti-Leak System

Systemet använder Claude för att simulera en spelare som försöker gissa destinationen baserat på ledtrådar.

**Kriterier för leak:**
- Om Claude kan gissa destination med "medium" eller "high" confidence
- Om följdfrågor innehåller destinationens namn

**Strict mode:**
- När aktiverad (default): Regenerera round vid leak
- Kan inaktiveras i `config.ts`

### Overlap Check System

Förhindrar att följdfrågor ställer frågor om saker som redan nämnts i ledtrådarna.

**Exempel på overlap (förhindras):**
- Ledtråd: "Floden Seine delar staden i två" → Följdfråga: "Vad heter floden?" **❌ OVERLAP**
- Ledtråd: "Eiffeltornet är 324m högt" → Följdfråga: "Hur högt är Eiffeltornet?" **❌ OVERLAP**
- Ledtråd: "Louvren är världens största konstmuseum" → Följdfråga: "Vilket museum visar Mona Lisa?" **❌ OVERLAP**

**Exempel på OK (tillåts):**
- Ledtråd: "Staden har en flod" → Följdfråga: "Vad heter floden?" **✓ OK** (floden inte namngiven)
- Ledtråd: "Berömt torn från 1889" → Följdfråga: "Hur högt är Eiffeltornet?" **✓ OK** (tornet inte namngivet)
- Ledtråd: "Världsberömt konstmuseum" → Följdfråga: "Vilket museum visar Mona Lisa?" **✓ OK** (museet inte namngivet)

**Strict mode:**
- När aktiverad: Regenerera round vid overlap
- Kontrolleras med `CONFIG.ANTI_LEAK_STRICT_MODE` i `config.ts` (gäller både anti-leak och overlap)

**Testning:**
```bash
# Kör overlap-checker tests
tsx src/verification/__tests__/overlap-checker.test.ts
```

## Fact Verification

Varje claim verifieras som:
- **verified**: Fakta stämmer
- **uncertain**: Kan inte bekräfta säkert
- **rejected**: Uppenbart fel

Om critical facts är rejected, regenereras rounden.

## Testing

Test content packs sparas i `test-packs/` och kan användas för:
- Backend testing
- UI development
- Demo/presentation

## Troubleshooting

### 503 Service Unavailable

**Symptom:** `/generate/round` returnerar 503 error

**Orsak:** `ANTHROPIC_API_KEY` saknas eller inte satt i `.env`

**Lösning:**
1. Kontrollera att `.env` finns i `services/ai-content/`
2. Verifiera att `ANTHROPIC_API_KEY=sk-ant-api03-...` är korrekt ifylld
3. Starta om servern: `npm run dev`
4. Kontrollera startup-loggen: Ska visa "AI generation: enabled"

**Workaround:** Använd pre-genererade content packs (se Environment Setup)

### 401 Unauthorized

**Symptom:** Generation startar men failar med 401

**Orsak:** API-nyckeln är ogiltig eller utgången

**Lösning:**
1. Gå till [Anthropic Console](https://console.anthropic.com/)
2. Verifiera att din API-nyckel är aktiv
3. Generera ny nyckel om nödvändigt
4. Uppdatera `.env` med den nya nyckeln
5. Starta om servern

### Timeout / Network Error

**Symptom:** Generation tar mycket lång tid och timeout

**Möjliga orsaker:**
- Nätverksproblem
- Anthropic API överbelastad
- Firewall blockerar utgående requests

**Lösning:**
1. Kontrollera internet-uppkoppling
2. Testa API manuellt: `curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"`
3. Öka timeout i `src/config.ts` (TIMEOUT_MS)
4. Försök igen senare om Anthropic API är överbelastad

### Generation tar lång tid

**Förväntad tid:** 30-60 sekunder per round

**Orsak:** Inkluderar flera AI-anrop:
- Destination generation
- 5 clues generation
- 2-3 followups generation
- Fact verification
- Anti-leak check
- Potentiella retries (max 3)

**Detta är normalt.** Progress visas via `/generate/round` response.

### Många retries / "Max retries exceeded"

**Orsak:**
- Anti-leak check upptäcker läcka i tidiga ledtrådar
- Fact check avvisar felaktiga claims
- Max 3 försök per generation

**Lösning:**
- Normalt beteende - systemet försöker garantera kvalitet
- Om det händer ofta: Kontrollera `src/config.ts` ANTI_LEAK_STRICT_MODE
- Inaktivera strict mode för snabbare generation (mindre kvalitetskontroll)

### TTS Mock Mode / "TTS mode: mock"

**Symptom:** Startup visar "TTS mode: mock" istället för "live"

**Orsak:** `ELEVENLABS_API_KEY` saknas

**Effekt:** TTS genererar tysta WAV-filer istället för riktig röst

**Lösning:** Lägg till ElevenLabs API-nyckel i `.env` (se Environment Setup)

**Workaround:** Mock mode fungerar för development/testing utan röst

## Integration med Backend

Backend kan använda genererad content via:

```typescript
// Fetch från AI service
const response = await fetch('http://localhost:3001/generate/round', {
  method: 'POST'
});
const { contentPack } = await response.json();

// Konvertera till backend format
const destination: Destination = {
  id: contentPack.roundId,
  name: contentPack.destination.name,
  country: contentPack.destination.country,
  aliases: contentPack.destination.aliases,
  clues: contentPack.clues.map(c => ({
    points: c.level,
    text: c.text
  })),
  followupQuestions: contentPack.followups.map(f => ({
    questionText: f.questionText,
    options: f.options,
    correctAnswer: f.correctAnswer
  }))
};
```

## Future Enhancements

- [ ] Streaming progress updates (SSE)
- [ ] Batch generation (multiple rounds)
- [ ] Content caching/library
- [ ] Difficulty presets (easy/medium/hard)
- [ ] Theme/category selection (landmarks, nature, history, etc.)
- [ ] Multi-language support
