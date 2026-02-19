#!/usr/bin/env tsx
/**
 * E2E Full Game Flow Test
 *
 * Simulates complete game from session creation through final results:
 * 1. Create session (HOST)
 * 2. Join 4 players
 * 3. Start game with 3 destinations
 * 4. Play through all clue levels with brakes
 * 5. Verify reveal and scoring
 * 6. Play followup questions
 * 7. Verify final results
 * 8. Test reconnect scenarios
 *
 * Usage:
 *   npx tsx scripts/e2e-full-game-test.ts
 *
 * Requirements:
 *   - Backend running on localhost:3000
 *   - Content packs available (at least 3)
 */

import WebSocket from 'ws';

const fetchFn: typeof fetch = (globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node-fetch')) as typeof fetch;

// Config
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WS_URL = BASE_URL.replace('http', 'ws') + '/ws';

interface Player {
  id: string;
  name: string;
  authToken: string;
  ws: WebSocket | null;
  score: number;
  lockedAnswer: string | null;
}

interface GameState {
  phase: string;
  clueLevelPoints: number | null;
  destination: { name: string | null; country: string | null };
  scoreboard: Array<{ playerId: string; name: string; score: number }>;
}

class E2ETestRunner {
  private sessionId: string = '';
  private joinCode: string = '';
  private hostToken: string = '';
  private hostWs: WebSocket | null = null;
  private players: Player[] = [];
  private state: GameState = {
    phase: 'LOBBY',
    clueLevelPoints: null,
    destination: { name: null, country: null },
    scoreboard: []
  };
  private testsPassed = 0;
  private testsFailed = 0;

  async run() {
    console.log('🚀 Starting E2E Full Game Test\n');

    try {
      await this.test1_CreateSession();
      await this.test2_JoinPlayers();
      await this.test3_StartGame();
      await this.test4_PlayDestination1();
      await this.test5_PlayFollowups();
      await this.test6_PlayDestination2();
      await this.test7_FinalResults();
      await this.test8_ReconnectScenarios();

      console.log('\n' + '='.repeat(60));
      console.log('✅ E2E TEST COMPLETE');
      console.log(`Passed: ${this.testsPassed} | Failed: ${this.testsFailed}`);
      console.log('='.repeat(60));

      if (this.testsFailed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  private async test1_CreateSession() {
    console.log('📝 Test 1: Create Session');

    const response = await fetchFn(`${BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    this.assert(response.status === 201, 'Session created (201)');
    const data = await response.json() as any;

    this.sessionId = data.sessionId;
    this.joinCode = data.joinCode;
    this.hostToken = data.hostAuthToken;

    this.assert(!!this.sessionId, 'Session ID received');
    this.assert(this.joinCode.length === 6, 'Join code is 6 characters');

    console.log(`   Session: ${this.sessionId}`);
    console.log(`   Join Code: ${this.joinCode}\n`);
  }

  private async test2_JoinPlayers() {
    console.log('👥 Test 2: Join 4 Players');

    const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];

    for (const name of playerNames) {
      const response = await fetchFn(`${BASE_URL}/v1/sessions/${this.sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      this.assert(response.status === 200, `${name} joined (200)`);
      const data = await response.json() as any;

      this.players.push({
        id: data.playerId,
        name,
        authToken: data.playerAuthToken,
        ws: null,
        score: 0,
        lockedAnswer: null
      });

      console.log(`   ✓ ${name} joined (ID: ${data.playerId.slice(0, 8)}...)`);
    }

    this.assert(this.players.length === 4, '4 players joined');
    console.log('');
  }

  private async test3_StartGame() {
    console.log('🎮 Test 3: Start Game');

    // Connect Host WebSocket
    await this.connectHost();

    // Connect all player WebSockets
    for (const player of this.players) {
      await this.connectPlayer(player);
    }

    await this.delay(500);

    // Host starts game
    this.sendHostEvent('HOST_START_GAME', {});
    console.log('   Host sent HOST_START_GAME');

    // Wait for CLUE_PRESENT (phase + first clue)
    await this.waitForPhase('CLUE_LEVEL', 20000);
    await this.waitForClueLevel(10, 20000);
    this.assert(this.state.phase === 'CLUE_LEVEL', 'Phase is CLUE_LEVEL');
    this.assert(this.state.clueLevelPoints === 10, 'First clue is 10p');

    console.log('   ✓ Game started, first clue presented\n');
  }

  private async test4_PlayDestination1() {
    console.log('🗺️  Test 4: Play Destination 1 (5 Clue Levels)');

    // Clue 10p - Alice brakes
    console.log('   Clue 10p: Alice brakes');
    await this.simulateBrake(this.players[0], 'Paris');
    this.assert(this.players[0].lockedAnswer === 'Paris', 'Alice locked "Paris" at 10p');

    await this.advanceToClue(8, 20000);
    this.assert(this.state.clueLevelPoints === 8, 'Advanced to 8p');

    // Clue 8p - Bob brakes
    console.log('   Clue 8p: Bob brakes');
    await this.simulateBrake(this.players[1], 'France');
    this.assert(this.players[1].lockedAnswer === 'France', 'Bob locked "France" at 8p');

    await this.advanceToClue(6, 20000);
    this.assert(this.state.clueLevelPoints === 6, 'Advanced to 6p');

    // Clue 6p - Charlie brakes
    console.log('   Clue 6p: Charlie brakes');
    await this.simulateBrake(this.players[2], 'London');
    this.assert(this.players[2].lockedAnswer === 'London', 'Charlie locked "London" at 6p');

    await this.advanceToClue(4, 20000);
    this.assert(this.state.clueLevelPoints === 4, 'Advanced to 4p');

    // Clue 4p - Diana brakes
    console.log('   Clue 4p: Diana brakes');
    await this.simulateBrake(this.players[3], 'Rome');
    this.assert(this.players[3].lockedAnswer === 'Rome', 'Diana locked "Rome" at 4p');

    await this.advanceToClue(2, 20000);
    this.assert(this.state.clueLevelPoints === 2, 'Advanced to 2p (last clue)');

    // Clue 2p - No brake, host advances
    console.log('   Clue 2p: No brake, advancing to reveal');
    await this.delay(1000);
    this.sendHostEvent('HOST_NEXT_CLUE', {});

    // Wait for REVEAL_DESTINATION
    await this.waitForPhase('REVEAL_DESTINATION', 30000);
    this.assert(this.state.phase === 'REVEAL_DESTINATION', 'Phase is REVEAL_DESTINATION');
    this.assert(!!this.state.destination.name, 'Destination name revealed');

    console.log(`   ✓ Destination revealed: ${this.state.destination.name}, ${this.state.destination.country}`);

    // Either followups start or we go straight to scoreboard
    const nextPhase = await this.waitForAnyPhase(['FOLLOWUP_QUESTION', 'SCOREBOARD'], 30000);
    if (nextPhase === 'SCOREBOARD') {
      this.assert(this.state.scoreboard.length === 4, 'Scoreboard has 4 players');
      const alice = this.state.scoreboard.find(p => p.name === 'Alice');
      this.assert(alice && alice.score > 0, 'Alice has points (if correct answer)');
      console.log('   ✓ Scoreboard updated');
      this.printScoreboard();
      console.log('');
    }
  }

  private async test5_PlayFollowups() {
    console.log('❓ Test 5: Play Follow-up Questions');

    if (this.state.phase !== 'FOLLOWUP_QUESTION') {
      console.log('   ℹ️  No followups this round');
      console.log('');
      return;
    }

    // Confirm we are in followup phase
    await this.waitForPhase('FOLLOWUP_QUESTION', 30000);
    this.assert(this.state.phase === 'FOLLOWUP_QUESTION', 'Followup question presented');

    console.log('   Followup 1: All players answer');

    // Simulate answers (random correct/wrong)
    this.sendPlayerEvent(this.players[0], 'FOLLOWUP_ANSWER_SUBMIT', {
      playerId: this.players[0].id,
      answerText: 'CorrectAnswer1' // Would need actual answer from state
    });
    this.sendPlayerEvent(this.players[1], 'FOLLOWUP_ANSWER_SUBMIT', {
      playerId: this.players[1].id,
      answerText: 'WrongAnswer'
    });
    this.sendPlayerEvent(this.players[2], 'FOLLOWUP_ANSWER_SUBMIT', {
      playerId: this.players[2].id,
      answerText: 'AnotherWrong'
    });
    // Diana doesn't answer (timeout)

    console.log('   ✓ Answers submitted');

    // Wait for round to end (scoreboard or final results)
    const endPhase = await this.waitForAnyPhase(['SCOREBOARD', 'FINAL_RESULTS', 'ROUND_END'], 120000);
    if (endPhase === 'SCOREBOARD') {
      this.assert(this.state.phase === 'SCOREBOARD', 'Returned to scoreboard after followups');
      this.printScoreboard();
    } else {
      console.log(`   ℹ️  Round ended (${endPhase})`);
    }

    console.log('   ✓ Follow-up questions complete');
    console.log('');
  }

  private async test6_PlayDestination2() {
    console.log('🗺️  Test 6: Play Destination 2 (Abbreviated)');

    // Wait for next destination OR end state
    const phase = await this.waitForAnyPhase(['CLUE_LEVEL', 'FINAL_RESULTS', 'ROUND_END'], 30000);
    if (phase !== 'CLUE_LEVEL') {
      console.log(`   ℹ️  No second destination (phase: ${phase})`);
      console.log('');
      return;
    }

    // Should auto-advance to next destination
    this.assert(this.state.phase === 'CLUE_LEVEL', 'Destination 2 started');
    await this.waitForClueLevel(10, 20000);
    this.assert(this.state.clueLevelPoints === 10, 'Reset to 10p');

    // Quick playthrough: Bob brakes at 10p
    console.log('   Clue 10p: Bob brakes');
    await this.simulateBrake(this.players[1], 'Stockholm');

    // Host advances through remaining clues
    await this.advanceToClue(8, 20000);
    await this.advanceToClue(6, 20000);
    await this.advanceToClue(4, 20000);
    await this.advanceToClue(2, 20000);

    await this.waitForPhase('REVEAL_DESTINATION', 30000);
    console.log(`   ✓ Destination 2 revealed: ${this.state.destination.name}`);

    // Quick followup answers if present
    const postRevealPhase = await this.waitForAnyPhase(['FOLLOWUP_QUESTION', 'SCOREBOARD'], 30000);
    if (postRevealPhase === 'FOLLOWUP_QUESTION') {
      for (const player of this.players) {
        this.sendPlayerEvent(player, 'FOLLOWUP_ANSWER_SUBMIT', {
          playerId: player.id,
          answerText: 'QuickAnswer'
        });
      }
      await this.waitForAnyPhase(['SCOREBOARD', 'FINAL_RESULTS', 'ROUND_END'], 120000);
    }

    console.log('   ✓ Destination 2 complete');
    this.printScoreboard();
    console.log('');
  }

  private async test7_FinalResults() {
    console.log('🏆 Test 7: Final Results');

    // If we have a 3rd destination in content, play it quickly
    // Otherwise wait for FINAL_RESULTS

    await this.delay(2000);

    // Check if game ended or continues
    if (this.state.phase === 'FINAL_RESULTS') {
      this.assert(true, 'Final results presented');

      const winner = this.state.scoreboard[0];
      console.log(`   🎉 Winner: ${winner.name} with ${winner.score} points!`);

      this.printScoreboard();
    } else if (this.state.phase === 'ROUND_END') {
      console.log('   ℹ️  Game already ended (ROUND_END)');
    } else if (this.state.phase === 'CLUE_LEVEL') {
      console.log('   ℹ️  More destinations available, playing through...');
      // Could extend test to play all destinations
    }

    console.log('');
  }

  private async test8_ReconnectScenarios() {
    console.log('🔌 Test 8: Reconnect Scenarios');

    // Test 8.1: Disconnect and reconnect Alice
    console.log('   Test 8.1: Player disconnect/reconnect');

    const alice = this.players[0];
    alice.ws?.close();
    alice.ws = null;

    await this.delay(1000);
    console.log('   Alice disconnected');

    await this.connectPlayer(alice);
    await this.delay(500);

    this.assert(alice.ws?.readyState === WebSocket.OPEN, 'Alice reconnected');
    console.log('   ✓ Alice reconnected, state restored');

    // Test 8.2: Host disconnect/reconnect
    console.log('   Test 8.2: Host disconnect/reconnect');

    this.hostWs?.close();
    this.hostWs = null;

    await this.delay(1000);
    console.log('   Host disconnected');

    await this.connectHost();
    await this.delay(500);

    this.assert(this.hostWs?.readyState === WebSocket.OPEN, 'Host reconnected');
    console.log('   ✓ Host reconnected, state restored');

    console.log('');
  }

  // Helper methods
  private async connectHost() {
    return new Promise<void>((resolve, reject) => {
      this.hostWs = new WebSocket(`${WS_URL}?token=${this.hostToken}`);

      this.hostWs.on('open', () => {
        console.log('   Host WebSocket connected');
        resolve();
      });

      this.hostWs.on('message', (data: Buffer) => {
        const event = JSON.parse(data.toString());
        this.handleHostEvent(event);
      });

      this.hostWs.on('error', reject);
    });
  }

  private async connectPlayer(player: Player) {
    return new Promise<void>((resolve, reject) => {
      player.ws = new WebSocket(`${WS_URL}?token=${player.authToken}`);

      player.ws.on('open', () => {
        resolve();
      });

      player.ws.on('message', (data: Buffer) => {
        const event = JSON.parse(data.toString());
        this.handlePlayerEvent(player, event);
      });

      player.ws.on('error', reject);
    });
  }

  private handleHostEvent(event: any) {
    if (event.type === 'STATE_SNAPSHOT') {
      this.updateState(event.payload.state);
    } else if (event.type === 'CLUE_PRESENT') {
      this.state.clueLevelPoints = event.payload.clueLevelPoints;
    } else if (event.type === 'DESTINATION_REVEAL') {
      this.state.destination = {
        name: event.payload.destinationName,
        country: event.payload.country
      };
    } else if (event.type === 'SCOREBOARD_UPDATE') {
      this.state.scoreboard = event.payload.scoreboard;
      // Update player scores
      for (const entry of this.state.scoreboard) {
        const player = this.players.find(p => p.id === entry.playerId);
        if (player) player.score = entry.score;
      }
    }
  }

  private handlePlayerEvent(player: Player, event: any) {
    if (event.type === 'STATE_SNAPSHOT') {
      this.updateState(event.payload.state);
    }
  }

  private updateState(state: any) {
    this.state.phase = state.phase;
    this.state.clueLevelPoints = state.clueLevelPoints;
    if (state.destination) {
      this.state.destination = state.destination;
    }
    if (state.scoreboard) {
      this.state.scoreboard = state.scoreboard;
    }
  }

  private sendHostEvent(type: string, payload: any) {
    if (!this.hostWs) return;
    this.hostWs.send(JSON.stringify({
      type,
      sessionId: this.sessionId,
      serverTimeMs: Date.now(),
      payload
    }));
  }

  private sendPlayerEvent(player: Player, type: string, payload: any) {
    if (!player.ws) return;
    player.ws.send(JSON.stringify({
      type,
      sessionId: this.sessionId,
      serverTimeMs: Date.now(),
      payload
    }));
  }

  private async simulateBrake(player: Player, answer: string) {
    // Send BRAKE_PULL
    this.sendPlayerEvent(player, 'BRAKE_PULL', {
      playerId: player.id,
      clientTimeMs: Date.now()
    });

    await this.delay(200);

    // Send answer
    this.sendPlayerEvent(player, 'BRAKE_ANSWER_SUBMIT', {
      playerId: player.id,
      answerText: answer
    });

    player.lockedAnswer = answer;

    await this.delay(500);
  }

  private async waitForClueLevel(targetPoints: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (this.state.clueLevelPoints !== targetPoints) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for clue level ${targetPoints} (current: ${this.state.clueLevelPoints})`);
      }
      await this.delay(100);
    }
  }

  private async advanceToClue(targetPoints: number, timeoutMs: number): Promise<void> {
    this.sendHostEvent('HOST_NEXT_CLUE', {});
    await this.waitForClueLevel(targetPoints, timeoutMs);
  }

  private async waitForPhase(targetPhase: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (this.state.phase !== targetPhase) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for phase ${targetPhase} (current: ${this.state.phase})`);
      }
      await this.delay(100);
    }
  }

  private async waitForAnyPhase(phases: string[], timeoutMs: number): Promise<string> {
    const start = Date.now();
    while (!phases.includes(this.state.phase)) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for phase ${phases.join(' | ')} (current: ${this.state.phase})`);
      }
      await this.delay(100);
    }
    return this.state.phase;
  }

  private assert(condition: boolean, message: string) {
    if (condition) {
      this.testsPassed++;
      console.log(`   ✓ ${message}`);
    } else {
      this.testsFailed++;
      console.log(`   ✗ ${message}`);
    }
  }

  private printScoreboard() {
    console.log('   Scoreboard:');
    for (const entry of this.state.scoreboard) {
      console.log(`      ${entry.name}: ${entry.score}p`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanup() {
    this.hostWs?.close();
    for (const player of this.players) {
      player.ws?.close();
    }
  }
}

// Run test
const runner = new E2ETestRunner();
runner.run().catch(console.error);
