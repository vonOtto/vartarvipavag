// Type definitions from contracts/events.schema.json and contracts/state.schema.json

export type Role = 'host' | 'player' | 'tv';

export type GamePhase =
  | 'LOBBY'
  | 'PREPARING_ROUND'
  | 'ROUND_INTRO'
  | 'CLUE_LEVEL'
  | 'PAUSED_FOR_BRAKE'
  | 'REVEAL_DESTINATION'
  | 'FOLLOWUP_QUESTION'
  | 'SCOREBOARD'
  | 'FINAL_RESULTS'
  | 'ROUND_END';

export type ClueLevelPoints = 10 | 8 | 6 | 4 | 2;

export interface Player {
  playerId: string;
  name: string;
  role: Role;
  isConnected: boolean;
  joinedAtMs: number;
  score: number;
}

export interface Destination {
  name: string | null;
  country: string | null;
  aliases?: string[];
  revealed: boolean;
}

export interface LockedAnswer {
  playerId: string;
  answerText: string;
  lockedAtLevelPoints: ClueLevelPoints;
  lockedAtMs: number;
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  score: number;
  rank?: number;
}

export interface Timer {
  timerId: string;
  startAtServerMs: number;
  durationMs: number;
}

export interface FollowupPlayerAnswer {
  playerId: string;
  playerName: string;
  answerText: string;
}

export interface FollowupQuestionState {
  questionText: string;
  options: string[] | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  correctAnswer?: string | null;   // HOST-only — absent for PLAYER
  answersByPlayer?: FollowupPlayerAnswer[]; // HOST-only — absent for PLAYER
  timer: Timer | null;
  answeredByMe?: boolean;          // PLAYER helper — computed per connection
}

export interface GameState {
  version: number;
  phase: GamePhase;
  sessionId: string;
  joinCode: string;
  players: Player[];
  roundIndex?: number;
  destination?: Destination;
  clueLevelPoints: ClueLevelPoints | null;
  clueText: string | null;
  brakeOwnerPlayerId: string | null;
  lockedAnswers: LockedAnswer[];
  followupQuestion: FollowupQuestionState | null;
  scoreboard: ScoreboardEntry[];
  timer?: Timer | null;
}

// Event envelope
export interface EventEnvelope<T = any> {
  type: string;
  sessionId: string;
  serverTimeMs: number;
  payload: T;
}

// Event payloads
export interface WelcomePayload {
  connectionId: string;
  role: Role;
  playerId: string;
  serverTimeMs: number;
  timeOffsetHintMs?: number;
}

export interface StateSnapshotPayload {
  state: GameState;
  missedEvents?: EventEnvelope[];
}

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
  host?: { name: string };
}

export interface CluePresentPayload {
  clueText: string;
  clueLevelPoints: ClueLevelPoints;
  roundIndex: number;
  clueIndex?: number;
  textRevealAfterMs?: number;   // TTS clip duration — text hidden until this many ms have elapsed
}

export interface ClueAdvancePayload {
  nextClueLevelPoints: ClueLevelPoints;
  advanceInMs?: number;
}

export interface BrakeAcceptedPayload {
  playerId: string;
  playerName: string;
  clueLevelPoints: ClueLevelPoints;
  answerTimeoutMs?: number;
}

export interface BrakeRejectedPayload {
  playerId: string;
  reason: 'too_late' | 'rate_limited' | 'already_paused' | 'invalid_phase';
  winnerPlayerId?: string;
}

export interface BrakeAnswerLockedPayload {
  playerId: string;
  lockedAtLevelPoints: ClueLevelPoints;
  answerText?: string;
  remainingClues?: boolean;
}

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
    lockedAtLevelPoints: ClueLevelPoints;
  }>;
}

export interface ScoreboardUpdatePayload {
  scoreboard: ScoreboardEntry[];
  isGameOver?: boolean;
}

export interface FollowupQuestionPresentPayload {
  questionText: string;
  options: string[] | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerDurationMs: number;
  correctAnswer?: string;          // HOST-only
}

export interface FollowupAnswersLockedPayload {
  currentQuestionIndex: number;
  lockedPlayerCount: number;
  answersByPlayer?: FollowupPlayerAnswer[]; // HOST-only
}

export interface FollowupResultsPayload {
  currentQuestionIndex: number;
  correctAnswer: string;
  results: Array<{
    playerId: string;
    playerName: string;
    answerText: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>;
  nextQuestionIndex: number | null;
}

export interface ErrorPayload {
  errorCode: 'INVALID_SESSION' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID_PHASE' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
  message: string;
  details?: any;
}

// Typed events
export type GameEvent =
  | EventEnvelope<WelcomePayload>
  | EventEnvelope<StateSnapshotPayload>
  | EventEnvelope<PlayerJoinedPayload>
  | EventEnvelope<PlayerLeftPayload>
  | EventEnvelope<LobbyUpdatedPayload>
  | EventEnvelope<CluePresentPayload>
  | EventEnvelope<ClueAdvancePayload>
  | EventEnvelope<BrakeAcceptedPayload>
  | EventEnvelope<BrakeRejectedPayload>
  | EventEnvelope<BrakeAnswerLockedPayload>
  | EventEnvelope<DestinationRevealPayload>
  | EventEnvelope<DestinationResultsPayload>
  | EventEnvelope<ScoreboardUpdatePayload>
  | EventEnvelope<FollowupQuestionPresentPayload>
  | EventEnvelope<FollowupAnswersLockedPayload>
  | EventEnvelope<FollowupResultsPayload>
  | EventEnvelope<ErrorPayload>;
