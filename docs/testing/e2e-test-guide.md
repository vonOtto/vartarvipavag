# E2E Test Guide

Comprehensive guide for running, writing, and maintaining E2E tests for Tripto Party Edition.

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test:e2e

# Run in headless mode (CI)
npm run test:e2e:headless

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

### Running Specific Tests

```bash
# Single test file
npx playwright test test/e2e/specs/happy-path.spec.ts

# Single test by name
npx playwright test -g "complete game session"

# Specific project (browser)
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Running on Specific Devices

```bash
# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

## Test Structure

### Test Organization

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
    └── host-controls.spec.ts   # Host functionality
```

### Test Anatomy

```typescript
import { test, expect } from '@playwright/test';
import { createSession, joinAsPlayer } from '../helpers/api';
import { waitForWSConnection, waitForPhase } from '../helpers/websocket';

test.describe('Feature Name', () => {
  test('specific scenario description', async ({ browser }) => {
    // 1. Setup: Create session and contexts
    const session = await createSession();
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      // 2. Action: Perform test actions
      await joinAsPlayer(session.sessionId, 'Alice');
      await playerPage.goto(`/join/${session.sessionId}`);

      // 3. Assert: Verify expected behavior
      await waitForWSConnection(playerPage);
      await expect(playerPage.locator('.lobby')).toBeVisible();

    } finally {
      // 4. Cleanup: Close contexts
      await playerContext.close();
    }
  });
});
```

## Writing Tests

### Best Practices

#### 1. Use Helpers

Always use helper functions for common operations:

```typescript
// Good
await createSession();
await joinAsPlayer(sessionId, 'Alice');
await waitForPhase(page, 'CLUE_LEVEL');

// Bad - don't repeat API calls
await fetch('http://localhost:3000/v1/sessions', { method: 'POST' });
```

#### 2. Deterministic Tests

Ensure tests are deterministic and not flaky:

```typescript
// Good - wait for specific conditions
await waitForPhase(page, 'CLUE_LEVEL');
await expectClueLevel(page, 10);

// Bad - arbitrary timeouts
await page.waitForTimeout(5000); // What are we waiting for?
```

#### 3. Cleanup Resources

Always clean up browser contexts:

```typescript
try {
  // Test code
} finally {
  await player1Context.close();
  await player2Context.close();
}
```

#### 4. Clear Test Names

Use descriptive test names:

```typescript
// Good
test('player reconnects after locking answer and answer persists', async () => {});

// Bad
test('reconnect test', async () => {});
```

#### 5. Reasonable Timeouts

Use appropriate timeouts:

```typescript
// Short operations
await page.waitForTimeout(500); // Brake acceptance

// Network operations
await waitForWSConnection(page, 5000);

// State transitions
await waitForPhase(page, 'CLUE_LEVEL', 10000);
```

### Common Patterns

#### Pattern 1: Multi-Player Setup

```typescript
const session = await createSession();

// Create contexts for each player
const contexts = await Promise.all([
  browser.newContext(),
  browser.newContext(),
]);

const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

// Join all players
const players = await Promise.all([
  joinAsPlayer(session.sessionId, 'Alice'),
  joinAsPlayer(session.sessionId, 'Bob'),
]);

// Navigate all players
for (let i = 0; i < pages.length; i++) {
  await pages[i].goto(`/join/${session.sessionId}`);
  await pages[i].fill('input[name="playerName"]', players[i].name);
  await pages[i].click('button[type="submit"]');
  await waitForWSConnection(pages[i]);
}
```

#### Pattern 2: State Verification

```typescript
// Verify phase
await expectPhase(page, 'CLUE_LEVEL');

// Verify specific game state
const gameState = await getGameState(page);
expect(gameState.currentRound.currentClueLevel.levelPoints).toBe(10);

// Verify player state
await expectPlayerHasLockedAnswer(page, playerId);
```

#### Pattern 3: Event Sequencing

```typescript
// Start game
await startGame(page);
await waitForPhase(page, 'CLUE_LEVEL');

// Brake and answer
await pullBrake(page);
await page.waitForTimeout(500);
await submitAnswer(page, 'Paris');
await page.waitForTimeout(500);

// Progress
await nextClue(page);
await waitForPhase(page, 'CLUE_LEVEL');
```

## Available Helpers

### API Helpers (`helpers/api.ts`)

```typescript
// Session management
createSession(): Promise<SessionResponse>
joinAsPlayer(sessionId: string, playerName: string): Promise<JoinResponse>
joinAsTV(sessionId: string): Promise<TVJoinResponse>
healthCheck(): Promise<boolean>
```

### WebSocket Helpers (`helpers/websocket.ts`)

```typescript
// Connection
waitForWSConnection(page: Page, timeout?: number): Promise<void>

// State
waitForPhase(page: Page, phase: GamePhase, timeout?: number): Promise<void>
getGameState(page: Page): Promise<any>

// Actions
pullBrake(page: Page): Promise<void>
submitAnswer(page: Page, answerText: string): Promise<void>
startGame(page: Page): Promise<void>
nextClue(page: Page): Promise<void>

// Events
waitForWSEvent(page: Page, eventType: string, timeout?: number): Promise<WebSocketMessage>
getWSMessages(page: Page): Promise<WebSocketMessage[]>
clearWSMessages(page: Page): Promise<void>
```

### Assertion Helpers (`helpers/assertions.ts`)

```typescript
// Phase assertions
expectPhase(page: Page, expectedPhase: GamePhase): Promise<void>
expectClueLevel(page: Page, levelPoints: number): Promise<void>

// Player assertions
expectPlayerCount(page: Page, count: number): Promise<void>
expectPlayerHasLockedAnswer(page: Page, playerId: string): Promise<void>
expectBrakeOwner(page: Page, playerId: string): Promise<void>
expectPlayerScore(page: Page, playerId: string, expectedPoints: number): Promise<void>

// UI assertions
expectVisible(page: Page, selector: string): Promise<void>
expectText(page: Page, selector: string, text: string): Promise<void>
expectEnabled(page: Page, selector: string): Promise<void>
expectDisabled(page: Page, selector: string): Promise<void>
```

## Debugging Tests

### Method 1: Headed Mode

Run tests with visible browser:

```bash
npx playwright test --headed
```

### Method 2: Debug Mode

Run tests with Playwright Inspector:

```bash
npm run test:e2e:debug
```

Step through tests line by line.

### Method 3: Console Logging

Add console logs in tests:

```typescript
const gameState = await getGameState(page);
console.log('Current game state:', JSON.stringify(gameState, null, 2));
```

### Method 4: Screenshots

Take screenshots at specific points:

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Method 5: Video Recording

Enable video recording in `playwright.config.ts`:

```typescript
use: {
  video: 'on', // or 'retain-on-failure'
}
```

## Test Reports

### Viewing Reports

After test run:

```bash
npx playwright show-report
```

### Report Contents

- Test results (pass/fail)
- Execution time
- Screenshots on failure
- Video recordings
- Trace files

### Accessing Traces

Click on a failed test in the report to view:
- Step-by-step execution
- Network requests
- Console logs
- Screenshots at each step

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E Tests
        run: npm run test:e2e:headless

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Maintenance

### Updating Tests

When contracts change:
1. Update helper functions in `test/e2e/helpers/`
2. Update test assertions
3. Run full test suite to verify
4. Update documentation

### Adding New Tests

1. Create new spec file in `test/e2e/specs/`
2. Follow existing patterns
3. Use helpers for common operations
4. Add test case to `docs/testing/test-scenarios.md`
5. Run new test to verify it works

### Test Health

Regularly check:
- Test execution time (should be < 5 minutes for full suite)
- Flakiness (no tests should fail randomly)
- Coverage (all critical paths tested)
- Maintenance burden (tests should be easy to update)

## Performance Tips

### 1. Parallel Execution

For independent tests, enable parallel execution:

```typescript
// In playwright.config.ts
workers: process.env.CI ? 2 : 2, // Adjust based on needs
```

### 2. Test Isolation

Keep tests isolated - don't share sessions:

```typescript
// Good - each test creates its own session
test('scenario 1', async () => {
  const session = await createSession();
  // ...
});

test('scenario 2', async () => {
  const session = await createSession();
  // ...
});
```

### 3. Reuse Contexts

When testing multiple actions in same session:

```typescript
// Reuse context for related tests
const context = await browser.newContext();
try {
  // Multiple actions with same context
} finally {
  await context.close();
}
```

## Troubleshooting

See `docs/testing/e2e-setup.md` for detailed troubleshooting steps.

Common issues:
- WebSocket connection failures
- State synchronization delays
- Timeout errors
- Browser installation issues

## Next Steps

- Read `docs/testing/test-scenarios.md` for full test coverage
- Check `test/e2e/README.md` for quick reference
- Review existing tests for patterns and examples
