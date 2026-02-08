# Game Session Architecture — Komplett spelstruktur

**Datum**: 2026-02-07
**Syfte**: Designa system för kompletta spel med 3-5 destinationer per session

---

## Problemformulering

Nuvarande system hanterar **en destination åt gången**. Användaren vill ha:

1. **AI auto-generation**: Generera 3-5 destinationer automatiskt
2. **Manual import**: Importera från Excel/CSV
3. **Hybrid**: Mix av AI-genererat och manuellt innehåll

Ett "komplett spel" består av **minst 3 resmål** där spelarna samlar poäng över alla destinationer.

---

## Nuvarande arkitektur

### Session State (services/backend/src/store/session-store.ts)

```typescript
interface Session {
  sessionId: string;
  joinCode: string;
  hostId: string;
  players: Player[];
  state: GameState;          // Hanterar EN destination
  createdAt: number;
  connections: Map<string, WSConnection>;
}

interface GameState {
  phase: 'LOBBY' | 'CLUE_LEVEL' | 'FOLLOWUP' | 'REVEAL' | 'SCOREBOARD' | 'FINALE';
  contentPackId?: string;    // Current destination's content pack
  // ... other fields for current destination
}
```

### Nuvarande flöde

```
1. Create session → LOBBY
2. Start game → Load ONE destination (startNewDestination())
3. Play through: CLUE_LEVEL → FOLLOWUP → REVEAL → SCOREBOARD
4. (Game ends after one destination)
```

**Problem**: Inget sätt att spela flera destinationer i rad.

---

## Ny arkitektur: GamePlan

### Koncept

Ett **GamePlan** definierar en komplett spel-session med flera destinationer:

```typescript
interface GamePlan {
  destinations: DestinationConfig[];  // 3-5 destinations to play
  currentIndex: number;                // Which destination we're on (0-based)
  mode: 'ai' | 'manual' | 'hybrid';   // How destinations were sourced
  createdAt: number;
  generatedBy?: string;                // "ai-content" | "manual-import" | "hybrid"
}

interface DestinationConfig {
  contentPackId: string;               // Content pack ID (from ai-content or manual)
  sourceType: 'ai' | 'manual';         // How this destination was created
  order: number;                       // Position in game (1-5)
}
```

### Utökad Session

```typescript
interface Session {
  sessionId: string;
  joinCode: string;
  hostId: string;
  players: Player[];
  state: GameState;                    // Current destination state
  gamePlan?: GamePlan;                 // New: Defines the full game
  createdAt: number;
  connections: Map<string, WSConnection>;
}
```

---

## Flöden

### 1. AI Auto-Generation Mode

**User action**: Host väljer "AI-generera spel (3-5 destinationer)"

**Backend flow**:
```
POST /v1/sessions/:id/game-plan/generate-ai
{
  "numDestinations": 3-5,
  "regions": ["Europe", "Asia"] // optional filter
}

→ Backend calls ai-content service:
  POST /v1/content/generate-batch
  {
    "count": 3,
    "regions": ["Europe", "Asia"]
  }

→ ai-content generates 3 content packs in parallel

→ Backend creates GamePlan:
  {
    "destinations": [
      { "contentPackId": "pack-1", "sourceType": "ai", "order": 1 },
      { "contentPackId": "pack-2", "sourceType": "ai", "order": 2 },
      { "contentPackId": "pack-3", "sourceType": "ai", "order": 3 }
    ],
    "currentIndex": 0,
    "mode": "ai"
  }

→ Session.gamePlan = newGamePlan
→ Response: GamePlan + list of destination names
```

**iOS Host UI**:
```
┌─────────────────────────────────────┐
│   Skapa nytt spel                   │
│                                     │
│  [ AI-generera (3-5 destinationer) ]│
│  [ Importera från fil ]             │
│  [ Hybrid (mix) ]                   │
└─────────────────────────────────────┘

After selecting AI-generate:
┌─────────────────────────────────────┐
│   Antal destinationer: [3] ▼        │
│   Regioner: [Hela världen] ▼        │
│                                     │
│  [Generera spel]                    │
└─────────────────────────────────────┘

After generation:
┌─────────────────────────────────────┐
│   Spel redo!                        │
│                                     │
│   Destination 1: Stockholm, Sverige │
│   Destination 2: Paris, Frankrike   │
│   Destination 3: Tokyo, Japan       │
│                                     │
│  [Starta spel]                      │
└─────────────────────────────────────┘
```

---

### 2. Manual Import Mode

**User action**: Host laddar upp Excel/CSV med destinationer

**Backend flow**:
```
POST /v1/sessions/:id/game-plan/import
Content-Type: multipart/form-data
{
  "file": <excel/csv file>
}

→ Backend parses Excel/CSV:
  - Validates structure (expected columns: destination, country, clues[10/8/6/4/2], followups)
  - Converts each row to a ContentPack
  - Saves content packs to disk

→ Backend creates GamePlan:
  {
    "destinations": [
      { "contentPackId": "manual-1", "sourceType": "manual", "order": 1 },
      { "contentPackId": "manual-2", "sourceType": "manual", "order": 2 },
      { "contentPackId": "manual-3", "sourceType": "manual", "order": 3 }
    ],
    "currentIndex": 0,
    "mode": "manual"
  }

→ Response: GamePlan + list of destination names
```

**Expected Excel/CSV format**:

| Destination | Country | Clue_10 | Clue_8 | Clue_6 | Clue_4 | Clue_2 | Followup_1 | Followup_1_Options | Followup_1_Answer | ... |
|-------------|---------|---------|--------|--------|--------|--------|------------|-------------------|-------------------|-----|
| Stockholm | Sverige | Här finns 14 öar... | Nobelpriset delas ut... | ... | ... | ... | Vilken flod...? | Seine;Thames;Donau;Mälaren | Mälaren | ... |

---

### 3. Hybrid Mode

**User action**: Host väljer mix av AI + manuella destinationer

**Backend flow**:
```
POST /v1/sessions/:id/game-plan/hybrid
{
  "aiGenerated": 2,              // Generate 2 AI destinations
  "manualPackIds": ["pack-x"]    // Use 1 existing manual pack
}

→ Backend generates 2 AI packs + uses 1 manual pack

→ Backend creates GamePlan with mixed destinations:
  {
    "destinations": [
      { "contentPackId": "pack-ai-1", "sourceType": "ai", "order": 1 },
      { "contentPackId": "pack-x", "sourceType": "manual", "order": 2 },
      { "contentPackId": "pack-ai-2", "sourceType": "ai", "order": 3 }
    ],
    "currentIndex": 0,
    "mode": "hybrid"
  }

→ Response: GamePlan + list of destination names
```

---

## State Machine Changes

### Current flow (one destination)

```
LOBBY → START_GAME → CLUE_LEVEL → FOLLOWUP → REVEAL → SCOREBOARD → (END)
```

### New flow (multi-destination)

```
LOBBY → START_GAME → Load destination 1 → CLUE_LEVEL → FOLLOWUP → REVEAL → SCOREBOARD
                                                                                    ↓
                                           ┌────────────────────────────────────────┘
                                           ↓
                                  Check if more destinations?
                                           ↓
                                    YES: Load next destination → CLUE_LEVEL → ...
                                           ↓
                                    NO: → FINALE (final scoreboard)
```

### Implementation

**services/backend/src/game/state-machine.ts**:

```typescript
/**
 * Advances to next destination in GamePlan, or ends game if complete
 */
export function advanceToNextDestination(session: Session): boolean {
  if (!session.gamePlan) {
    // No game plan = single destination game (legacy behavior)
    return false; // Game complete
  }

  const { destinations, currentIndex } = session.gamePlan;

  // Check if there are more destinations
  if (currentIndex + 1 >= destinations.length) {
    // All destinations played → game complete
    return false;
  }

  // Advance to next destination
  session.gamePlan.currentIndex++;
  const nextDestination = destinations[session.gamePlan.currentIndex];

  // Load next destination
  startNewDestination(session, nextDestination.contentPackId);

  return true; // More destinations to play
}

/**
 * Modified REVEAL → SCOREBOARD transition
 */
export function transitionToScoreboard(session: Session): void {
  // ... existing scoring logic ...

  // Check if there are more destinations
  const hasMore = session.gamePlan &&
    session.gamePlan.currentIndex + 1 < session.gamePlan.destinations.length;

  if (hasMore) {
    // More destinations → transition to next destination
    session.state.phase = 'SCOREBOARD';
    session.state.nextDestinationAvailable = true;
  } else {
    // No more destinations → transition to FINALE
    session.state.phase = 'FINALE';
  }
}
```

---

## API Endpoints

### 1. Create AI-generated GamePlan

```
POST /v1/sessions/:sessionId/game-plan/generate-ai
Body: {
  "numDestinations": 3-5,
  "regions"?: string[]
}
Response: {
  "gamePlan": GamePlan,
  "destinations": [
    { "name": "Stockholm", "country": "Sverige" },
    { "name": "Paris", "country": "Frankrike" },
    { "name": "Tokyo", "country": "Japan" }
  ]
}
```

### 2. Import manual GamePlan

```
POST /v1/sessions/:sessionId/game-plan/import
Content-Type: multipart/form-data
Body: { "file": <excel/csv> }
Response: {
  "gamePlan": GamePlan,
  "destinations": [ ... ]
}
```

### 3. Create hybrid GamePlan

```
POST /v1/sessions/:sessionId/game-plan/hybrid
Body: {
  "aiGenerated": number,
  "manualPackIds": string[]
}
Response: {
  "gamePlan": GamePlan,
  "destinations": [ ... ]
}
```

### 4. Get current GamePlan status

```
GET /v1/sessions/:sessionId/game-plan
Response: {
  "gamePlan": GamePlan,
  "currentDestination": {
    "index": 1,
    "total": 3,
    "name": "Stockholm",
    "country": "Sverige"
  }
}
```

---

## AI-Content Service Changes

### New endpoint: Batch generation

```
POST /v1/content/generate-batch
Body: {
  "count": 3-5,
  "regions"?: string[]
}
Response: {
  "packs": [
    { "id": "pack-1", "name": "Stockholm", "country": "Sverige" },
    { "id": "pack-2", "name": "Paris", "country": "Frankrike" },
    { "id": "pack-3", "name": "Tokyo", "country": "Japan" }
  ],
  "cost": { "totalUsd": 0.30, "perPack": 0.10 }
}
```

**Implementation**:
```typescript
// services/ai-content/src/routes/generate.ts
router.post('/generate-batch', async (req, res) => {
  const { count, regions } = req.body;

  // Validate count (3-5)
  if (count < 3 || count > 5) {
    return res.status(400).json({ error: 'count must be 3-5' });
  }

  // Generate packs in parallel
  const packPromises = Array.from({ length: count }, () =>
    generateRound((progress) => {
      // Progress callback (optional logging)
    })
  );

  const packs = await Promise.all(packPromises);

  // Save packs to disk
  const savedPacks = packs.map((pack) => {
    const filename = `${pack.destination.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(CONTENT_PACKS_DIR, filename),
      JSON.stringify(pack, null, 2)
    );
    return {
      id: pack.id,
      name: pack.destination.name,
      country: pack.destination.country,
    };
  });

  res.json({
    packs: savedPacks,
    cost: {
      totalUsd: count * 0.10, // Rough estimate
      perPack: 0.10,
    },
  });
});
```

---

## iOS Host UI Changes

### New screens

#### 1. Game Setup Screen (before LOBBY)

```swift
struct GameSetupView: View {
  @State var gameMode: GameMode = .ai
  @State var numDestinations: Int = 3
  @State var isGenerating = false

  var body: some View {
    VStack(spacing: 20) {
      Text("Skapa nytt spel")
        .font(.title)

      Picker("Spelläge", selection: $gameMode) {
        Text("AI-generera").tag(GameMode.ai)
        Text("Importera fil").tag(GameMode.manual)
        Text("Hybrid").tag(GameMode.hybrid)
      }

      if gameMode == .ai {
        Stepper("Antal destinationer: \(numDestinations)", value: $numDestinations, in: 3...5)
      }

      Button("Skapa spel") {
        createGamePlan()
      }
      .disabled(isGenerating)

      if isGenerating {
        ProgressView("Genererar destinationer...")
      }
    }
  }

  func createGamePlan() {
    isGenerating = true
    // Call POST /v1/sessions/:id/game-plan/generate-ai
  }
}
```

#### 2. Game Progress Indicator (during game)

```swift
struct GameProgressView: View {
  var currentIndex: Int
  var totalDestinations: Int

  var body: some View {
    HStack {
      Text("Destination \(currentIndex + 1) / \(totalDestinations)")
        .font(.caption)
        .foregroundColor(.secondary)

      ProgressView(value: Double(currentIndex + 1), total: Double(totalDestinations))
        .frame(width: 100)
    }
  }
}
```

---

## Contracts Changes

### State Schema (contracts/state.schema.json)

Add optional fields for game plan:

```json
{
  "gamePlan": {
    "type": "object",
    "properties": {
      "destinations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "contentPackId": { "type": "string" },
            "sourceType": { "enum": ["ai", "manual"] },
            "order": { "type": "number" }
          }
        }
      },
      "currentIndex": { "type": "number" },
      "mode": { "enum": ["ai", "manual", "hybrid"] }
    }
  },
  "nextDestinationAvailable": { "type": "boolean" }
}
```

### New Event: NEXT_DESTINATION

```json
{
  "type": "NEXT_DESTINATION",
  "payload": {
    "destinationIndex": 2,
    "totalDestinations": 3,
    "destinationName": "Paris",
    "destinationCountry": "Frankrike"
  }
}
```

---

## Implementation Plan

### Phase 1: Backend GamePlan structure (1-2 days)
1. Add `GamePlan` type to session-store.ts
2. Create `/game-plan/*` endpoints (generate-ai, import, hybrid)
3. Update state-machine.ts with `advanceToNextDestination()`
4. Test with Postman/curl

### Phase 2: AI-Content batch generation (1 day)
1. Create `/generate-batch` endpoint
2. Parallelize content pack generation
3. Test generation of 3-5 packs

### Phase 3: Manual import parser (2 days)
1. Create Excel/CSV parser
2. Validate format and convert to ContentPack
3. Save to disk
4. Test with sample files

### Phase 4: iOS Host UI (2-3 days)
1. Create GameSetupView
2. Integrate API calls for game plan creation
3. Add GameProgressView to show destination progress
4. Update LobbyView to show game plan
5. Test full flow

### Phase 5: E2E Testing (1 day)
1. Test AI mode (3-5 destinations)
2. Test manual import mode
3. Test hybrid mode
4. Verify scoring across destinations

---

## Total Effort: ~7-10 days

---

## Benefits

1. **Complete game experience**: Players play multiple destinations in one session
2. **Flexible content**: AI, manual, or hybrid
3. **Better replayability**: Different destination combinations
4. **Cost efficient**: Generate once, play many times
5. **Host control**: Choose how many destinations to play

---

## Next Steps

1. Review this design with stakeholders
2. Create implementation tasks (TASK-801, TASK-802, etc.)
3. Start with Phase 1 (backend GamePlan)
4. Iterate based on testing feedback
