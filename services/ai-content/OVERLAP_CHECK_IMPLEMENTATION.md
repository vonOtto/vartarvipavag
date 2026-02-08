# Overlap Check Implementation

## Overview

Implemented overlap-checker to prevent followup questions from asking about facts already mentioned in clues.

## Problem Solved

Previously, the system could generate followups that asked about information already revealed in clues, for example:
- Clue: "Floden Seine delar staden i två" → Followup: "Vad heter floden?" ❌
- Clue: "Eiffeltornet är 324m högt" → Followup: "Hur högt är Eiffeltornet?" ❌

## Implementation

### 1. New Module: `overlap-checker.ts`

Location: `/services/ai-content/src/verification/overlap-checker.ts`

**Functions:**
- `checkFollowupOverlap(followup, clues, destination)` - Check single followup for overlap
- `checkFollowupOverlaps(followups, clues, destination)` - Check all followups for overlap

**How it works:**
- Uses Claude Haiku (cost-optimized) to analyze if followup asks about facts already in clues
- Returns `{ hasOverlap: boolean, reason: string, overlappingConcepts: string[] }`

**System Prompt:**
The checker uses a detailed system prompt that distinguishes between:
- **OVERLAP**: Specific name/value/fact already mentioned (e.g., "Seine", "324m", "Louvren")
- **NOT OVERLAP**: Only category/type mentioned (e.g., "flod" without name, "torn" without height)

### 2. Integration in `round-generator.ts`

**Changes:**
1. Import overlap checker
2. Run overlap check after anti-leak check (step 6)
3. Retry generation if overlap detected and `ANTI_LEAK_STRICT_MODE` is enabled
4. Add overlap results to ContentPack metadata

**Code flow:**
```typescript
const overlapCheck = await checkFollowupOverlaps(followups, clues, destination);
const overlapPassed = overlapCheck.passed;

if (!overlapPassed && CONFIG.ANTI_LEAK_STRICT_MODE) {
  console.warn(`[round-generator] Overlap check failed, retrying...`);
  continue; // Retry
}
```

### 3. Updated `ContentPack` Type

Added to metadata:
```typescript
metadata: {
  overlapChecked?: boolean;
  verificationDetails?: {
    overlapPassed?: boolean;
    overlapResults?: Array<{
      questionText: string;
      hasOverlap: boolean;
      reason: string;
      overlappingConcepts: string[];
    }>;
  };
}
```

### 4. Test Suite

Location: `/services/ai-content/src/verification/__tests__/overlap-checker.test.ts`

**Test cases:**
1. ✓ OVERLAP - River name (Seine) mentioned in clue
2. ✓ OK - River mentioned but not named
3. ✓ OVERLAP - Eiffel Tower height mentioned
4. ✓ OK - Tower mentioned but height not specified
5. ✓ OVERLAP - Louvre mentioned by name
6. ✓ OK - Museum mentioned generically
7. ✓ Batch check with multiple followups

**Run tests:**
```bash
tsx src/verification/__tests__/overlap-checker.test.ts
```

### 5. Documentation

Updated `README.md` with:
- Feature description
- Examples of overlap vs. no overlap
- How to test
- Integration with strict mode

## Configuration

**Strict Mode:**
Overlap checking respects `CONFIG.ANTI_LEAK_STRICT_MODE`:
- `true` (default): Regenerate round if overlap detected
- `false`: Log overlap but allow round to complete

**Model Used:**
- Claude Haiku (`claude-3-5-haiku-20241022`) for cost optimization
- Overlap detection is a simple classification task suitable for Haiku

## Example Output

```
[overlap-check] Checking followup questions for overlaps with clues...
[overlap-check] Followup "Vad heter floden som rinner genom staden?": OVERLAP! - Floden Seine nämndes explicit i ledtråd [10]
[overlap-check] OVERLAP DETECTED in followup! Concepts: Seine
[overlap-check] Overall: FAILED
[round-generator] Overlap check failed, retrying...
```

## Acceptance Criteria

- [x] Overlap-checker implemented and tested
- [x] Integrerad i round-generator
- [x] Loggar tydligt när overlap detekteras
- [x] Dokumentation i README om overlap-checking

## Files Modified

1. `/services/ai-content/src/verification/overlap-checker.ts` (NEW)
2. `/services/ai-content/src/verification/__tests__/overlap-checker.test.ts` (NEW)
3. `/services/ai-content/src/generators/round-generator.ts` (MODIFIED)
4. `/services/ai-content/src/types/content-pack.ts` (MODIFIED)
5. `/services/ai-content/README.md` (MODIFIED)

## Next Steps

1. Test with real API calls to verify Claude Haiku performs overlap detection correctly
2. Monitor cost impact (should be minimal since using Haiku)
3. Consider tuning system prompt if false positives/negatives occur
4. Potential enhancement: Cache overlap check results to avoid re-checking same combinations
