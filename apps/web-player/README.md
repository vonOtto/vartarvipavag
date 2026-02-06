# Tripto Web Player (PWA)

PWA player client for Tripto — Big world. Small couch.

## Overview

Mobile-first web application that allows players to join a game session via QR code or join link, participate in lobby, view clues in realtime, and see reveal/scoreboard.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **WebSocket:** Native WebSocket API
- **Storage:** localStorage for session persistence
- **Styling:** CSS (mobile-first, responsive)

## Features

- ✅ Join game via QR code or join link
- ✅ Session persistence (survives page refresh)
- ✅ Realtime lobby updates
- ✅ Realtime clue display
- ✅ Destination reveal and scoreboard
- ✅ WebSocket reconnection with RESUME_SESSION
- ✅ Error handling and user feedback
- ✅ Mobile-optimized UI

## Project Structure

```
apps/web-player/
├── src/
│   ├── App.tsx              # Main app with routing
│   ├── pages/
│   │   ├── JoinPage.tsx     # /join/:joinCode
│   │   ├── LobbyPage.tsx    # /lobby
│   │   ├── GamePage.tsx     # /game
│   │   └── RevealPage.tsx   # /reveal
│   ├── hooks/
│   │   └── useWebSocket.ts  # WebSocket connection hook
│   ├── services/
│   │   ├── api.ts           # REST API client
│   │   └── storage.ts       # localStorage helpers
│   ├── types/
│   │   └── game.ts          # TypeScript types from contracts
│   └── components/
│       ├── PlayerList.tsx   # Player list component
│       └── ClueDisplay.tsx  # Clue display component
├── public/
│   └── manifest.json        # PWA manifest
└── README.md               # This file
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Backend server running on configured API_BASE_URL

### Installation

```bash
cd apps/web-player
npm install
```

### Environment Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_API_BASE_URL=http://10.90.0.95:3000
```

**Important:** Use the LAN IP address of the backend server (not localhost) for mobile device access.

## Development

### Start Dev Server

```bash
npm run dev
```

Application runs on http://localhost:5173

### Access from Mobile Device

1. Ensure your mobile device is on the same network as the development machine
2. Find your machine's LAN IP (e.g., `10.90.0.95`)
3. Access: `http://10.90.0.95:5173`
4. Or use backend-generated QR code which includes the full join URL

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### 1. Join Flow

**URL Pattern:** `/join/:joinCode`

**Flow:**
1. Player scans QR code or clicks join link
2. App validates session exists via `GET /v1/sessions/by-code/:joinCode`
3. Player enters their name
4. App calls `POST /v1/sessions/:id/join` with name
5. Session data (playerId, token, wsUrl) saved to localStorage
6. Navigate to lobby

**Example URL:**
```
http://10.90.0.95:5173/join/ABC123
```

### 2. Lobby

**Route:** `/lobby`

**Features:**
- Shows list of players with connection status
- Displays "Waiting for host to start game..." message
- Listens for `LOBBY_UPDATED` events
- Auto-navigates to `/game` when phase changes to `CLUE_LEVEL`

**WebSocket Events:**
- `WELCOME` - Connection confirmed
- `STATE_SNAPSHOT` - Full game state
- `LOBBY_UPDATED` - Player list updated

### 3. Game

**Route:** `/game`

**Features:**
- Displays current clue level (10/8/6/4/2 points)
- Shows clue text
- Status indicator: "Waiting for next clue..."
- Auto-navigates to `/reveal` when phase changes to `REVEAL_DESTINATION`

**WebSocket Events:**
- `CLUE_PRESENT` - New clue received
- `STATE_SNAPSHOT` - State updates

### 4. Reveal

**Route:** `/reveal`

**Features:**
- Shows destination name and country
- Displays scoreboard with player rankings
- "Game complete!" message

**WebSocket Events:**
- `DESTINATION_REVEAL` - Destination revealed
- `SCOREBOARD_UPDATE` - Rankings updated

## WebSocket Connection

### Connection URL

```
ws://10.90.0.95:3000/ws?token=<playerAuthToken>
```

Token is obtained from join response and stored in localStorage.

### Reconnection Strategy

- Automatic reconnection on disconnect
- Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Sends `RESUME_SESSION` event on reconnect with playerId
- Receives `STATE_SNAPSHOT` to sync state

### Event Handling

All WebSocket messages are JSON with structure:
```typescript
{
  type: string;
  sessionId: string;
  serverTimeMs: number;
  payload: any;
}
```

**Handled events:**
- `WELCOME` - Initial connection confirmation
- `STATE_SNAPSHOT` - Full game state
- `LOBBY_UPDATED` - Lobby player list update
- `CLUE_PRESENT` - New clue
- `DESTINATION_REVEAL` - Destination revealed
- `SCOREBOARD_UPDATE` - Rankings updated
- `ERROR` - Error message

## Session Persistence

### localStorage Schema

```typescript
{
  playerId: string;
  playerAuthToken: string;
  wsUrl: string;
  sessionId: string;
  joinCode: string;
  playerName: string;
}
```

### Resume on Page Reload

1. Check if session exists in localStorage
2. If yes: connect to WebSocket with saved token
3. Send `RESUME_SESSION` event with playerId
4. Receive `STATE_SNAPSHOT` with current game state
5. Navigate to correct page based on phase

## API Integration

### REST Endpoints

**Lookup Session:**
```typescript
GET /v1/sessions/by-code/:joinCode
Response: { sessionId, joinCode, phase, playerCount }
```

**Join Session:**
```typescript
POST /v1/sessions/:id/join
Body: { name: string }
Response: { playerId, playerAuthToken, wsUrl }
```

### Base URL Configuration

Set via environment variable:
```
VITE_API_BASE_URL=http://10.90.0.95:3000
```

Used in `src/services/api.ts`.

## Testing

### Manual Testing

See `docs/web-player-smoke-test.md` for step-by-step testing guide.

**Quick test:**
1. Start backend: `cd services/backend && npm run dev`
2. Start web player: `cd apps/web-player && npm run dev`
3. Create session: `curl -X POST http://localhost:3000/v1/sessions`
4. Open join URL: `http://localhost:5173/join/ABC123`
5. Enter name and join
6. Verify lobby appears
7. Use backend test script to start game
8. Verify clues appear

### Testing on Mobile Devices

1. Ensure backend and web player are running
2. Find your machine's LAN IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
3. Update `.env` with LAN IP
4. On mobile browser: visit `http://<YOUR_IP>:5173/join/ABC123`
5. Test full game flow

## Troubleshooting

### WebSocket Connection Fails

- Check backend is running
- Verify `VITE_API_BASE_URL` uses correct IP
- Check firewall allows connections on port 3000
- Verify mobile device is on same network

### Session Not Persisting

- Check browser localStorage is enabled
- Clear localStorage: `localStorage.clear()` in console
- Verify no browser privacy settings blocking localStorage

### Page Doesn't Update

- Check WebSocket connection status in console
- Verify backend is sending events
- Check browser console for errors

### Mobile Device Can't Connect

- Use LAN IP (e.g., 10.90.0.95) not localhost
- Ensure both devices on same Wi-Fi network
- Check router allows device-to-device communication
- Try accessing backend health: `http://10.90.0.95:3000/health`

## Development Notes

### Hot Module Replacement (HMR)

Vite provides fast HMR. Changes to components reflect immediately without full page reload.

### TypeScript

Strict mode enabled. All types defined in `src/types/game.ts` based on contracts.

### Code Organization

- **Pages:** Route-level components
- **Components:** Reusable UI components
- **Hooks:** Custom React hooks (useWebSocket)
- **Services:** API and storage logic
- **Types:** TypeScript type definitions

## Deployment

### Build

```bash
npm run build
```

### Deploy to Static Hosting

Build output in `dist/` can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables

Set `VITE_API_BASE_URL` to production backend URL before building.

## PWA Support

Basic PWA configuration in `public/manifest.json`.

**Features:**
- Installable on mobile devices
- Standalone display mode
- App icon and splash screen

**To enable offline support:**
- Add service worker in `vite.config.ts`
- Use vite-plugin-pwa or workbox

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 12+
- Android Chrome 80+

## Performance

- Lazy loading for routes
- Minimal bundle size (~150KB gzipped)
- Fast initial load (<1s on good connection)
- Efficient WebSocket reconnection

## Security

- No secrets in client-side code
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- WebSocket token sent via query param (consider upgrading to header for production)
- No inline scripts (CSP compatible)

## Future Enhancements

- Service worker for offline support
- Push notifications for game events
- Improved animations and transitions
- Sound effects
- Haptic feedback on mobile
- Dark mode
- Accessibility improvements (ARIA labels, keyboard navigation)

## License

Part of På Spåret Party Edition project.

---

**Version:** Sprint 1.0
**Last Updated:** 2026-02-03
**Status:** ✅ Functional
