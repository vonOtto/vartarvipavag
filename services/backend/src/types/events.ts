/**
 * Event types and payloads based on contracts/events.schema.json
 */

export type Role = 'HOST' | 'PLAYER' | 'TV';

/**
 * Base envelope for all WebSocket events
 */
export interface EventEnvelope<T = any> {
  type: string;
  sessionId: string;
  serverTimeMs: number;
  payload: T;
}

// Connection/Auth Events

export interface HelloPayload {
  role: Role;
  authToken: string;
  clientVersion: string;
  deviceId?: string;
  playerName?: string;
}

export interface WelcomePayload {
  connectionId: string;
  role: Role;
  playerId: string;
  serverTimeMs: number;
  timeOffsetHintMs?: number;
}

export interface ResumeSessionPayload {
  playerId: string;
  lastReceivedEventId: string;
  deviceId?: string;
}

export interface StateSnapshotPayload {
  state: any; // Will be defined based on state.schema.json
  missedEvents?: EventEnvelope[];
}

// Lobby Events

export interface PlayerJoinedPayload {
  playerId: string;
  name: string;
  joinedAtMs: number;
  isReconnect?: boolean;
}

export interface PlayerLeftPayload {
  playerId: string;
  reason: 'disconnect' | 'kicked' | 'timeout';
}

export interface LobbyUpdatedPayload {
  players: Array<{
    playerId: string;
    name: string;
    isConnected: boolean;
  }>;
  joinCode: string;
}

// Game Control

export interface HostStartGamePayload {
  confirmedPlayers?: string[];
}

// Clue Flow

export interface CluePresentPayload {
  clueText: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  roundIndex: number;
  clueIndex?: number;
}

export interface ClueAdvancePayload {
  nextClueLevelPoints: 10 | 8 | 6 | 4 | 2;
  advanceInMs?: number;
}

// Brake Events

export interface BrakePullPayload {
  playerId: string;
  clientTimeMs: number;
}

export interface BrakeAcceptedPayload {
  playerId: string;
  playerName: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  answerTimeoutMs?: number;
}

export interface BrakeRejectedPayload {
  playerId: string;
  reason: 'too_late' | 'rate_limited' | 'already_paused' | 'invalid_phase';
  winnerPlayerId?: string;
}

export interface BrakeAnswerSubmitPayload {
  playerId: string;
  answerText: string;
}

export interface BrakeAnswerLockedPayload {
  playerId: string;
  lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2;
  answerText?: string; // Only visible to HOST
  remainingClues?: boolean;
}

// Reveal Events

export interface DestinationRevealPayload {
  destinationName: string;
  country: string;
  aliases?: string[];
  revealDelayMs?: number;
}

export interface DestinationResultsPayload {
  results: Array<{
    playerId: string;
    playerName: string;
    answerText: string;
    isCorrect: boolean;
    pointsAwarded: number;
    lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2;
  }>;
}

export interface ScoreboardUpdatePayload {
  scoreboard: Array<{
    playerId: string;
    name: string;
    score: number;
    rank?: number;
  }>;
  isGameOver?: boolean;
}

// Error Event

export interface ErrorPayload {
  errorCode: 'INVALID_SESSION' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID_PHASE' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
  message: string;
  details?: any;
}

// Type-safe event creators
export type EventType =
  | 'HELLO'
  | 'WELCOME'
  | 'RESUME_SESSION'
  | 'STATE_SNAPSHOT'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'LOBBY_UPDATED'
  | 'HOST_START_GAME'
  | 'CLUE_PRESENT'
  | 'CLUE_ADVANCE'
  | 'BRAKE_PULL'
  | 'BRAKE_ACCEPTED'
  | 'BRAKE_REJECTED'
  | 'BRAKE_ANSWER_SUBMIT'
  | 'BRAKE_ANSWER_LOCKED'
  | 'DESTINATION_REVEAL'
  | 'DESTINATION_RESULTS'
  | 'SCOREBOARD_UPDATE'
  | 'ERROR';
