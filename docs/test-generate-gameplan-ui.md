# Test Checklist: GenerateGamePlanView

## Objective
Verify that the new AI generation configuration UI works correctly in the iOS Host app.

## Prerequisites
- iOS Host app built and running on device/simulator
- Backend running with AI content service available

## Test Cases

### 1. Launch Flow
- [ ] Launch iOS Host app
- [ ] Tap "Skapa nytt spel" button
- [ ] Verify GenerateGamePlanView sheet appears
- [ ] Verify header displays "Konfigurera AI-generering"
- [ ] Verify all sections are visible: Antal, Regioner, Specifik destination, Förhandsgranskning

### 2. Number of Destinations
- [ ] Default is 3 destinations
- [ ] Tap "4" - verify it becomes selected (orange background)
- [ ] Tap "5" - verify it becomes selected
- [ ] Tap "3" - verify it returns to 3
- [ ] Verify haptic feedback on iOS when tapping

### 3. Region Selection - Mixed Mode (Default)
- [ ] Verify "Blandad (alla regioner)" is selected by default
- [ ] Preview shows "Genererar 3 destinationer (Blandad)"
- [ ] Verify region checkboxes are hidden

### 4. Region Selection - Specific Regions
- [ ] Tap "Blandad (alla regioner)" to deselect
- [ ] Verify region list appears (Europa, Asien, Afrika, Amerika, Oceanien, Norden)
- [ ] Select "Europa" - verify checkmark appears
- [ ] Preview shows "Genererar 3 destinationer (Europa)"
- [ ] Select "Asien" as well
- [ ] Preview shows "Genererar 3 destinationer (Asien + Europa)" (alphabetical)
- [ ] Deselect "Europa"
- [ ] Preview shows "Genererar 3 destinationer (Asien)"
- [ ] Select "Blandad" again - verify all regions are cleared and list hides

### 5. Custom Prompt
- [ ] Enter "Paris" in the text field
- [ ] Preview updates to "Genererar 3 destinationer inklusive \"Paris\""
- [ ] Change to "Tokyo"
- [ ] Preview updates to "Genererar 3 destinationer inklusive \"Tokyo\""
- [ ] Clear text field
- [ ] Preview returns to previous state (based on regions)
- [ ] Verify text field has proper styling (mint border when filled)

### 6. Combined Configuration
- [ ] Set 5 destinations
- [ ] Select "Europa" + "Asien" (deselect Blandad first)
- [ ] Enter "Paris" in prompt
- [ ] Preview shows "Genererar 5 destinationer inklusive \"Paris\""
- [ ] Warning shows "Genereringen tar 3-6 minuter"

### 7. Generate & Create Session
- [ ] Tap "Skapa & Generera" button
- [ ] Verify sheet dismisses
- [ ] Verify session is created
- [ ] Verify loading state appears "Genererar resmål..."
- [ ] Wait for generation to complete (3-6 minutes)
- [ ] Verify destinations appear in lobby view
- [ ] Verify correct number of destinations (5 in this case)

### 8. Cancel Flow
- [ ] Tap "Skapa nytt spel" again
- [ ] Configure some settings
- [ ] Tap "Avbryt" in navigation bar
- [ ] Verify sheet dismisses
- [ ] Verify no session is created
- [ ] Verify still on launch screen

### 9. API Integration
- [ ] Monitor network requests (use Charles Proxy or similar)
- [ ] Create session with:
  - 4 destinations
  - Regions: ["Europe", "Asia"]
  - Prompt: "Tokyo"
- [ ] Verify POST to `/v1/sessions/:id/game-plan/generate-ai` contains:
  ```json
  {
    "numDestinations": 4,
    "regions": ["Europe", "Asia"],
    "prompt": "Tokyo"
  }
  ```

### 10. Edge Cases
- [ ] Create with 3 destinations, no regions (Blandad), no prompt - should work
- [ ] Create with 5 destinations, all regions selected individually - should work
- [ ] Create with prompt only (no regions) - should work
- [ ] Verify preview text is accurate in all cases

### 11. Visual & UX Polish
- [ ] Verify all colors match design system (bg0, bg1, bg2, accOrange, accMint, txt1, txt2)
- [ ] Verify spacing is consistent (Layout.space1, space2, etc.)
- [ ] Verify corner radius matches design (Layout.radiusM, radiusS)
- [ ] Verify haptic feedback works on all interactions (iOS)
- [ ] Verify animations are smooth
- [ ] Verify text is legible and properly aligned

## Success Criteria
All test cases pass without errors or UI glitches.

## Known Issues
None at this time.

## Test Date
2026-02-08

## Tester
_________________
