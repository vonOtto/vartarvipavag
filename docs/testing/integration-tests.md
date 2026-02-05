# Backend Integration Tests

Comprehensive integration test suite for the På Spåret backend server.

## Overview

The integration tests verify the complete event flow, state machine behavior, and multi-client interactions through WebSocket connections.

## Test Structure

```
services/backend/test/integration/
├── helpers/
│   ├── test-client.ts        # WebSocket client wrapper
│   ├── test-session.ts       # Session creation helpers
│   ├── test-runner.ts        # Test framework
│   └── assertions.ts         # Assertion utilities
├── specs/
│   ├── websocket.test.ts     # Connection & auth tests
│   ├── game-flow.test.ts     # Game progression tests
│   ├── state-machine.test.ts # State transition tests
│   ├── brake-fairness.test.ts # Brake concurrency tests
│   └── scoring.test.ts       # Scoring calculation tests
└── run-all.ts                # Main test runner
```

## Running Tests

### Prerequisites

The backend server must be running on `localhost:3000`:

```bash
cd services/backend
npm run dev
```

### Run All Integration Tests

```bash
cd services/backend
npm run test:integration
```

### Run Individual Test Suites

```bash
# WebSocket tests
npx tsx test/integration/specs/websocket.test.ts

# Game flow tests
npx tsx test/integration/specs/game-flow.test.ts

# State machine tests
npx tsx test/integration/specs/state-machine.test.ts

# Brake fairness tests
npx tsx test/integration/specs/brake-fairness.test.ts

# Scoring tests
npx tsx test/integration/specs/scoring.test.ts
```

## Test Coverage

### 1. WebSocket Connection & Auth (`websocket.test.ts`)

- ✅ Connect with valid token and receive WELCOME
- ✅ Receive STATE_SNAPSHOT after WELCOME
- ✅ Reject connection with invalid token
- ✅ Reject connection with missing token
- ✅ Handle multiple clients connecting to same session
- ✅ Support reconnection with same token

**What it verifies:**
- Token-based authentication
- Initial connection handshake
- Role assignment (HOST, PLAYER, TV)
- Error handling for invalid credentials
- Multi-client support

### 2. Game Flow (`game-flow.test.ts`)

- ✅ Transition from LOBBY to CLUE_LEVEL when host starts game
- ✅ Advance through all clue levels (10→8→6→4→2)
- ✅ Transition to REVEAL_DESTINATION after last clue
- ✅ Broadcast DESTINATION_RESULTS with scoring
- ✅ Send SCOREBOARD_UPDATE after results
- ✅ Reject HOST_START_GAME from non-host
- ✅ Reject HOST_NEXT_CLUE from non-host

**What it verifies:**
- Complete game loop from lobby to scoring
- Clue progression logic
- Role-based authorization
- Event broadcasting to all clients
- Destination reveal mechanics

### 3. State Machine (`state-machine.test.ts`)

- ✅ Start in LOBBY phase
- ✅ LOBBY → CLUE_LEVEL transition
- ✅ CLUE_LEVEL → PAUSED_FOR_BRAKE transition
- ✅ PAUSED_FOR_BRAKE → CLUE_LEVEL after answer submission
- ✅ CLUE_LEVEL → REVEAL_DESTINATION after last clue
- ✅ Maintain scoreboard through transitions
- ✅ Track locked answers in state
- ✅ Clear brakeOwnerPlayerId when host advances during brake

**What it verifies:**
- State machine correctness
- Phase transitions
- State persistence across transitions
- Brake state management
- Answer tracking

### 4. Brake Fairness (`brake-fairness.test.ts`)

- ✅ Accept first brake and reject others
- ✅ Reject brake with reason "too_late"
- ✅ Enforce rate limiting (1 brake per 2 seconds)
- ✅ Reject brake in wrong phase
- ✅ Broadcast BRAKE_ACCEPTED to all clients
- ✅ Only accept answer from brake owner
- ✅ Prevent duplicate answers for same destination

**What it verifies:**
- First-wins brake fairness
- Rate limiting enforcement
- Phase-based brake validation
- Answer submission authorization
- Duplicate answer prevention

### 5. Scoring (`scoring.test.ts`)

- ✅ Award points for correct answer
- ✅ Award 0 points for incorrect answer
- ✅ Award points based on clue level (10/8/6/4/2)
- ✅ Update scoreboard with cumulative scores
- ✅ Include all players in DESTINATION_RESULTS
- ✅ Normalize answers for comparison (case-insensitive, whitespace)

**What it verifies:**
- Scoring calculation accuracy
- Point values per clue level
- Answer normalization
- Scoreboard updates
- Result broadcasting

## Test Helpers

### TestClient

WebSocket client wrapper with helper methods:

```typescript
const client = new TestClient({
  token: 'auth-token',
  wsUrl: 'ws://localhost:3000/ws',
  logPrefix: '[TEST]',
  debug: true
});

await client.connect();

// Send events
client.send('HOST_START_GAME', {});

// Wait for specific event
const snapshot = await client.waitForEvent('STATE_SNAPSHOT', 5000);

// Get messages
const clues = client.getMessages('CLUE_PRESENT');
const latestState = client.getCurrentState();

// Register event handlers
client.on('BRAKE_ACCEPTED', (event) => {
  console.log('Brake accepted:', event.payload);
});
```

### Test Session Helpers

Quickly create test sessions with multiple clients:

```typescript
// Create session with 3 players
const { session, host, tv, players } = await createTestSession(3, {
  debug: true
});

// Session info
console.log(session.sessionId, session.joinCode);

// All clients are already connected and authenticated
host.send('HOST_START_GAME', {});
players[0].send('BRAKE_PULL', { playerId: players[0].playerId });

// Cleanup
cleanupClients(host, tv, ...players);
```

### Assertions

Type-safe assertion helpers:

```typescript
import { assert, assertEqual, assertExists, assertLength } from './helpers/assertions';

const state = client.getCurrentState();
assertEqual(state.phase, 'CLUE_LEVEL', 'Phase should be CLUE_LEVEL');
assertExists(state.destination, 'Destination should exist');
assertLength(state.players, 3, 'Should have 3 players');
assert(state.clueLevelPoints === 10, 'Should start at 10 points');
```

## Writing New Tests

### 1. Create Test Suite

```typescript
import { TestRunner, suite, test } from '../helpers/test-runner';
import { createTestSession, cleanupClients } from '../helpers/test-session';

export async function runMyTests(): Promise<void> {
  const runner = new TestRunner();

  await runner.runSuite(suite('My Test Suite', [
    test('Should do something', async () => {
      const { host, tv, players } = await createTestSession(2);

      // Test logic here

      cleanupClients(host, tv, ...players);
    }),

    test('Should do something else', async () => {
      // Another test
    }),
  ]));

  runner.printSummary();

  if (!runner.allPassed()) {
    process.exit(1);
  }
}
```

### 2. Add to Main Runner

Edit `test/integration/run-all.ts`:

```typescript
import { runMyTests } from './specs/my-tests.test';

// Add to main()
results.push(await runSuite('My Test Suite', runMyTests));
```

### 3. Run Your Tests

```bash
npx tsx test/integration/specs/my-tests.test.ts
```

## Best Practices

### 1. Always Clean Up

```typescript
test('My test', async () => {
  const { host, tv, players } = await createTestSession(2);

  try {
    // Test logic
  } finally {
    cleanupClients(host, tv, ...players);
  }
});
```

### 2. Use Appropriate Timeouts

```typescript
// Wait for state changes
await sleep(500);

// Wait for multiple events
await sleep(1000);

// Wait for rate limit reset
await sleep(2500);
```

### 3. Clear Messages Between Tests

```typescript
host.clearMessages();
tv.clearMessages();
players.forEach(p => p.clearMessages());
```

### 4. Check State Snapshots

```typescript
const state = client.getCurrentState();
assertEqual(state.phase, 'EXPECTED_PHASE');
```

### 5. Verify Event Broadcasting

```typescript
// Send event
host.send('HOST_START_GAME', {});
await sleep(1000);

// All clients should receive
assertExists(host.getLatestMessage('CLUE_PRESENT'));
assertExists(tv.getLatestMessage('CLUE_PRESENT'));
assertExists(players[0].getLatestMessage('CLUE_PRESENT'));
```

## Debugging Tests

### Enable Debug Logging

```typescript
const { host, tv, players } = await createTestSession(3, {
  debug: true  // Logs all WebSocket messages
});
```

### Inspect Messages

```typescript
// Get all messages
const allMessages = client.getMessages();
console.log('Received messages:', allMessages.map(m => m.type));

// Get specific message type
const snapshots = client.getMessages('STATE_SNAPSHOT');
console.log('State snapshots:', snapshots);
```

### Run Single Test

Comment out other tests in the suite:

```typescript
await runner.runSuite(suite('My Suite', [
  test('Failing test', async () => { /* ... */ }),
  // test('Other test', async () => { /* ... */ }),  // Skip this
  // test('Another test', async () => { /* ... */ }), // Skip this
]));
```

## CI Integration

The integration tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Start backend
  run: |
    cd services/backend
    npm install
    npm run dev &
    sleep 5  # Wait for server to start

- name: Run integration tests
  run: |
    cd services/backend
    npm run test:integration
```

### Environment Variables

```bash
TEST_BASE_URL=http://localhost:3000
TEST_WS_URL=ws://localhost:3000/ws
```

## Troubleshooting

### Server Not Running

```
Error: Failed to create session: connect ECONNREFUSED
```

**Solution:** Start the backend server first:
```bash
npm run dev
```

### Tests Timing Out

```
Error: Timeout waiting for WELCOME
```

**Solution:**
- Check server logs for errors
- Increase timeout in test
- Verify authentication tokens are valid

### Rate Limiting Issues

```
Error: BRAKE_REJECTED with reason "rate_limited"
```

**Solution:** Add longer sleep between brake attempts:
```typescript
await sleep(2500); // Wait for rate limit reset
```

### State Desync

**Solution:** Clear messages between test steps:
```typescript
client.clearMessages();
await sleep(500); // Wait for state to settle
```

## Performance

Test suite execution times (approximate):

- WebSocket tests: ~5 seconds
- Game flow tests: ~15 seconds
- State machine tests: ~20 seconds
- Brake fairness tests: ~25 seconds
- Scoring tests: ~20 seconds

**Total:** ~85 seconds for full suite

## Maintenance

### Adding New Events

1. Update `test-client.ts` if new event patterns are needed
2. Add test cases to appropriate spec file
3. Update this documentation

### Updating Contracts

When contracts change:
1. Update test assertions to match new schemas
2. Add tests for new event types
3. Verify all existing tests still pass

## References

- Contracts: `/contracts/events.schema.json`, `/contracts/state.schema.json`
- WebSocket docs: `/docs/ws-quick-reference.md`
- Scoring rules: `/contracts/scoring.md`
- Sprint 1 tasks: `/docs/sprint-1.md`
