# TASK-803 Test Plan: Natural Language Prompt Parsing

## Overview
Backend now supports natural language prompts for AI destination generation via the `/v1/sessions/:sessionId/game-plan/generate-ai` endpoint.

## Implementation Details

### New Parameters
- `prompt` (optional string): Natural language description like "4 resmål i Europa"
- Backward compatible: existing `numDestinations` and `regions` parameters still work

### Parsing Logic
The `parseDestinationPrompt()` function extracts:
- **Count**: Numbers (3, 4, 5) or text ("tre", "three", "fyra", "four", "fem", "five")
- **Regions**: Keywords for Europe, Asia, Africa, Americas (North/South), Nordic, Oceania

### Supported Languages
- Swedish: "tre", "fyra", "fem", "nordisk", "europa", "asien", etc.
- English: "three", "four", "five", "nordic", "europe", "asia", etc.

## Manual Test Cases

### Prerequisites
1. Backend server running on http://localhost:3001
2. AI Content service running on http://localhost:3002
3. Valid session created in LOBBY phase

### Test 1: Basic Swedish Prompt
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "4 resmål i Europa"}'
```
**Expected**: 4 destinations generated with Europe region filter

### Test 2: English Prompt with Nordic
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "5 nordic countries"}'
```
**Expected**: 5 destinations generated with Nordic region filter

### Test 3: Text Number in Swedish
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Tre destinationer i Asien"}'
```
**Expected**: 3 destinations generated with Asia region filter

### Test 4: Count Only (No Region)
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "5 destinationer"}'
```
**Expected**: 5 destinations generated, no region filter

### Test 5: Region Only (No Count)
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "destinations in South America"}'
```
**Expected**: 3 destinations (default) with South America region filter

### Test 6: Multiple Regions
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Afrika och Asien, fyra stycken"}'
```
**Expected**: 4 destinations with both Africa and Asia region filters

### Test 7: Backward Compatibility (No Prompt)
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"numDestinations": 3, "regions": ["Europe"]}'
```
**Expected**: Works exactly as before - 3 destinations with Europe filter

### Test 8: Prompt with Fallback
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Europa", "numDestinations": 4}'
```
**Expected**: 4 destinations (falls back to numDestinations) with Europe filter

### Test 9: Invalid Count in Prompt
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "10 destinationer i Europa"}'
```
**Expected**: 400 error - count must be between 3 and 5

### Test 10: Scandinavian Keyword
```bash
curl -X POST http://localhost:3001/v1/sessions/<SESSION_ID>/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Scandinavia, tre resmål"}'
```
**Expected**: 3 destinations with Nordic region filter

## Validation Checklist

- [ ] TypeScript compiles without errors
- [ ] Backward compatibility: old API calls with `numDestinations` still work
- [ ] Prompt parsing: extracts count correctly (3, 4, 5, "tre", "four", etc.)
- [ ] Prompt parsing: extracts regions correctly (Europe, Asia, Africa, Americas, Nordic, Oceania)
- [ ] Validation: count must be 3-5 (rejects invalid counts)
- [ ] Validation: session must exist (404 if not found)
- [ ] Validation: session must be in LOBBY phase
- [ ] Logging: logs parsed prompt with count and regions
- [ ] Fallback: uses default count (3) if prompt has no number
- [ ] Fallback: uses numDestinations if prompt parsing returns undefined count
- [ ] Fallback: uses regions parameter if prompt parsing returns undefined regions

## Regional Keyword Support

| Swedish | English | Parsed Region |
|---------|---------|---------------|
| Europa | Europe | Europe |
| Asien | Asia | Asia |
| Afrika | Africa | Africa |
| Nordamerika, Nord-Amerika | North America | North America |
| Sydamerika, Syd-Amerika | South America | South America |
| Amerika | America | Americas |
| Nordisk | Nordic | Nordic |
| Skandinavien | Scandinavian | Nordic |
| Oceanien | Oceania | Oceania |

## Text Number Support

| Swedish | English | Parsed Number |
|---------|---------|---------------|
| tre | three | 3 |
| fyra | four | 4 |
| fem | five | 5 |
| 3 | 3 | 3 |
| 4 | 4 | 4 |
| 5 | 5 | 5 |

## Success Criteria

All test cases pass with expected behavior:
- Prompt parsing works for Swedish and English
- Backward compatibility maintained
- Proper validation and error handling
- Logging includes parsed prompt details
