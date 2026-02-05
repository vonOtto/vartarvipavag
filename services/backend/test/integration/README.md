# Backend Integration Tests

Comprehensive integration test suite for the På Spåret backend server.

## Quick Start

### 1. Start the backend server

```bash
cd services/backend
npm run dev
```

### 2. Run all tests

```bash
npm run test:integration
```

## Test Suites

### WebSocket Connection & Auth
```bash
npm run test:integration:websocket
```
Tests authentication, connection handshake, and role assignment.

### Game Flow
```bash
npm run test:integration:game-flow
```
Tests complete game progression from lobby to scoring.

### State Machine
```bash
npm run test:integration:state-machine
```
Tests state transitions and phase management.

### Brake Fairness
```bash
npm run test:integration:brake-fairness
```
Tests brake concurrency, fairness, and rate limiting.

### Scoring
```bash
npm run test:integration:scoring
```
Tests scoring calculations and answer normalization.

## Architecture

```
test/integration/
├── helpers/              # Reusable test utilities
│   ├── test-client.ts   # WebSocket client wrapper
│   ├── test-session.ts  # Session creation helpers
│   ├── test-runner.ts   # Test framework
│   └── assertions.ts    # Type-safe assertions
│
├── specs/               # Test specifications
│   ├── websocket.test.ts
│   ├── game-flow.test.ts
│   ├── state-machine.test.ts
│   ├── brake-fairness.test.ts
│   └── scoring.test.ts
│
├── run-all.ts          # Main test runner
└── README.md           # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { TestRunner, suite, test } from '../helpers/test-runner';
import { createTestSession, cleanupClients } from '../helpers/test-session';
import { assertEqual, assertExists } from '../helpers/assertions';

export async function runMyTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('My Test Suite', [
    test('Should test something', async () => {
      // Create a session with 2 players
      const { host, tv, players } = await createTestSession(2);

      // Test logic
      host.send('HOST_START_GAME', {});
      await sleep(1000);

      const state = host.getCurrentState();
      assertEqual(state.phase, 'CLUE_LEVEL');

      // Cleanup
      cleanupClients(host, tv, ...players);
    }),
  ]));

  runner.printSummary();
  if (!runner.allPassed()) {
    process.exit(1);
  }
}
```

### Using TestClient

```typescript
// Connect a client
const client = await createClient(token, {
  logPrefix: '[TEST]',
  debug: true
});

// Send events
client.send('BRAKE_PULL', {
  playerId: client.playerId,
  clientTimeMs: Date.now()
});

// Wait for specific event
const event = await client.waitForEvent('BRAKE_ACCEPTED', 5000);

// Get messages
const clues = client.getMessages('CLUE_PRESENT');
const latest = client.getLatestMessage('STATE_SNAPSHOT');

// Get current state
const state = client.getCurrentState();

// Register handler
client.on('SCOREBOARD_UPDATE', (event) => {
  console.log('Scoreboard:', event.payload);
});

// Cleanup
client.close();
```

### Assertions

```typescript
import {
  assert,
  assertEqual,
  assertExists,
  assertLength,
  assertIncludes,
  assertProperty
} from '../helpers/assertions';

// Basic assertions
assert(condition, 'Error message');
assertEqual(actual, expected, 'Optional message');
assertExists(value, 'Should not be null/undefined');

// Array assertions
assertLength(array, 3, 'Should have 3 items');
assertIncludes(array, value, 'Should include value');

// Object assertions
assertProperty(obj, 'key', expectedValue);
```

## Test Patterns

### Full Game Flow

```typescript
test('Complete game flow', async () => {
  const { host, tv, players } = await createTestSession(3);

  // Start game
  host.send('HOST_START_GAME', {});
  await sleep(1000);

  // Player brakes and answers
  players[0].send('BRAKE_PULL', {
    playerId: players[0].playerId,
    clientTimeMs: Date.now()
  });
  await sleep(500);

  players[0].send('BRAKE_ANSWER_SUBMIT', {
    playerId: players[0].playerId,
    answerText: 'Paris'
  });
  await sleep(500);

  // Advance through clues
  for (let i = 0; i < 5; i++) {
    host.send('HOST_NEXT_CLUE', {});
    await sleep(500);
  }

  // Verify reveal
  const reveal = host.getLatestMessage('DESTINATION_REVEAL');
  assertExists(reveal);

  cleanupClients(host, tv, ...players);
});
```

### Concurrent Brakes

```typescript
test('Brake fairness', async () => {
  const { host, tv, players } = await createTestSession(5);

  host.send('HOST_START_GAME', {});
  await sleep(1000);

  // All players brake simultaneously
  const promises = players.map((player, i) => {
    return sleep(i * 10).then(() => {
      player.send('BRAKE_PULL', {
        playerId: player.playerId,
        clientTimeMs: Date.now()
      });
    });
  });

  await Promise.all(promises);
  await sleep(1000);

  // Verify only 1 accepted
  const accepted = players.filter(p =>
    p.getMessages('BRAKE_ACCEPTED').length > 0
  );
  assertEqual(accepted.length, 1);

  cleanupClients(host, tv, ...players);
});
```

### State Transitions

```typescript
test('State transitions', async () => {
  const { host, tv, players } = await createTestSession(2);

  // Initial state
  let state = host.getCurrentState();
  assertEqual(state.phase, 'LOBBY');

  // Transition to CLUE_LEVEL
  host.send('HOST_START_GAME', {});
  await sleep(1000);

  state = host.getCurrentState();
  assertEqual(state.phase, 'CLUE_LEVEL');
  assertEqual(state.clueLevelPoints, 10);

  cleanupClients(host, tv, ...players);
});
```

## Debugging

### Enable Debug Logging

```typescript
const { host, tv, players } = await createTestSession(3, {
  debug: true  // Logs all WebSocket messages
});
```

### Inspect State

```typescript
const state = client.getCurrentState();
console.log('Current phase:', state.phase);
console.log('Clue level:', state.clueLevelPoints);
console.log('Players:', state.players);
console.log('Locked answers:', state.lockedAnswers);
```

### Run Single Test

Edit the suite and comment out other tests:

```typescript
await runner.runSuite(suite('My Suite', [
  test('Specific test', async () => { /* ... */ }),
  // test('Other test', async () => { /* ... */ }),  // Commented
]));
```

## Common Issues

### Connection Timeout

```
Error: Connection timeout waiting for WELCOME
```

**Fix:** Ensure server is running on localhost:3000

### Rate Limit Errors

```
BRAKE_REJECTED with reason "rate_limited"
```

**Fix:** Wait 2+ seconds between brake attempts:
```typescript
await sleep(2500);
```

### State Desync

**Fix:** Clear messages and wait for state to settle:
```typescript
client.clearMessages();
await sleep(500);
```

## Best Practices

1. **Always clean up clients**: Use `cleanupClients()` after each test
2. **Use appropriate timeouts**: 500ms for state changes, 1000ms for complex operations
3. **Clear messages between steps**: `client.clearMessages()` before verifying new events
4. **Verify broadcasts**: Check all clients received important events
5. **Test edge cases**: Rate limits, wrong phases, unauthorized actions

## Documentation

Full documentation: `/docs/testing/integration-tests.md`

## Coverage Summary

- 40+ integration tests
- 5 test suites
- Coverage:
  - WebSocket connection & authentication
  - Game flow (lobby → clues → reveal → scoring)
  - State machine transitions
  - Brake fairness & concurrency
  - Scoring calculations

## Performance

Average execution time: ~85 seconds for full suite

Individual suites:
- WebSocket: ~5s
- Game Flow: ~15s
- State Machine: ~20s
- Brake Fairness: ~25s
- Scoring: ~20s
