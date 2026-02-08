# Content Pack Integration Test Plan

## Setup

1. Start backend server:
   ```bash
   npm run dev
   ```

2. Content pack directory:
   - Default: `/tmp/pa-sparet-content-packs`
   - Override: `CONTENT_PACKS_DIR=/path/to/dir`

3. Example content pack already copied:
   ```bash
   ls /tmp/pa-sparet-content-packs/
   # Should show: example-stockholm-001.json
   ```

## Test Cases

### 1. List Content Packs

```bash
curl http://localhost:3001/v1/content/packs
```

**Expected:**
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

### 2. Get Specific Content Pack

```bash
curl http://localhost:3001/v1/content/packs/example-stockholm-001
```

**Expected:**
```json
{
  "id": "example-stockholm-001",
  "destination": {
    "name": "Stockholm",
    "country": "Sverige"
  },
  "clueCount": 5,
  "followupCount": 2,
  "metadata": { ... },
  "clues": [ ... ],
  "followups": [ ... ]
}
```

### 3. Get Non-Existent Pack (Error Case)

```bash
curl http://localhost:3001/v1/content/packs/non-existent
```

**Expected:**
```json
{
  "error": "Not found",
  "message": "Content pack not found: non-existent"
}
```

### 4. WebSocket Flow: Select Content Pack

**Setup:**
1. Create session:
   ```bash
   curl -X POST http://localhost:3001/v1/sessions
   ```

2. Save `sessionId`, `hostAuthToken`, `wsUrl`

3. Connect WebSocket as host:
   ```javascript
   const ws = new WebSocket('ws://localhost:3001/ws?token=<hostAuthToken>');
   ```

4. Send HOST_SELECT_CONTENT_PACK:
   ```json
   {
     "type": "HOST_SELECT_CONTENT_PACK",
     "sessionId": "<sessionId>",
     "payload": {
       "contentPackId": "example-stockholm-001"
     }
   }
   ```

**Expected Response:**
- All clients receive `CONTENT_PACK_SELECTED` event:
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

### 5. Start Game with Content Pack

1. Select content pack (see Test 4)

2. Send HOST_START_GAME:
   ```json
   {
     "type": "HOST_START_GAME",
     "sessionId": "<sessionId>",
     "payload": {}
   }
   ```

**Expected:**
- Game starts with Stockholm destination
- First clue: "Här finns 14 öar sammanbundna av över 50 broar..."
- STATE_SNAPSHOT includes `contentPackId: "example-stockholm-001"`

### 6. Clear Content Pack Selection

Send HOST_SELECT_CONTENT_PACK with null:
```json
{
  "type": "HOST_SELECT_CONTENT_PACK",
  "sessionId": "<sessionId>",
  "payload": {
    "contentPackId": null
  }
}
```

**Expected:**
- Broadcast CONTENT_PACK_SELECTED with `contentPackId: null`
- Next game start will use hardcoded content

### 7. Backward Compatibility

Start game without selecting content pack:

1. Create new session
2. Send HOST_START_GAME immediately (no HOST_SELECT_CONTENT_PACK)

**Expected:**
- Game starts normally with random hardcoded destination (Paris/Tokyo/New York)
- STATE_SNAPSHOT has `contentPackId: null` or omitted

### 8. Content Generation Proxy (if ai-content service is running)

```bash
curl -X POST http://localhost:3001/v1/content/generate \
  -H "Content-Type: application/json" \
  -d '{"theme": "Swedish cities", "language": "sv"}'
```

**Expected:**
```json
{
  "generateId": "generated-round-id",
  "status": "generating",
  "roundId": "generated-round-id"
}
```

Check status:
```bash
curl http://localhost:3001/v1/content/generate/<generateId>/status
```

**Expected:**
```json
{
  "status": "completed",
  "currentStep": 5,
  "totalSteps": 5,
  "contentPackId": "generated-round-id"
}
```

## Error Cases

### A. Select Content Pack During Active Game

1. Start game (phase != LOBBY)
2. Try HOST_SELECT_CONTENT_PACK

**Expected:**
```json
{
  "type": "ERROR",
  "payload": {
    "errorCode": "INVALID_PHASE",
    "message": "Cannot select content pack during active game"
  }
}
```

### B. Non-Host Tries to Select

1. Connect as player
2. Send HOST_SELECT_CONTENT_PACK

**Expected:**
```json
{
  "type": "ERROR",
  "payload": {
    "errorCode": "UNAUTHORIZED",
    "message": "Only host can select content pack"
  }
}
```

### C. Invalid Content Pack ID

```json
{
  "type": "HOST_SELECT_CONTENT_PACK",
  "payload": {
    "contentPackId": "does-not-exist"
  }
}
```

**Expected:**
```json
{
  "type": "ERROR",
  "payload": {
    "errorCode": "INVALID_CONTENT_PACK",
    "message": "Content pack not found: does-not-exist"
  }
}
```

## Manual Testing with WebSocket Client

Use a tool like [wscat](https://github.com/websockets/wscat):

```bash
npm install -g wscat

# Create session first
SESSION_ID=$(curl -s -X POST http://localhost:3001/v1/sessions | jq -r '.sessionId')
HOST_TOKEN=$(curl -s -X POST http://localhost:3001/v1/sessions | jq -r '.hostAuthToken')

# Connect
wscat -c "ws://localhost:3001/ws?token=$HOST_TOKEN"

# After WELCOME + STATE_SNAPSHOT, send:
{"type":"HOST_SELECT_CONTENT_PACK","sessionId":"<sessionId>","payload":{"contentPackId":"example-stockholm-001"}}

# Then start game:
{"type":"HOST_START_GAME","sessionId":"<sessionId>","payload":{}}
```

## Success Criteria

- All REST endpoints return expected responses
- Content pack loader caches packs correctly
- WebSocket HOST_SELECT_CONTENT_PACK broadcasts to all clients
- Game starts with AI content when pack is selected
- Game falls back to hardcoded content when no pack selected
- Backward compatibility maintained (existing code works unchanged)
- No breaking changes in contracts
