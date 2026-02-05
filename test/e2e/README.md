# E2E Test Suite - Quick Start

End-to-end test suite for På Spåret Party Edition.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run in headless mode (CI)
npm run test:e2e:headless

# Run with UI
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug
```

## Prerequisites

Before running tests, ensure:
1. Backend running at `http://localhost:3000`
2. Web player running at `http://localhost:5173`

Or let Playwright auto-start them (configured in `playwright.config.ts`).

## Project Structure

```
test/e2e/
├── helpers/
│   ├── api.ts           # REST API helpers
│   ├── websocket.ts     # WebSocket helpers
│   └── assertions.ts    # Custom assertions
└── specs/
    ├── happy-path.spec.ts      # Full game flow
    ├── brake-scenario.spec.ts  # Brake mechanics
    ├── answer-lock.spec.ts     # Answer locking
    ├── reconnect.spec.ts       # Reconnection
    └── host-controls.spec.ts   # Host controls
```

## Test Files

| File | Tests | Focus |
|------|-------|-------|
| `happy-path.spec.ts` | 1 | Complete game session from start to finish |
| `brake-scenario.spec.ts` | 3 | Brake mechanics, fairness, simultaneous brakes |
| `answer-lock.spec.ts` | 4 | Answer locking, persistence, projections |
| `reconnect.spec.ts` | 5 | Reconnection in various phases |
| `host-controls.spec.ts` | 5 | Host game controls and synchronization |

**Total: 18 test scenarios**

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test test/e2e/specs/happy-path.spec.ts
```

### Run Specific Test by Name
```bash
npx playwright test -g "complete game session"
```

### Run on Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run on Mobile
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Viewing Results

After tests run:
```bash
npx playwright show-report
```

## Helper Functions

### API Helpers
- `createSession()` - Create new game session
- `joinAsPlayer(sessionId, name)` - Join as player
- `joinAsTV(sessionId)` - Join as TV
- `healthCheck()` - Check backend health

### WebSocket Helpers
- `waitForWSConnection(page)` - Wait for WS connection
- `waitForPhase(page, phase)` - Wait for specific game phase
- `getGameState(page)` - Get current game state
- `pullBrake(page)` - Send brake pull
- `submitAnswer(page, text)` - Submit answer
- `startGame(page)` - Start game (host)
- `nextClue(page)` - Advance clue (host)

### Assertion Helpers
- `expectPhase(page, phase)` - Assert game phase
- `expectClueLevel(page, level)` - Assert clue level
- `expectPlayerCount(page, count)` - Assert player count
- `expectPlayerHasLockedAnswer(page, playerId)` - Assert locked answer
- `expectPlayerScore(page, playerId, points)` - Assert score

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { createSession, joinAsPlayer } from '../helpers/api';
import { waitForWSConnection, waitForPhase } from '../helpers/websocket';

test.describe('My Feature', () => {
  test('specific scenario', async ({ browser }) => {
    const session = await createSession();
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      await joinAsPlayer(session.sessionId, 'Alice');
      await playerPage.goto(`/join/${session.sessionId}`);
      // ... test actions ...
    } finally {
      await playerContext.close();
    }
  });
});
```

### Best Practices
1. Always use helper functions
2. Clean up contexts in `finally` block
3. Use descriptive test names
4. Wait for specific conditions (not arbitrary timeouts)
5. Test one scenario per test case

## Debugging

### Method 1: Visual Debugging
```bash
npx playwright test --headed --debug
```

### Method 2: Playwright Inspector
```bash
npm run test:e2e:debug
```

### Method 3: Add Breakpoints
```typescript
await page.pause(); // Pauses execution
```

### Method 4: Console Logging
```typescript
const state = await getGameState(page);
console.log('State:', state);
```

## Troubleshooting

### Backend Not Starting
```bash
cd services/backend && npm run dev
```

### Web Player Not Starting
```bash
cd apps/web-player && npm run dev
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Browser Installation Failed
```bash
npx playwright install --force
```

### Tests Timing Out
Increase timeout in `playwright.config.ts`:
```typescript
timeout: 30000, // 30 seconds
```

## Documentation

- **Setup Guide:** `docs/testing/e2e-setup.md`
- **Test Guide:** `docs/testing/e2e-test-guide.md`
- **Test Scenarios:** `docs/testing/test-scenarios.md`

## CI/CD

GitHub Actions automatically runs tests on:
- Push to main branch
- Pull requests
- Manual workflow dispatch

View results in GitHub Actions tab.

## Support

For issues or questions:
1. Check documentation in `docs/testing/`
2. Review existing tests for examples
3. Check Playwright documentation: https://playwright.dev

---

**Happy Testing!**
