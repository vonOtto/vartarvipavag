# Integration Tests - Quick Reference

## Run Tests

```bash
# All tests
npm run test:integration

# Individual suites
npm run test:integration:websocket
npm run test:integration:game-flow
npm run test:integration:state-machine
npm run test:integration:brake-fairness
npm run test:integration:scoring

# CI test suite (includes older scripts)
npm run test:ci
```

## Test Structure

```typescript
import { TestRunner, suite, test } from '../helpers/test-runner';
import { createTestSession, cleanupClients, sleep } from '../helpers/test-session';
import { assertEqual, assertExists } from '../helpers/assertions';

export async function runMyTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('Suite Name', [
    test('Test name', async () => {
      // Test logic
    }),
  ]));

  runner.printSummary();
  if (!runner.allPassed()) process.exit(1);
}
```

## Common Patterns

### Create Test Session

```typescript
// Auto-creates host, TV, and players
const { session, host, tv, players } = await createTestSession(3, {
  debug: true  // Optional: enable logging
});

// Access session info
console.log(session.sessionId, session.joinCode);

// All clients are connected and authenticated
assertEqual(host.role, 'HOST');
assertEqual(tv.role, 'TV');
assertEqual(players[0].role, 'PLAYER');

// Cleanup when done
cleanupClients(host, tv, ...players);
```

### Send Events

```typescript
// Host actions
host.send('HOST_START_GAME', {});
host.send('HOST_NEXT_CLUE', {});

// Player actions
players[0].send('BRAKE_PULL', {
  playerId: players[0].playerId,
  clientTimeMs: Date.now()
});

players[0].send('BRAKE_ANSWER_SUBMIT', {
  playerId: players[0].playerId,
  answerText: 'Paris'
});
```

### Wait and Check Events

```typescript
// Wait for single event
const snapshot = await client.waitForEvent('STATE_SNAPSHOT', 5000);

// Wait for multiple events
const events = await client.waitForEvents(['CLUE_PRESENT', 'STATE_SNAPSHOT']);

// Get latest message
const clue = client.getLatestMessage('CLUE_PRESENT');

// Get all messages of type
const allClues = client.getMessages('CLUE_PRESENT');

// Clear message history
client.clearMessages();
```

### Check State

```typescript
const state = client.getCurrentState();

assertEqual(state.phase, 'CLUE_LEVEL');
assertEqual(state.clueLevelPoints, 10);
assertExists(state.destination);
assertLength(state.lockedAnswers, 2);
```

### Assertions

```typescript
// Basic
assert(condition, 'Error message');
assertEqual(actual, expected, 'Message');
assertExists(value, 'Should exist');

// Arrays
assertLength(array, 3, 'Should have 3 items');
assertIncludes(array, value);
assertContains(array, item => item.id === '123');

// Objects
assertProperty(obj, 'key', expectedValue);
```

## Timing Guidelines

```typescript
await sleep(500);   // State changes, brake handling
await sleep(1000);  // Game transitions, complex operations
await sleep(2500);  // Rate limit reset (2 seconds + buffer)
```

## Full Game Flow

```typescript
// 1. Create session
const { host, tv, players } = await createTestSession(3);

// 2. Start game
host.send('HOST_START_GAME', {});
await sleep(1000);

// 3. Player brakes and answers
players[0].send('BRAKE_PULL', {
  playerId: players[0].playerId,
  clientTimeMs: Date.now()
});
await sleep(500);

players[0].send('BRAKE_ANSWER_SUBMIT', {
  playerId: players[0].playerId,
  answerText: 'Test Answer'
});
await sleep(500);

// 4. Advance through clues
for (let i = 0; i < 5; i++) {
  host.send('HOST_NEXT_CLUE', {});
  await sleep(500);
}

// 5. Check results
const reveal = host.getLatestMessage('DESTINATION_REVEAL');
const results = host.getLatestMessage('DESTINATION_RESULTS');
const scoreboard = host.getLatestMessage('SCOREBOARD_UPDATE');

assertExists(reveal);
assertExists(results);

// 6. Cleanup
cleanupClients(host, tv, ...players);
```

## Debugging

```typescript
// Enable debug logging
const { host, tv, players } = await createTestSession(3, {
  debug: true
});

// Inspect state
const state = client.getCurrentState();
console.log('State:', JSON.stringify(state, null, 2));

// Inspect messages
console.log('All messages:', client.getMessages().map(m => m.type));

// Check specific message
const msg = client.getLatestMessage('BRAKE_ACCEPTED');
console.log('Brake accepted:', msg?.payload);
```

## Common Scenarios

### Test Brake Concurrency

```typescript
// All players brake simultaneously
const promises = players.map((p, i) =>
  sleep(i * 10).then(() =>
    p.send('BRAKE_PULL', {
      playerId: p.playerId,
      clientTimeMs: Date.now()
    })
  )
);
await Promise.all(promises);
await sleep(1000);

// Check only 1 accepted
const accepted = players.filter(p =>
  p.getMessages('BRAKE_ACCEPTED').length > 0
);
assertEqual(accepted.length, 1);
```

### Test Authorization

```typescript
// Player tries host action
players[0].send('HOST_START_GAME', {});
await sleep(500);

const error = players[0].getLatestMessage('ERROR');
assertExists(error);
assertEqual(error.payload.errorCode, 'UNAUTHORIZED');
```

### Test State Transitions

```typescript
// Check initial state
let state = host.getCurrentState();
assertEqual(state.phase, 'LOBBY');

// Trigger transition
host.send('HOST_START_GAME', {});
await sleep(1000);

// Verify new state
state = host.getCurrentState();
assertEqual(state.phase, 'CLUE_LEVEL');
```

### Test Scoring

```typescript
// Get correct answer (host can see it)
const hostState = host.getCurrentState();
const correctAnswer = hostState.destination.name;

// Player answers
players[0].send('BRAKE_PULL', {
  playerId: players[0].playerId,
  clientTimeMs: Date.now()
});
await sleep(500);

players[0].send('BRAKE_ANSWER_SUBMIT', {
  playerId: players[0].playerId,
  answerText: correctAnswer
});
await sleep(500);

// Check locked answer
const lockedState = host.getCurrentState();
assertEqual(lockedState.lockedAnswers.length, 1);
assertEqual(lockedState.lockedAnswers[0].answerText, correctAnswer);
```

## Best Practices

1. Always call `cleanupClients()` after tests
2. Use appropriate `sleep()` durations
3. Clear messages before checking new events: `client.clearMessages()`
4. Verify broadcasts on multiple clients
5. Test both success and error cases
6. Check state after each transition

## File Locations

- Test helpers: `test/integration/helpers/`
- Test specs: `test/integration/specs/`
- Documentation: `docs/testing/integration-tests.md`
- Quick start: `test/integration/README.md`

## Next Steps

1. Read full docs: `docs/testing/integration-tests.md`
2. Check examples: `test/integration/specs/*.test.ts`
3. Run tests: `npm run test:integration`
4. Write your tests following the patterns above
