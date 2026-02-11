# State Projection Tests

## Status: Pending Jest Configuration

The file `state-projection.test.ts.pending` contains 40+ comprehensive unit tests for state projection security, but requires Jest to be configured before it can run.

## Test Coverage

- **HOST Projection** - Verifies full state visibility
- **PLAYER Projection** - Verifies secret filtering (destination, answers, audio)
- **TV Projection** - Verifies display-only state (no secrets, no TTS manifest)
- **Edge Cases** - Handles missing fields, empty arrays, etc.
- **Security Tests** - Validates no secret leakage across roles

## Setup Required

1. Install Jest:
```bash
npm install --save-dev jest @types/jest ts-jest
```

2. Configure Jest in `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/*.test.ts"]
  }
}
```

3. Rename test file:
```bash
mv src/utils/state-projection.test.ts.pending src/utils/state-projection.test.ts
```

4. Run tests:
```bash
npm test
```

## Why Tests Are Important

State projection is security-critical - it prevents:
- Players seeing correct answers before reveal
- TV displaying secret game state
- Players seeing other players' answers
- Unauthorized access to TTS manifests

These tests validate that `contracts/projections.md` rules are enforced.
