/**
 * Unit tests for state projection
 * Verifies that secrets don't leak to players/TV
 */

import { describe, it, expect } from '@jest/globals';
import { projectState } from './state-projection';
import type { GameState } from '../types/state';
import type { Role } from '../types/events';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const createFullState = (): GameState => ({
  sessionId: 'test-session-001',
  phase: 'CLUE_LEVEL',
  players: [
    {
      playerId: 'host-001',
      name: 'Host User',
      role: 'host',
      joinedAt: '2026-02-10T10:00:00Z',
      disconnectedAt: '2026-02-10T10:05:00Z', // Should be filtered
    },
    {
      playerId: 'player-001',
      name: 'Alice',
      role: 'player',
      joinedAt: '2026-02-10T10:00:00Z',
    },
    {
      playerId: 'player-002',
      name: 'Bob',
      role: 'player',
      joinedAt: '2026-02-10T10:00:00Z',
      disconnectedAt: '2026-02-10T10:03:00Z', // Should be filtered
    },
    {
      playerId: 'tv-001',
      name: 'TV',
      role: 'tv',
      joinedAt: '2026-02-10T10:00:00Z',
    },
  ],
  destination: {
    name: 'Tokyo',
    country: 'Japan',
    aliases: ['tokyo', 'tokio'],
    revealed: false,
  },
  currentClue: {
    level: 10,
    text: 'This city hosted the 2021 Olympics',
  },
  clueLevelPoints: 10,
  lockedAnswers: [
    {
      playerId: 'player-001',
      answerText: 'Tokyo',
      lockedAtLevelPoints: 10,
      lockedAtMs: 1739184000000,
    },
    {
      playerId: 'player-002',
      answerText: 'Paris',
      lockedAtLevelPoints: 10,
      lockedAtMs: 1739184005000,
    },
  ],
  scoreboard: [
    { playerId: 'player-001', name: 'Alice', score: 10, rank: 1 },
    { playerId: 'player-002', name: 'Bob', score: 0, rank: 2 },
  ],
  brakeOwnerPlayerId: 'player-001',
  totalActivePlayers: 2,
  answeredCount: 2,
  brakeFairness: {
    'player-001': 10,
  },
  audioState: {
    currentVoiceLineUrl: 'https://example.com/tts/clue10.mp3',
    currentVoiceLineText: 'This city hosted the 2021 Olympics',
    currentMusic: {
      type: 'TRAVEL',
      url: 'https://example.com/music/travel.mp3',
    },
    ttsManifest: {
      intro: 'https://example.com/tts/intro.mp3',
      clues: ['url1', 'url2', 'url3', 'url4', 'url5'],
      reveal: 'https://example.com/tts/reveal.mp3',
    },
  },
  followupQuestion: {
    index: 0,
    totalCount: 2,
    questionText: 'What is the capital district of Tokyo?',
    options: ['Chiyoda', 'Shibuya', 'Shinjuku', 'Minato'],
    correctAnswer: 'Chiyoda',
    answersByPlayer: [
      { playerId: 'player-001', answerText: 'Chiyoda', answeredAtMs: 1739184010000 },
      { playerId: 'player-002', answerText: 'Shibuya', answeredAtMs: 1739184012000 },
    ],
    timer: {
      timerId: 'fq-timer-001',
      startAtServerMs: 1739184000000,
      durationMs: 25000,
    },
  },
});

// ---------------------------------------------------------------------------
// Tests: HOST Projection
// ---------------------------------------------------------------------------

describe('projectState - HOST role', () => {
  it('should see full state (no filtering)', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'host');

    expect(projected).toEqual(fullState);
    expect(projected.destination?.name).toBe('Tokyo');
    expect(projected.destination?.revealed).toBe(false);
    expect(projected.lockedAnswers).toHaveLength(2);
    expect(projected.lockedAnswers[0].answerText).toBe('Tokyo');
    expect(projected.followupQuestion?.correctAnswer).toBe('Chiyoda');
    expect(projected.followupQuestion?.answersByPlayer).toHaveLength(2);
    expect(projected.audioState?.ttsManifest).toBeDefined();
  });

  it('should filter disconnectedAt from players', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'host');

    projected.players.forEach((player) => {
      expect(player).not.toHaveProperty('disconnectedAt');
    });
  });

  it('should see all player roles (host, player, tv)', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'host');

    expect(projected.players).toHaveLength(4);
    const roles = projected.players.map((p) => p.role);
    expect(roles).toContain('host');
    expect(roles).toContain('player');
    expect(roles).toContain('tv');
  });
});

// ---------------------------------------------------------------------------
// Tests: PLAYER Projection
// ---------------------------------------------------------------------------

describe('projectState - PLAYER role', () => {
  it('should NOT see destination name before reveal', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.destination?.name).toBeNull();
    expect(projected.destination?.country).toBeNull();
    expect(projected.destination?.aliases).toEqual([]);
    expect(projected.destination?.revealed).toBe(false);
  });

  it('should see destination name after reveal', () => {
    const fullState = createFullState();
    fullState.destination!.revealed = true;
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.destination?.name).toBe('Tokyo');
    expect(projected.destination?.country).toBe('Japan');
    expect(projected.destination?.aliases).toEqual(['tokyo', 'tokio']);
    expect(projected.destination?.revealed).toBe(true);
  });

  it('should only see own locked answer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.lockedAnswers).toHaveLength(1);
    expect(projected.lockedAnswers[0].playerId).toBe('player-001');
    expect(projected.lockedAnswers[0].answerText).toBe('Tokyo');
  });

  it('should NOT see other players locked answers', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    const hasOtherPlayerAnswer = projected.lockedAnswers.some(
      (answer) => answer.playerId === 'player-002'
    );
    expect(hasOtherPlayerAnswer).toBe(false);
  });

  it('should only see role=player entries in players list', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.players).toHaveLength(2); // Only player-001 and player-002
    projected.players.forEach((player) => {
      expect(player.role).toBe('player');
    });
  });

  it('should NOT see audioState', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.audioState).toBeUndefined();
  });

  it('should NOT see followup correctAnswer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.followupQuestion?.correctAnswer).toBeNull();
  });

  it('should NOT see followup answersByPlayer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.followupQuestion?.answersByPlayer).toEqual([]);
  });

  it('should see answeredByMe=true if player answered', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.followupQuestion?.answeredByMe).toBe(true);
  });

  it('should see answeredByMe=false if player did not answer', () => {
    const fullState = createFullState();
    fullState.followupQuestion!.answersByPlayer = []; // No one answered
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.followupQuestion?.answeredByMe).toBe(false);
  });

  it('should handle missing playerId gracefully', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player'); // No playerId

    // Should not crash, but lockedAnswers filtered to empty
    expect(projected.lockedAnswers).toEqual([]);
    expect(projected.followupQuestion?.answeredByMe).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: TV Projection
// ---------------------------------------------------------------------------

describe('projectState - TV role', () => {
  it('should NOT see destination name before reveal', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.destination?.name).toBeNull();
    expect(projected.destination?.country).toBeNull();
    expect(projected.destination?.aliases).toEqual([]);
    expect(projected.destination?.revealed).toBe(false);
  });

  it('should see destination name after reveal', () => {
    const fullState = createFullState();
    fullState.destination!.revealed = true;
    const projected = projectState(fullState, 'tv');

    expect(projected.destination?.name).toBe('Tokyo');
    expect(projected.destination?.country).toBe('Japan');
    expect(projected.destination?.revealed).toBe(true);
  });

  it('should NOT see locked answers before reveal', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.lockedAnswers).toEqual([]);
  });

  it('should see locked answers (without answerText) after reveal', () => {
    const fullState = createFullState();
    fullState.destination!.revealed = true;
    const projected = projectState(fullState, 'tv');

    expect(projected.lockedAnswers).toHaveLength(2);
    projected.lockedAnswers.forEach((answer) => {
      expect(answer.answerText).toBe('');
      expect(answer.playerId).toBeDefined();
      expect(answer.lockedAtLevelPoints).toBeDefined();
    });
  });

  it('should only see role=player entries in players list', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.players).toHaveLength(2); // Only player-001 and player-002
    projected.players.forEach((player) => {
      expect(player.role).toBe('player');
    });
  });

  it('should see audioState but NOT ttsManifest', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.audioState).toBeDefined();
    expect(projected.audioState?.currentVoiceLineUrl).toBeDefined();
    expect(projected.audioState?.currentMusic).toBeDefined();
    expect(projected.audioState).not.toHaveProperty('ttsManifest');
  });

  it('should NOT see followup correctAnswer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.followupQuestion?.correctAnswer).toBeNull();
  });

  it('should NOT see followup answersByPlayer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.followupQuestion?.answersByPlayer).toEqual([]);
  });

  it('should NOT have answeredByMe property', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.followupQuestion).not.toHaveProperty('answeredByMe');
  });
});

// ---------------------------------------------------------------------------
// Tests: Edge Cases
// ---------------------------------------------------------------------------

describe('projectState - Edge Cases', () => {
  it('should handle state without destination', () => {
    const fullState = createFullState();
    fullState.destination = undefined;

    const projected = projectState(fullState, 'player', 'player-001');
    expect(projected.destination).toBeUndefined();
  });

  it('should handle state without followupQuestion', () => {
    const fullState = createFullState();
    fullState.followupQuestion = undefined;

    const projectedPlayer = projectState(fullState, 'player', 'player-001');
    expect(projectedPlayer.followupQuestion).toBeUndefined();

    const projectedTV = projectState(fullState, 'tv');
    expect(projectedTV.followupQuestion).toBeUndefined();
  });

  it('should handle state without audioState', () => {
    const fullState = createFullState();
    fullState.audioState = undefined;

    const projectedTV = projectState(fullState, 'tv');
    expect(projectedTV.audioState).toBeUndefined();

    const projectedPlayer = projectState(fullState, 'player', 'player-001');
    expect(projectedPlayer.audioState).toBeUndefined();
  });

  it('should handle empty locked answers', () => {
    const fullState = createFullState();
    fullState.lockedAnswers = [];

    const projectedPlayer = projectState(fullState, 'player', 'player-001');
    expect(projectedPlayer.lockedAnswers).toEqual([]);

    const projectedTV = projectState(fullState, 'tv');
    expect(projectedTV.lockedAnswers).toEqual([]);
  });

  it('should handle empty players list', () => {
    const fullState = createFullState();
    fullState.players = [];

    const projected = projectState(fullState, 'player', 'player-001');
    expect(projected.players).toEqual([]);
  });

  it('should not mutate original state', () => {
    const fullState = createFullState();
    const originalJSON = JSON.stringify(fullState);

    projectState(fullState, 'player', 'player-001');

    const afterJSON = JSON.stringify(fullState);
    expect(afterJSON).toBe(originalJSON);
  });
});

// ---------------------------------------------------------------------------
// Tests: Security Verifications
// ---------------------------------------------------------------------------

describe('projectState - Security Verifications', () => {
  it('SECURITY: Player should NEVER see other players answers before reveal', () => {
    const fullState = createFullState();
    fullState.destination!.revealed = false; // Explicitly not revealed

    const projected = projectState(fullState, 'player', 'player-001');

    // Should only see own answer
    expect(projected.lockedAnswers).toHaveLength(1);
    expect(projected.lockedAnswers.every((a) => a.playerId === 'player-001')).toBe(true);
  });

  it('SECURITY: TV should NEVER see answer text (even after reveal)', () => {
    const fullState = createFullState();
    fullState.destination!.revealed = true;

    const projected = projectState(fullState, 'tv');

    projected.lockedAnswers.forEach((answer) => {
      expect(answer.answerText).toBe('');
    });
  });

  it('SECURITY: Player should NEVER see followup correctAnswer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.followupQuestion?.correctAnswer).toBeNull();
  });

  it('SECURITY: TV should NEVER see followup correctAnswer', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.followupQuestion?.correctAnswer).toBeNull();
  });

  it('SECURITY: Player should NEVER see ttsManifest', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'player', 'player-001');

    expect(projected.audioState).toBeUndefined();
  });

  it('SECURITY: TV should NEVER see ttsManifest', () => {
    const fullState = createFullState();
    const projected = projectState(fullState, 'tv');

    expect(projected.audioState).toBeDefined();
    expect(projected.audioState).not.toHaveProperty('ttsManifest');
  });

  it('SECURITY: No disconnectedAt timestamps should leak to any non-host role', () => {
    const fullState = createFullState();

    const projectedPlayer = projectState(fullState, 'player', 'player-001');
    projectedPlayer.players.forEach((p) => {
      expect(p).not.toHaveProperty('disconnectedAt');
    });

    const projectedTV = projectState(fullState, 'tv');
    projectedTV.players.forEach((p) => {
      expect(p).not.toHaveProperty('disconnectedAt');
    });
  });
});
