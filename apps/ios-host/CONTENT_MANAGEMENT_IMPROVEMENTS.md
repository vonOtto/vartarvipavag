# Content Management Improvements

## Overview

Enhanced the iOS Host app and backend with comprehensive content pack management features:
- Fixed content pack listing to show proper destination metadata
- Added manual content pack import from JSON files
- Added template export for creating custom content packs
- Improved content refresh after generation

## Changes Made

### Backend (services/backend)

#### 1. `/services/backend/src/routes/content.ts`

**New Endpoints:**

- **DELETE /v1/content/packs/:id** - Delete a content pack from disk
  - Returns 204 on success
  - Returns 404 if pack not found
  - Deletes the JSON file from `CONTENT_PACKS_DIR`

- **POST /v1/content/packs/import** - Import a content pack from JSON
  - Body: Complete ContentPack JSON structure
  - Validates: roundId, destination, clues (must be 5), followups
  - Returns 201 with `{roundId}` on success
  - Returns 409 if pack already exists
  - Returns 400 if validation fails

**Fixed Endpoints:**

- **GET /v1/content/packs/:id** - Fixed response structure
  - Changed `id` to `roundId` (matches iOS model)
  - Changed `followups` to `followupQuestions` (matches iOS model)
  - Removed `clueCount` and `followupCount` (redundant)

**Imports Added:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

### iOS Host App (apps/ios-host)

#### 1. `/apps/ios-host/Sources/PaSparetHost/ContentAPI.swift`

**New Function:**
```swift
static func importContentPack(json: Data) async throws -> String
```
- POST to `/v1/content/packs/import`
- Sends JSON data as request body
- Returns the imported roundId

**New Response Model:**
```swift
struct ImportResponse: Decodable {
    let roundId: String
}
```

#### 2. `/apps/ios-host/Sources/PaSparetHost/Views/Content/ContentLibraryView.swift`

**UI Enhancements:**
- Added import button in toolbar (download icon)
- Added state for `@State private var showImportView = false`
- Added sheet presentation for `ImportContentPackView`
- Import button positioned next to generate button

**Button Layout:**
```swift
HStack(spacing: Layout.space2) {
    Button { showImportView = true }  // Import
    Button { showGenerateView = true } // Generate
}
```

#### 3. **NEW FILE**: `/apps/ios-host/Sources/PaSparetHost/Views/Content/ImportContentPackView.swift`

Complete new view for importing content packs:

**Features:**
- File picker for JSON files (`.json` UTType)
- Validates JSON structure before upload
- Shows loading state during import
- Success/error feedback with haptics
- Calls `onComplete` callback to refresh content list

**UI States:**
1. Ready - Shows info and "Välj fil" button
2. Loading - During file validation and upload
3. Success - Shows success message with imported roundId
4. Error - Shows error with retry option

**Validation:**
- Valid JSON format
- Contains `roundId` field
- Proper structure (dictionary)

#### 4. `/apps/ios-host/Sources/PaSparetHost/Views/Content/ContentPackDetailView.swift`

**Export Feature Added:**
- Export button in toolbar (share icon)
- Generates a template JSON with example data
- Shows iOS share sheet for saving/sending

**New State:**
```swift
@State private var showShareSheet = false
@State private var exportedTemplateURL: URL?
```

**Template Structure:**
- Example destination with all required fields
- 5 clues with levels 10, 8, 6, 4, 2
- 2 followup questions (multiple choice + open text)
- Complete metadata with current timestamp

**New Helper Components:**
```swift
func exportTemplate() // Creates and exports JSON template
struct ShareSheet: UIViewControllerRepresentable // iOS share functionality
```

#### 5. `/apps/ios-host/Sources/PaSparetHost/Views/Content/GenerateContentView.swift`

**Fixed:**
- Reordered `dismiss()` and `onComplete()` calls
- Now dismisses sheet first, then triggers refresh
- Ensures content list updates properly after generation

**Before:**
```swift
onComplete()
dismiss()
```

**After:**
```swift
dismiss()
onComplete()
```

#### 6. `/apps/ios-host/PaSparetHost.xcodeproj/project.pbxproj`

**Added ImportContentPackView.swift to Xcode project:**
- PBXBuildFile entry: `AA000015`
- PBXFileReference entry: `BB000015`
- Added to Content group (BB0000AE)
- Added to build phase (Sources)

## API Contract

### Import Content Pack

**Endpoint:** `POST /v1/content/packs/import`

**Request Body:**
```json
{
  "roundId": "unique-id",
  "destination": {
    "name": "Destination Name",
    "country": "Country",
    "aliases": ["alias1", "alias2"]
  },
  "clues": [
    {"level": 10, "text": "..."},
    {"level": 8, "text": "..."},
    {"level": 6, "text": "..."},
    {"level": 4, "text": "..."},
    {"level": 2, "text": "..."}
  ],
  "followups": [
    {
      "questionText": "Question?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "aliases": ["a"]
    }
  ],
  "metadata": {
    "generatedAt": "2025-02-08T...",
    "verified": true,
    "antiLeakChecked": true
  }
}
```

**Success Response (201):**
```json
{
  "message": "Content pack imported successfully",
  "roundId": "unique-id"
}
```

**Error Responses:**
- 400 - Invalid structure (missing fields, wrong clue count)
- 409 - Pack already exists with that roundId
- 500 - Server error

### Delete Content Pack

**Endpoint:** `DELETE /v1/content/packs/:id`

**Success Response:** 204 No Content

**Error Responses:**
- 404 - Pack not found
- 500 - Server error

### Get Content Pack

**Endpoint:** `GET /v1/content/packs/:id`

**Success Response (200):**
```json
{
  "roundId": "example-stockholm-001",
  "destination": {
    "name": "Stockholm",
    "country": "Sverige"
  },
  "clues": [
    {"points": 10, "text": "..."},
    ...
  ],
  "followupQuestions": [
    {
      "questionText": "...",
      "correctAnswer": "...",
      "options": [...],
      "type": "MULTIPLE_CHOICE"
    }
  ],
  "metadata": {
    "generatedAt": "2025-02-07T00:00:00.000Z",
    "verified": true,
    "antiLeakChecked": true
  }
}
```

## User Flows

### Import Content Pack Flow

1. User taps import button (download icon) in ContentLibraryView toolbar
2. ImportContentPackView sheet appears
3. User taps "Välj fil" button
4. iOS file picker appears (filtered to .json files)
5. User selects a JSON file
6. App validates JSON structure
7. App sends to backend POST /v1/content/packs/import
8. Success: Shows success message, refreshes content list, dismisses
9. Error: Shows error message with retry option

### Export Template Flow

1. User opens any content pack in ContentPackDetailView
2. User taps export button (share icon) in toolbar
3. App generates template JSON with example data
4. iOS share sheet appears
5. User saves to Files, AirDrop, or shares via other apps

### Generate Content Flow (Fixed)

1. User taps generate button in ContentLibraryView
2. GenerateContentView sheet appears
3. User initiates generation
4. Progress tracked with polling
5. On completion: Sheet dismisses → Content list refreshes automatically
6. New pack appears in list

## Testing

### Manual Testing Checklist

**Import Feature:**
- [ ] Import button visible in toolbar
- [ ] File picker shows only .json files
- [ ] Valid content pack imports successfully
- [ ] Invalid JSON shows error
- [ ] Missing required fields shows validation error
- [ ] Duplicate roundId shows conflict error
- [ ] Success message shows imported roundId
- [ ] Content list refreshes after import
- [ ] Haptic feedback on success/error

**Export Feature:**
- [ ] Export button visible in detail view toolbar
- [ ] Share sheet appears with JSON file
- [ ] Template includes all required fields
- [ ] Template has proper structure (5 clues, metadata, etc)
- [ ] Can save to Files app
- [ ] Can AirDrop to another device
- [ ] Exported template can be re-imported

**Delete Feature:**
- [ ] Delete confirmation alert appears
- [ ] Delete removes pack from disk
- [ ] Content list updates after delete
- [ ] Deleted pack no longer accessible

**Generate + Refresh:**
- [ ] After generation completes, sheet dismisses
- [ ] Content list automatically refreshes
- [ ] New pack appears without manual refresh

### Backend Testing

```bash
# Start backend
cd services/backend
npm run dev

# Import a pack
curl -X POST http://localhost:3001/v1/content/packs/import \
  -H "Content-Type: application/json" \
  -d @/path/to/content-pack.json

# List packs (should show new pack)
curl http://localhost:3001/v1/content/packs

# Get pack details
curl http://localhost:3001/v1/content/packs/example-stockholm-001

# Delete pack
curl -X DELETE http://localhost:3001/v1/content/packs/example-stockholm-001

# Verify deletion
curl http://localhost:3001/v1/content/packs/example-stockholm-001
# Should return 404
```

## File Locations

### Backend Files Modified
- `/services/backend/src/routes/content.ts` - Added DELETE and POST import endpoints

### iOS Files Modified
- `/apps/ios-host/Sources/PaSparetHost/ContentAPI.swift` - Added import function
- `/apps/ios-host/Sources/PaSparetHost/Views/Content/ContentLibraryView.swift` - Added import button
- `/apps/ios-host/Sources/PaSparetHost/Views/Content/ContentPackDetailView.swift` - Added export feature
- `/apps/ios-host/Sources/PaSparetHost/Views/Content/GenerateContentView.swift` - Fixed refresh flow
- `/apps/ios-host/PaSparetHost.xcodeproj/project.pbxproj` - Added new file reference

### iOS Files Created
- `/apps/ios-host/Sources/PaSparetHost/Views/Content/ImportContentPackView.swift` - New import view

## Dependencies

### iOS
- `UniformTypeIdentifiers` framework (for UTType.json)
- Existing design system (Layout, Color extensions, button styles)
- Existing haptic functions (hapticImpact, hapticNotification)

### Backend
- `fs` - File system operations
- `path` - Path manipulation
- Existing `content-pack-loader` functions

## Compliance

### Architecture Rules
- ✅ Backend is authoritative (validates and stores content)
- ✅ iOS Host has pro-view access (can see full content)
- ✅ No breaking changes to contracts
- ✅ RESTful API design
- ✅ Proper error handling with HTTP status codes

### Code Quality
- ✅ TypeScript compiles without errors
- ✅ Swift follows existing patterns
- ✅ Proper error messages for user feedback
- ✅ Loading states and haptic feedback
- ✅ Consistent naming conventions

## Known Limitations

1. **Import Validation**: Backend validates structure but doesn't verify content quality (anti-leak, facts, etc.). Use AI content service for verified packs.

2. **No Overwrite**: Import returns 409 if roundId exists. Must delete first to replace.

3. **File Size**: No explicit file size limit on import. iOS file picker may impose limits.

4. **Concurrent Imports**: No locking mechanism. Avoid importing same roundId from multiple devices simultaneously.

## Future Enhancements

- [ ] Import multiple packs at once
- [ ] Validate content quality during import (API call to ai-content service)
- [ ] Export existing pack (not just template)
- [ ] Batch delete multiple packs
- [ ] Search/filter content library
- [ ] Sort content packs by date, name, verification status
- [ ] Preview pack before import (validation + preview UI)
- [ ] Import from URL (not just local file)

## Example Template

The export feature generates this template structure:

```json
{
  "roundId": "example-destination-001",
  "destination": {
    "name": "Example Destination",
    "country": "Example Country",
    "aliases": ["example", "destination"]
  },
  "clues": [
    {"level": 10, "text": "This is the first clue (10 points)"},
    {"level": 8, "text": "This is the second clue (8 points)"},
    {"level": 6, "text": "This is the third clue (6 points)"},
    {"level": 4, "text": "This is the fourth clue (4 points)"},
    {"level": 2, "text": "This is the fifth clue (2 points)"}
  ],
  "followups": [
    {
      "questionText": "Example multiple choice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "aliases": ["a", "option a"]
    },
    {
      "questionText": "Example open-text question?",
      "options": null,
      "correctAnswer": "Example answer",
      "aliases": ["example"]
    }
  ],
  "metadata": {
    "generatedAt": "2025-02-08T...",
    "verified": true,
    "antiLeakChecked": true
  }
}
```

Users can modify this template to create custom content packs.
