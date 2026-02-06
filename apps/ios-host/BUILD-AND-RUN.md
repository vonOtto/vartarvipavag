# iOS Host App - Build and Run Instructions

## Project Structure

The iOS Host app now has a proper Xcode project setup:

- **Project**: `PaSparetHost.xcodeproj`
- **Bundle ID**: `com.pasparet.host`
- **Deployment Target**: iOS 16.0+
- **Supported Devices**: iPhone and iPad (Universal)

## Files Created

1. `PaSparetHost.xcodeproj/project.pbxproj` - Main Xcode project file
2. `PaSparetHost.xcodeproj/xcshareddata/xcschemes/PaSparetHost.xcscheme` - Build scheme
3. `Sources/PaSparetHost/Info.plist` - App metadata and bundle configuration

## Building from Command Line

```bash
# Build for simulator
xcodebuild -scheme PaSparetHost -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build

# Run on simulator
xcodebuild -scheme PaSparetHost -destination 'platform=iOS Simulator,name=iPhone 16 Pro' run
```

## Building from Xcode

1. Open `PaSparetHost.xcodeproj` in Xcode
2. Select the `PaSparetHost` scheme
3. Choose an iOS simulator or device
4. Press Cmd+R to build and run

## Testing on Simulator

```bash
# Boot simulator
xcrun simctl boot "iPhone 16 Pro"

# Install app
xcrun simctl install "iPhone 16 Pro" ./path/to/PaSparetHost.app

# Launch app
xcrun simctl launch "iPhone 16 Pro" com.pasparet.host
```

## Verifying Bundle ID Fix

The app now runs without the bundle ID error:
```
failure in void __BKSHIDEvent__BUNDLE_IDENTIFIER_FOR_CURRENT_PROCESS_IS_NIL__
missing bundleID for main bundle
```

This was fixed by:
1. Creating a proper Xcode project (not just SPM Package.swift)
2. Adding Info.plist with CFBundleIdentifier
3. Configuring proper iOS app target with bundle settings

## Source Files Included

- `App.swift` - Main app entry point and view routing
- `HostAPI.swift` - REST API client for session management
- `HostModels.swift` - Data models for host app
- `HostState.swift` - ObservableObject for app state management
- `QRCodeView.swift` - QR code display component

## Next Steps for TASK-601 E2E Testing

The iOS Host app can now be used for E2E testing alongside:
- tvOS app (`/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV.xcodeproj`)
- Web player (browser/PWA)
- Backend service

All apps now have proper bundle IDs and can run on simulators without errors.
