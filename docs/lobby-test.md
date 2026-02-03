# LOBBY_UPDATED Event - Test Plan

## Overview

This document describes how to test the LOBBY_UPDATED event broadcasting feature, which keeps all connected clients synchronized with the lobby state.

## Test Scenarios

### Scenario 1: Host Creates Session and Connects

**Steps:**
1. Host creates session via `POST /v1/sessions`
2. Host connects via WebSocket using `hostAuthToken`

**Expected Events (Host receives):**
1. `WELCOME` - Connection confirmed
   ```json
   {
     "type": "WELCOME",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "connectionId": "...",
       "role": "HOST",
       "playerId": "..."
     }
   }
   ```

2. `STATE_SNAPSHOT` - Initial lobby state
   ```json
   {
     "type": "STATE_SNAPSHOT",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "state": {
         "phase": "LOBBY",
         "players": [
           {
             "playerId": "...",
             "name": "Host",
             "role": "host",
             "isConnected": true,
             "score": 0
           }
         ],
         "joinCode": "ABCD"
       }
     }
   }
   ```

**Note:** No LOBBY_UPDATED is sent to the host since they are the only connected client.

---

### Scenario 2: Player 1 Joins via REST

**Steps:**
1. Player 1 joins via `POST /v1/sessions/:id/join` with `{ "name": "Alice" }`

**Expected Events:**

**Host receives:**
1. `LOBBY_UPDATED` - New player added
   ```json
   {
     "type": "LOBBY_UPDATED",
     "sessionId": "...",
     "serverTimeMs": 1234567891,
     "payload": {
       "players": [
         {
           "playerId": "...",
           "name": "Host",
           "isConnected": true
         },
         {
           "playerId": "...",
           "name": "Alice",
           "isConnected": false
         }
       ],
       "joinCode": "ABCD"
     }
   }
   ```

**Player 1 receives:** Nothing yet (not connected to WebSocket)

**Response to REST API:**
```json
{
  "playerId": "...",
  "playerAuthToken": "...",
  "wsUrl": "ws://localhost:3000/ws"
}
```

---

### Scenario 3: Player 1 Connects via WebSocket

**Steps:**
1. Player 1 connects to WebSocket using `playerAuthToken` from previous step

**Expected Events:**

**Player 1 receives:**
1. `WELCOME`
   ```json
   {
     "type": "WELCOME",
     "sessionId": "...",
     "serverTimeMs": 1234567892,
     "payload": {
       "connectionId": "...",
       "role": "PLAYER",
       "playerId": "..."
     }
   }
   ```

2. `STATE_SNAPSHOT`
   ```json
   {
     "type": "STATE_SNAPSHOT",
     "sessionId": "...",
     "serverTimeMs": 1234567892,
     "payload": {
       "state": {
         "phase": "LOBBY",
         "players": [
           {
             "playerId": "...",
             "name": "Host",
             "role": "host",
             "isConnected": true,
             "score": 0
           },
           {
             "playerId": "...",
             "name": "Alice",
             "role": "player",
             "isConnected": true,
             "score": 0
           }
         ]
       }
     }
   }
   ```

**Host receives:**
1. `LOBBY_UPDATED` - Player 1 is now connected
   ```json
   {
     "type": "LOBBY_UPDATED",
     "sessionId": "...",
     "serverTimeMs": 1234567892,
     "payload": {
       "players": [
         {
           "playerId": "...",
           "name": "Host",
           "isConnected": true
         },
         {
           "playerId": "...",
           "name": "Alice",
           "isConnected": true
         }
       ],
       "joinCode": "ABCD"
     }
   }
   ```

---

### Scenario 4: Player 2 Joins and Connects

**Steps:**
1. Player 2 joins via `POST /v1/sessions/:id/join` with `{ "name": "Bob" }`

**Expected Events:**

**Host and Player 1 receive:**
1. `LOBBY_UPDATED`
   ```json
   {
     "type": "LOBBY_UPDATED",
     "sessionId": "...",
     "serverTimeMs": 1234567893,
     "payload": {
       "players": [
         {
           "playerId": "...",
           "name": "Host",
           "isConnected": true
         },
         {
           "playerId": "...",
           "name": "Alice",
           "isConnected": true
         },
         {
           "playerId": "...",
           "name": "Bob",
           "isConnected": false
         }
       ],
       "joinCode": "ABCD"
     }
   }
   ```

**Steps (continued):**
2. Player 2 connects via WebSocket

**Expected Events:**

**Player 2 receives:**
1. `WELCOME`
2. `STATE_SNAPSHOT` (with all 3 players)

**Host and Player 1 receive:**
1. `LOBBY_UPDATED` (with Bob now `isConnected: true`)

---

### Scenario 5: Player 1 Disconnects

**Steps:**
1. Player 1 closes WebSocket connection

**Expected Events:**

**Host and Player 2 receive:**
1. `PLAYER_LEFT`
   ```json
   {
     "type": "PLAYER_LEFT",
     "sessionId": "...",
     "serverTimeMs": 1234567894,
     "payload": {
       "playerId": "...",
       "reason": "disconnect"
     }
   }
   ```

2. `LOBBY_UPDATED`
   ```json
   {
     "type": "LOBBY_UPDATED",
     "sessionId": "...",
     "serverTimeMs": 1234567894,
     "payload": {
       "players": [
         {
           "playerId": "...",
           "name": "Host",
           "isConnected": true
         },
         {
           "playerId": "...",
           "name": "Alice",
           "isConnected": false
         },
         {
           "playerId": "...",
           "name": "Bob",
           "isConnected": true
         }
       ],
       "joinCode": "ABCD"
     }
   }
   ```

---

### Scenario 6: Player 1 Reconnects

**Steps:**
1. Player 1 reconnects to WebSocket using same `playerAuthToken`

**Expected Events:**

**Player 1 receives:**
1. `WELCOME`
2. `STATE_SNAPSHOT`

**Host and Player 2 receive:**
1. `LOBBY_UPDATED` (with Alice now `isConnected: true`)

---

## Manual Testing Steps

### Prerequisites
- Backend server running on `http://localhost:3000`
- WebSocket testing tool (e.g., `wscat`, Postman, or browser console)

### Step-by-Step Test

1. **Create Session (Host)**
   ```bash
   curl -X POST http://localhost:3000/v1/sessions
   ```
   Save: `sessionId`, `joinCode`, `hostAuthToken`

2. **Connect Host via WebSocket**
   ```bash
   wscat -c "ws://localhost:3000/ws?token=<hostAuthToken>"
   ```
   Verify: Receive WELCOME and STATE_SNAPSHOT

3. **Player Joins (REST)**
   ```bash
   curl -X POST http://localhost:3000/v1/sessions/<sessionId>/join \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice"}'
   ```
   Save: `playerId`, `playerAuthToken`
   Verify: Host receives LOBBY_UPDATED with Alice (isConnected: false)

4. **Player Connects (WebSocket)**
   ```bash
   wscat -c "ws://localhost:3000/ws?token=<playerAuthToken>"
   ```
   Verify:
   - Player receives WELCOME and STATE_SNAPSHOT
   - Host receives LOBBY_UPDATED with Alice (isConnected: true)

5. **Second Player Joins and Connects**
   Repeat steps 3-4 with name "Bob"
   Verify: All connected clients receive LOBBY_UPDATED

6. **Player Disconnects**
   Close Player 1's WebSocket connection
   Verify: Remaining clients receive PLAYER_LEFT and LOBBY_UPDATED

7. **Player Reconnects**
   Reconnect Player 1 using same token
   Verify: All clients receive LOBBY_UPDATED

---

## Edge Cases to Test

### Edge Case 1: Multiple Connections from Same Player
**Setup:** Player connects twice with same token

**Expected Behavior:**
- First connection is replaced by second connection
- Only one player entry in players list
- isConnected remains true

### Edge Case 2: Broadcast When No One Connected
**Setup:** All players disconnect before broadcast

**Expected Behavior:**
- No error thrown
- Log warning: "Session has no connected clients"

### Edge Case 3: Connection Closes Before WELCOME Sent
**Setup:** Client connects and immediately disconnects

**Expected Behavior:**
- Connection removed
- No LOBBY_UPDATED broadcast (player never fully connected)

### Edge Case 4: Player Joins After Game Started
**Setup:** Session phase is not LOBBY

**Expected Behavior:**
- REST API returns 400 error
- No LOBBY_UPDATED sent

---

## Automated Test Script

You can use this Node.js script to test the flow:

```javascript
const WebSocket = require('ws');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLobbyUpdates() {
  // 1. Create session
  const { data: session } = await axios.post(`${BASE_URL}/v1/sessions`);
  console.log('Session created:', session.sessionId);

  // 2. Connect host
  const hostWs = new WebSocket(`ws://localhost:3000/ws?token=${session.hostAuthToken}`);
  hostWs.on('message', (data) => {
    console.log('Host received:', JSON.parse(data).type);
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Player joins
  const { data: player } = await axios.post(
    `${BASE_URL}/v1/sessions/${session.sessionId}/join`,
    { name: 'TestPlayer' }
  );
  console.log('Player joined:', player.playerId);

  await new Promise(resolve => setTimeout(resolve, 500));

  // 4. Player connects
  const playerWs = new WebSocket(`ws://localhost:3000/ws?token=${player.playerAuthToken}`);
  playerWs.on('message', (data) => {
    console.log('Player received:', JSON.parse(data).type);
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 5. Player disconnects
  playerWs.close();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Cleanup
  hostWs.close();
  console.log('Test completed');
}

testLobbyUpdates();
```

---

## Success Criteria

- [ ] LOBBY_UPDATED sent when player joins via REST
- [ ] LOBBY_UPDATED sent to other clients when player connects via WebSocket
- [ ] LOBBY_UPDATED sent to all clients when player disconnects
- [ ] isConnected flag updates correctly in all scenarios
- [ ] No LOBBY_UPDATED sent to the connecting client (they get STATE_SNAPSHOT)
- [ ] All connected clients receive the same event
- [ ] No secrets or sensitive data leaked in LOBBY phase
- [ ] Broadcast count logged correctly

---

**Version:** 1.0.0
**Last Updated:** 2026-02-03
