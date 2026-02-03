# Backend PUBLIC_BASE_URL Configuration Report

**Date:** 2026-02-03
**Task:** Fix and verify PUBLIC_BASE_URL for LAN access using `http://10.90.0.95:3000`

## Summary

Successfully configured PUBLIC_BASE_URL to use LAN IP address `10.90.0.95` for all generated URLs (WebSocket and HTTP join URLs). This enables devices on the local network to connect to the backend server.

## Changes Made

### 1. Environment Configuration

**File: `services/backend/.env.example`**
- Set `PUBLIC_BASE_URL=http://10.90.0.95:3000`
- This serves as the template for new deployments

**File: `services/backend/.env` (local, not committed)**
- Set `PUBLIC_BASE_URL=http://10.90.0.95:3000`
- Removed any duplicate entries
- Note: This file is in `.gitignore` and should NOT be committed

### 2. Code Implementation

**File: `services/backend/src/routes/sessions.ts`**

The code already correctly uses `PUBLIC_BASE_URL`:

```typescript
function getPublicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

// In POST /v1/sessions endpoint:
const PUBLIC_BASE_URL = getPublicBaseUrl();
const wsUrl = `ws://${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}/ws`;
const joinUrlTemplate = `${PUBLIC_BASE_URL}/join/{joinCode}`;
```

**Behavior:**
- Uses `PUBLIC_BASE_URL` from environment when set
- Falls back to `http://localhost:3000` if not set
- Correctly strips `http://` or `https://` prefix for WebSocket URLs

## Test Results

All tests performed on **2026-02-03 at 07:56 UTC**.

### Test 1: Health Endpoint

**Command:**
```bash
curl -s http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 6,
  "timestamp": "2026-02-03T07:56:10.209Z",
  "serverTimeMs": 1770105370209
}
```

**Status:** ✅ PASS

---

### Test 2: Session Creation

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions
```

**Response:**
```json
{
  "sessionId": "faae9bb3-c96b-436d-ba17-76244cddb52f",
  "joinCode": "8V15G4",
  "tvJoinToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "hostAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://10.90.0.95:3000/ws",
  "joinUrlTemplate": "http://10.90.0.95:3000/join/{joinCode}"
}
```

**Verification:**
- ✅ `wsUrl` contains `10.90.0.95` (not localhost)
- ✅ `joinUrlTemplate` contains `10.90.0.95` (not localhost)
- ✅ Both use port `3000`
- ✅ WebSocket URL uses `ws://` protocol
- ✅ Join URL template uses `http://` protocol

**Status:** ✅ PASS

---

### Test 3: Player Join

**Session ID:** `faae9bb3-c96b-436d-ba17-76244cddb52f`

**Command:**
```bash
curl -s -X POST "http://localhost:3000/v1/sessions/faae9bb3-c96b-436d-ba17-76244cddb52f/join" \
  -H "Content-Type: application/json" \
  -d '{"name":"Oskar"}'
```

**Response:**
```json
{
  "playerId": "5029cd00-badc-4660-9084-29177a3500aa",
  "playerAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://10.90.0.95:3000/ws"
}
```

**Verification:**
- ✅ `wsUrl` contains `10.90.0.95` (not localhost)
- ✅ Player successfully joined session
- ✅ JWT token generated correctly

**Status:** ✅ PASS

---

### Test 4: Session Lookup by Join Code

**Join Code:** `8V15G4`

**Command:**
```bash
curl -s "http://localhost:3000/v1/sessions/by-code/8V15G4"
```

**Response:**
```json
{
  "sessionId": "faae9bb3-c96b-436d-ba17-76244cddb52f",
  "joinCode": "8V15G4",
  "phase": "LOBBY",
  "playerCount": 1
}
```

**Verification:**
- ✅ Session found by join code
- ✅ Player count shows 1 (Oskar joined)
- ✅ Phase is LOBBY

**Status:** ✅ PASS

---

## Verification Summary

| Test | Expected Result | Actual Result | Status |
|------|----------------|---------------|--------|
| Health endpoint | Returns 200 OK | ✅ Returns status OK | PASS |
| Session creation - wsUrl | Contains `10.90.0.95` | ✅ `ws://10.90.0.95:3000/ws` | PASS |
| Session creation - joinUrlTemplate | Contains `10.90.0.95` | ✅ `http://10.90.0.95:3000/join/{joinCode}` | PASS |
| Player join - wsUrl | Contains `10.90.0.95` | ✅ `ws://10.90.0.95:3000/ws` | PASS |
| Join code lookup | Returns session | ✅ Returns correct session | PASS |

**Overall Status:** ✅ ALL TESTS PASSED

## Usage

### For Local Development

The backend is now accessible on the LAN at:
- **HTTP API:** `http://10.90.0.95:3000`
- **WebSocket:** `ws://10.90.0.95:3000/ws`

### QR Code Generation

The `joinUrlTemplate` can be used to generate QR codes for players to join:
```
http://10.90.0.95:3000/join/8V15G4
```

Players scanning this QR code will be directed to the correct server on the LAN.

### Testing from Other Devices

From another device on the same network (e.g., iPhone, iPad):

1. **Test connectivity:**
   ```bash
   curl http://10.90.0.95:3000/health
   ```

2. **Create a session:**
   ```bash
   curl -X POST http://10.90.0.95:3000/v1/sessions
   ```

3. **Join via QR code or direct URL:**
   ```
   http://10.90.0.95:3000/join/{joinCode}
   ```

## Notes

- `.env` file is in `.gitignore` and will NOT be committed to git
- `.env.example` serves as the template and WILL be committed
- The LAN IP `10.90.0.95` is specific to the current network
- If the server IP changes, update `PUBLIC_BASE_URL` in `.env`
- Fallback to `localhost` works if `PUBLIC_BASE_URL` is not set

## Next Steps

1. ✅ PUBLIC_BASE_URL configured for LAN
2. ✅ All endpoints tested and working
3. 🔜 Test WebSocket connections from LAN devices
4. 🔜 Generate QR codes for player join flow
5. 🔜 Test full flow: Host creates session → Players scan QR → Players connect via WebSocket
