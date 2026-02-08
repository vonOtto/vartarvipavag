# AI Content Service

AI-driven content generation pipeline för På Spåret-spelet.

## Funktioner

- **Destination Generation**: AI genererar intressanta städer/platser
- **Clue Generation**: 5 ledtrådar med progressiv svårighetsgrad (10/8/6/4/2 poäng)
- **Followup Generation**: 2-3 följdfrågor med 4 svarsalternativ vardera
- **Fact Verification**: Verifierar att alla fakta är korrekta
- **Anti-Leak Check**: Säkerställer att tidiga ledtrådar inte avslöjar destinationen
- **TTS Integration**: Pre-genererar alla röstklipp via ElevenLabs

## Installation

```bash
npm install
```

## Konfiguration

Kopiera `.env.example` till `.env` och fyll i API-nycklar:

```bash
cp .env.example .env
```

Obligatoriska environment variables:

- `ANTHROPIC_API_KEY`: Claude API-nyckel (för content generation)
- `ELEVENLABS_API_KEY`: ElevenLabs API-nyckel (för TTS, optional - mock mode utan)
- `PORT`: Server port (default: 3001)

## API Endpoints

### POST /generate/round

Genererar en komplett content pack (destination + ledtrådar + följdfrågor).

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
      "antiLeakChecked": true
    }
  },
  "progress": {
    "currentStep": 8,
    "totalSteps": 8,
    "stepName": "Klar"
  }
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

### Flow

1. **Generera destination** - Claude väljer intressant stad/plats
2. **Generera ledtrådar** - 5 ledtrådar med progressiv svårighet
3. **Generera följdfrågor** - 2-3 frågor med 4 alternativ vardera
4. **Verifiera fakta** - Kontrollera att allt stämmer
5. **Anti-leak check** - Säkerställ att nivå 10/8/6 inte avslöjar destination
6. **Retry if needed** - Om verifiering eller anti-leak failar, generera om
7. **Return content pack** - Färdig för TTS och spel

## Anti-Leak System

Systemet använder Claude för att simulera en spelare som försöker gissa destinationen baserat på ledtrådar.

**Kriterier för leak:**
- Om Claude kan gissa destination med "medium" eller "high" confidence
- Om följdfrågor innehåller destinationens namn

**Strict mode:**
- När aktiverad (default): Regenerera round vid leak
- Kan inaktiveras i `config.ts`

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

**"ANTHROPIC_API_KEY not configured"**
- Lägg till din Claude API key i `.env`

**Generation tar lång tid**
- Normal generation time: 30-60 sekunder
- Inkluderar flera API-anrop för verifiering

**Många retries**
- Anti-leak check kan triggera regeneration
- Fact check kan avvisa felaktiga claims
- Max 3 försök per generation

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
