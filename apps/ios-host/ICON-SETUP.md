# iOS App Icon Setup

## Current Status

The Tripto icon has been integrated into the iOS Host app:

- **Master icon**: `/Users/oskar/pa-sparet-party/img/icon.png` (1024x1024)
- **Location**: `apps/ios-host/Sources/PaSparetHost/Assets.xcassets/AppIcon.appiconset/`
- **Current**: Only 1024x1024 version included (Icon-1024.png)

## iOS Icon Size Requirements

iOS requires multiple icon sizes for different contexts:

| Size (px) | Usage |
|-----------|-------|
| 1024x1024 | App Store |
| 180x180   | iPhone @3x |
| 167x167   | iPad Pro @2x |
| 152x152   | iPad @2x |
| 120x120   | iPhone @2x |
| 87x87     | iPhone @3x Settings |
| 80x80     | iPad @2x Settings |
| 76x76     | iPad @1x |
| 60x60     | iPhone @1x |
| 58x58     | iPad @2x Settings |
| 40x40     | iPad @1x Spotlight |
| 29x29     | Settings @1x |
| 20x20     | Notifications @1x |

## Generating All Sizes

### Option 1: Using `sips` (macOS built-in)

```bash
cd /Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/Assets.xcassets/AppIcon.appiconset

# Generate all required sizes
for size in 20 29 40 58 60 76 80 87 120 152 167 180; do
  sips -z $size $size Icon-1024.png --out Icon-${size}.png
done
```

### Option 2: Using Xcode (Automatic)

Xcode 14+ can automatically generate all sizes from the 1024x1024 image:

1. Open `PaSparetHost.xcodeproj` in Xcode
2. Select `Assets.xcassets` in Project Navigator
3. Select `AppIcon`
4. Xcode will show a warning about missing sizes
5. Click "Generate All Sizes" if prompted

### Option 3: Online Tools

- https://appicon.co
- https://makeappicon.com
- Upload `Icon-1024.png` and download the complete set

## Updating Contents.json

After generating all sizes, update `Contents.json` to reference all files:

```json
{
  "images": [
    { "filename": "Icon-20.png", "idiom": "iphone", "scale": "1x", "size": "20x20" },
    { "filename": "Icon-40.png", "idiom": "iphone", "scale": "2x", "size": "20x20" },
    { "filename": "Icon-60.png", "idiom": "iphone", "scale": "3x", "size": "20x20" },
    ...
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

## Current Workaround

For now, Xcode will use the 1024x1024 image and may display warnings. The app will build and run correctly, but for production release, all sizes should be generated.
