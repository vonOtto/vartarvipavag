# Bonjour/mDNS Discovery Implementation for tvOS

## Overview
The tvOS app now supports automatic discovery of iOS Host sessions on the local network using Bonjour/mDNS. This allows users to join sessions without manually entering join codes.

## Implementation Details

### Files Modified/Created

1. **BonjourDiscovery.swift** (NEW)
   - `BonjourDiscovery` class: `ObservableObject` that manages service discovery
   - `DiscoveredSession` struct: Model for discovered sessions
   - Uses `NetServiceBrowser` and `NetServiceDelegate` for discovery
   - Publishes `@Published var discoveredSessions: [DiscoveredSession]`

2. **Info.plist** (MODIFIED)
   - Added `NSBonjourServices` with `_tripto._tcp.` service type
   - Added `NSLocalNetworkUsageDescription` for privacy compliance

3. **App.swift** (MODIFIED)
   - `LaunchView` now includes Bonjour discovery
   - Added `@StateObject private var bonjourDiscovery = BonjourDiscovery()`
   - New UI section showing discovered sessions
   - Added `joinDiscoveredSession()` function
   - Added `DiscoveredSessionRow` view component

## How It Works

### Discovery Flow

1. When `LaunchView` appears, `bonjourDiscovery.startDiscovery()` is called
2. `NetServiceBrowser` searches for `_tripto._tcp.` services on `local.` domain
3. When a service is found:
   - Service is resolved to extract TXT record data
   - TXT record contains:
     - `sessionId`: Unique session identifier
     - `destinations`: Number of destinations (optional)
   - Service name is used as the join code
4. Discovered sessions are added to the `discoveredSessions` array
5. UI updates automatically via SwiftUI `@Published` property

### Join Flow

When user selects a discovered session:
1. `joinDiscoveredSession()` is called with the session
2. Uses standard join flow:
   - Lookup session by join code via REST API
   - Join as TV via REST API
   - Connect via WebSocket
3. Same error handling as manual join code entry

### UI Layout

The updated `LaunchView` now shows:
1. **Create new game** (primary action button)
2. **Divider** ("eller")
3. **Discovered sessions** (if any are found on network)
   - Each session shows:
     - Antenna icon
     - Join code (uppercase, monospaced)
     - Destination count (if > 0)
     - Arrow icon (changes color on focus)
   - Focusable button with proper tvOS focus states
4. **Manual join code input** (fallback option)
5. **Join button** (for manual code)

## Service Type

The implementation uses the service type `_tripto._tcp.` which must match the iOS Host broadcast:

- Service type: `_tripto._tcp.`
- Domain: `local.`
- Service name: Join code (e.g., "ABC123")
- TXT record:
  - `sessionId`: Session UUID
  - `destinations`: Number of destinations (optional)

## Permissions

The app requires two Info.plist entries for Bonjour discovery:

```xml
<key>NSBonjourServices</key>
<array>
    <string>_tripto._tcp.</string>
</array>
<key>NSLocalNetworkUsageDescription</key>
<string>Tripto söker efter aktiva spelsessioner på lokalt nätverk</string>
```

## Lifecycle Management

- Discovery starts when `LaunchView` appears (`.onAppear`)
- Discovery stops when `LaunchView` disappears (`.onDisappear`)
- Prevents unnecessary network activity when not needed

## Error Handling

- Same error handling as manual join code flow
- Displays user-friendly error messages
- Falls back to manual join code entry if discovery fails
- Discovery failures are logged but don't block manual join

## Testing

To test the implementation:

1. Ensure iOS Host app is running and broadcasting via Bonjour
2. Launch tvOS app
3. Verify discovered sessions appear in "Sessioner i närheten" section
4. Select a session and verify auto-join works
5. Test fallback to manual join code entry

## Future Enhancements

Potential improvements:
- Show session metadata (player count, phase)
- Refresh button for manual re-scan
- Filter out sessions that are already full or ended
- Show signal strength or connection quality
