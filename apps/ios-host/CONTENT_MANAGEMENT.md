# Content Pack Management — iOS Host App

## Overview

Full implementation of content pack management UI for the iOS Host app. This allows the host to:
- Browse available content packs from the backend
- Generate new content packs via AI
- Preview content pack details (destination, clues, followup questions)
- Select a content pack for the current session
- Delete unused content packs

## Files Created

### Models
- **ContentPackModels.swift** — Data models for content packs and generation status
  - `ContentPackInfo` — Metadata for library listing
  - `ContentPack` — Full pack details with destination, clues, and followup questions
  - `GenerateResponse` — Response from generation initiation
  - `GenerationStatus` — Status polling response with progress tracking

### API Client
- **ContentAPI.swift** — REST client for content endpoints
  - `listContentPacks()` — GET /v1/content/packs
  - `getContentPack(id:)` — GET /v1/content/packs/:id
  - `deleteContentPack(id:)` — DELETE /v1/content/packs/:id
  - `generateContent()` — POST /v1/content/generate
  - `getGenerationStatus(id:)` — GET /v1/content/generate/:id/status

### Views
- **Views/Content/ContentLibraryView.swift** — Main content library screen
  - Lists all available content packs
  - Shows selected pack with visual indicator
  - Pull-to-refresh support
  - Empty state with call-to-action
  - Navigate to detail or generate views

- **Views/Content/ContentPackDetailView.swift** — Content pack preview screen
  - Full destination info (name, country)
  - All 5 clues with point values
  - All followup questions with correct answers
  - Metadata (verified, anti-leak status, generation date)
  - "Use this pack" button → sends HOST_SELECT_CONTENT_PACK
  - Delete button with confirmation

- **Views/Content/GenerateContentView.swift** — AI generation flow
  - Initial view with feature list and cost estimate
  - Live progress tracking (0-100%)
  - 5-step progress indicator:
    1. Väljer destination
    2. Genererar ledtrådar
    3. Verifierar fakta
    4. Skapar följdfrågor
    5. Anti-leak kontroll
  - Polls backend every 2 seconds
  - Automatic dismissal on completion
  - Error handling with retry option

## Files Updated

### HostState.swift
Added content pack selection support:
```swift
@Published var selectedContentPackId: String?

func selectContentPack(_ packId: String?) {
    // Sends HOST_SELECT_CONTENT_PACK event
}
```

Event handling for:
- `CONTENT_PACK_SELECTED` — Updates selectedContentPackId

### App.swift
Enhanced LobbyHostView with TabView:
- **Tab 1: Lobby** — Existing QR code + player list + start game
- **Tab 2: Innehåll** — New content library (ContentLibraryView)

Tabs are accessible during lobby phase only.

## UI/UX Features

### Design System Integration
- Uses existing DesignSystem.swift (colors, fonts, layout)
- Consistent with tvOS and player UI
- Tripto design guide compliant
- Haptic feedback on iOS actions
- Smooth animations and transitions

### Visual Indicators
- **Selected Pack**: Orange border + checkmark icon
- **Verified Badge**: Green seal icon
- **Anti-leak Badge**: Blue shield icon
- **Progress Bar**: Animated mint-to-red gradient
- **Status Steps**: Circle indicators with checkmarks

### Error Handling
- Network errors shown with retry option
- Generation failures displayed with error message
- Delete confirmation alert
- Loading states with spinners

## Navigation Flow

```
LobbyHostView (TabView)
  |
  +-- [Lobby Tab]
  |     |
  |     +-- QR Code + Join Code
  |     +-- Player List
  |     +-- Start Game Button
  |
  +-- [Innehåll Tab]
        |
        +-- ContentLibraryView
              |
              +-- [Tap Pack] → ContentPackDetailView
              |                  |
              |                  +-- "Använd" → selectContentPack()
              |                  +-- "Ta bort" → DELETE pack
              |
              +-- [+ Button] → GenerateContentView (Sheet)
                                   |
                                   +-- Start Generation
                                   +-- Poll Status (2s interval)
                                   +-- Show Progress
                                   +-- Dismiss on Complete
```

## Backend Integration

### REST Endpoints Used
- `GET /v1/content/packs` → List all packs
- `GET /v1/content/packs/:id` → Get pack details
- `DELETE /v1/content/packs/:id` → Delete pack
- `POST /v1/content/generate` → Start generation
- `GET /v1/content/generate/:id/status` → Poll status

### WebSocket Events
- **Sent**: `HOST_SELECT_CONTENT_PACK`
  ```json
  {
    "type": "HOST_SELECT_CONTENT_PACK",
    "sessionId": "...",
    "payload": {
      "contentPackId": "round-uuid" | null
    }
  }
  ```

- **Received**: `CONTENT_PACK_SELECTED`
  ```json
  {
    "type": "CONTENT_PACK_SELECTED",
    "payload": {
      "contentPackId": "round-uuid" | null
    }
  }
  ```

## Testing Instructions

### 1. Backend Setup
Ensure backend is running with content endpoints:
```bash
cd services/backend
npm run dev
```

### 2. Environment Variable
Set BASE_URL if testing on device:
```
Edit Scheme → Run → Environment Variables
BASE_URL = http://192.168.1.x:3000
```

### 3. Manual Test Flow

#### A. Generate Content Pack
1. Launch iOS Host app
2. Create session
3. Navigate to "Innehåll" tab
4. Tap "+" button (top-right)
5. Tap "Starta generering"
6. Observe progress (should take 30-60s)
7. Verify automatic return to library
8. Confirm new pack appears with "NYT" badge (optional)

#### B. Browse Library
1. Pull to refresh
2. Verify pack list loads
3. Tap a pack row
4. Verify detail view shows:
   - Destination name + country
   - All 5 clues with points
   - All followup questions
   - Metadata badges

#### C. Select Pack
1. In detail view, tap "Använd detta pack"
2. Return to library
3. Verify selected pack has:
   - Orange border
   - Checkmark icon
   - Visual highlight

#### D. Delete Pack
1. In detail view, tap trash icon
2. Confirm deletion
3. Verify pack removed from library

#### E. Session Integration
1. Select a pack
2. Return to Lobby tab
3. Start game
4. Verify clues match selected pack

### 4. Mock Testing (Development)
If backend not ready:
```swift
// In ContentAPI.swift, add mock responses:
static func listContentPacks() async throws -> [ContentPackInfo] {
    try? await Task.sleep(nanoseconds: 500_000_000)
    return [
        ContentPackInfo(
            roundId: "mock-1",
            destinationName: "Paris",
            destinationCountry: "France",
            generatedAt: ISO8601DateFormatter().string(from: Date()),
            verified: true,
            antiLeakChecked: true
        )
    ]
}
```

## Cost Estimates (Displayed to User)

- **Single Pack Generation**: ~$0.05
  - Anthropic API (destination + clues + followup + verify)
  - ElevenLabs TTS (5 clues + 3 questions)

- **Total Metrics** (optional feature):
  - Track total packs generated
  - Cumulative cost display
  - Can be added to settings/admin view

## Platform Support

- **iOS 14+**: Full support with TabView
- **iPadOS 14+**: Side-by-side detail view
- **macOS**: Build compiles (all iOS-specific modifiers wrapped in #if os(iOS))

## Security

- API keys required:
  - `ANTHROPIC_API_KEY` — For AI generation
  - `ELEVENLABS_API_KEY` — For TTS

- Error handling:
  - Missing API key → User-friendly warning
  - Network failures → Retry option
  - Rate limiting → Graceful degradation

## Future Enhancements

1. **Pack Reordering**: Drag-to-reorder favorite packs
2. **Search/Filter**: Filter by country, verified status
3. **Import/Export**: Share packs between sessions
4. **Preview Play**: Audio preview of TTS
5. **Custom Generation**: User-specified destination/region
6. **Usage Stats**: Track most-played packs
7. **Favorites**: Star frequently used packs

## Related Documentation

- `contracts/` — Event schemas (HOST_SELECT_CONTENT_PACK)
- `services/backend/` — REST API implementation
- `services/ai-content/` — AI generation pipeline
- `docs/sprint-1.md` — Original task breakdown
