# Content Pack Integration

AI-generated content packs are now integrated with the backend state machine.

## Overview

The backend can now:
1. Load AI-generated content packs from disk
2. Use them instead of hardcoded destinations
3. Provide REST API for content management
4. Allow hosts to select content packs via WebSocket
5. Maintain backward compatibility with hardcoded content

## Architecture

### Components Created

1. **content-pack-loader.ts** - Loads and caches content packs from disk
2. **routes/content.ts** - REST API for content management
3. **WebSocket command** - HOST_SELECT_CONTENT_PACK
4. **State machine updates** - startNewDestination() function

### State Changes

Added to `GameState`:
```typescript
contentPackId?: string | null; // ID of active AI-generated content pack
```

## API Endpoints

### GET /v1/content/packs
Lists all available content packs.

**Response:**
```json
{
  "packs": [
    {
      "id": "example-stockholm-001",
      "available": true
    }
  ],
  "count": 1
}
```

### GET /v1/content/packs/:id
Gets a specific content pack for preview.

**Response:**
```json
{
  "id": "example-stockholm-001",
  "destination": {
    "name": "Stockholm",
    "country": "Sverige"
  },
  "clueCount": 5,
  "followupCount": 2,
  "metadata": {
    "generatedAt": "2025-02-07T00:00:00.000Z",
    "verified": true,
    "antiLeakChecked": true
  },
  "clues": [...],
  "followups": [...]
}
```

### POST /v1/content/generate
Starts content generation via ai-content service.

**Request:**
```json
{
  "theme": "Swedish cities",
  "language": "sv"
}
```

**Response:**
```json
{
  "generateId": "generated-round-id",
  "status": "generating",
  "roundId": "generated-round-id"
}
```

### GET /v1/content/generate/:id/status
Polls content generation status.

**Response:**
```json
{
  "status": "completed",
  "currentStep": 5,
  "totalSteps": 5,
  "contentPackId": "generated-round-id"
}
```

## WebSocket Commands

### HOST_SELECT_CONTENT_PACK

Host selects which content pack to use for the next destination.

**Client → Server:**
```json
{
  "type": "HOST_SELECT_CONTENT_PACK",
  "sessionId": "<sessionId>",
  "payload": {
    "contentPackId": "example-stockholm-001"
  }
}
```

**Server → All Clients:**
```json
{
  "type": "CONTENT_PACK_SELECTED",
  "sessionId": "<sessionId>",
  "serverTimeMs": 1234567890,
  "payload": {
    "contentPackId": "example-stockholm-001",
    "destinationName": "Stockholm"
  }
}
```

**To clear selection:**
```json
{
  "type": "HOST_SELECT_CONTENT_PACK",
  "payload": {
    "contentPackId": null
  }
}
```

## Content Pack Format

Content packs must follow this structure:

```json
{
  "roundId": "unique-id",
  "destination": {
    "name": "Stockholm",
    "country": "Sverige",
    "aliases": ["stockholm", "sthlm"]
  },
  "clues": [
    {
      "level": 10,
      "text": "Clue text..."
    },
    // ... levels 8, 6, 4, 2
  ],
  "followups": [
    {
      "questionText": "Question?",
      "options": ["A", "B", "C", "D"],  // or null for open-text
      "correctAnswer": "B",
      "aliases": ["b", "alternative"]  // optional
    }
  ],
  "metadata": {
    "generatedAt": "2025-02-07T00:00:00.000Z",
    "verified": true,
    "antiLeakChecked": true
  }
}
```

## Storage

Content packs are stored on disk as JSON files:

- **Default directory:** `/tmp/pa-sparet-content-packs/`
- **Environment variable:** `CONTENT_PACKS_DIR=/path/to/dir`
- **File naming:** `{roundId}.json`

Example:
```
/tmp/pa-sparet-content-packs/
  example-stockholm-001.json
  generated-paris-002.json
```

## Game Flow

### With Content Pack

1. Host creates session
2. Host selects content pack via `HOST_SELECT_CONTENT_PACK`
3. Session state updated: `contentPackId = "example-stockholm-001"`
4. Host starts game via `HOST_START_GAME`
5. Backend loads content pack from disk
6. Game proceeds with AI-generated content

### Without Content Pack (Backward Compatible)

1. Host creates session
2. Host starts game via `HOST_START_GAME` (no selection)
3. Backend uses random hardcoded destination
4. Game proceeds normally

## State Machine Changes

### New Function: startNewDestination()

```typescript
export function startNewDestination(
  session: Session,
  contentPackId?: string
): {
  destination: Destination;
  clueText: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  clueIndex: number;
}
```

- If `contentPackId` provided: loads from content pack
- If not provided or load fails: falls back to hardcoded content
- Updates `session.state.contentPackId`

### Updated Function: startGame()

```typescript
export function startGame(session: Session): { ... }
```

- Now calls `startNewDestination(session, session.state.contentPackId)`
- Maintains backward compatibility
- Uses contentPackId from session state if set by HOST_SELECT_CONTENT_PACK

## Content Pack Loader

### Loading & Caching

```typescript
import { loadContentPack } from './game/content-pack-loader';

const pack = loadContentPack('example-stockholm-001');
// First call: loads from disk
// Subsequent calls: returns cached version
```

### Validation

The loader validates:
- File exists
- Valid JSON
- roundId matches filename
- Exactly 5 clues with levels [10, 8, 6, 4, 2]
- All required fields present

### Error Handling

If loading fails:
- Logs error with details
- Throws error (caught by state machine)
- Falls back to hardcoded content

## Environment Variables

```bash
# Content pack storage directory
CONTENT_PACKS_DIR=/tmp/pa-sparet-content-packs

# AI content service URL (for generation proxy)
AI_CONTENT_SERVICE_URL=http://localhost:3002
```

## Testing

See `TEST-CONTENT-PACK-INTEGRATION.md` for detailed test cases.

**Quick test:**
```bash
# 1. Copy example pack
mkdir -p /tmp/pa-sparet-content-packs
cp services/ai-content/test-packs/example-stockholm.json \
   /tmp/pa-sparet-content-packs/example-stockholm-001.json

# 2. Start server
npm run dev

# 3. List packs
curl http://localhost:3001/v1/content/packs

# 4. Get pack details
curl http://localhost:3001/v1/content/packs/example-stockholm-001
```

## Contracts Compliance

- No breaking changes to `contracts/state.schema.json`
- New field `contentPackId` is optional
- Backward compatible with existing clients
- Follows projections.md rules (HOST sees all, TV/PLAYER projected)

## Future Enhancements

- [ ] Multi-round support (select different packs per round)
- [ ] Content pack preview in lobby
- [ ] Hot-reload content packs (clear cache endpoint)
- [ ] Content pack validation API
- [ ] Pack metadata search/filter
- [ ] Auto-generate packs on session create
