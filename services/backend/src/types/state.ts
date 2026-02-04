/**
 * Game state types based on contracts/state.schema.json
 */

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

export interface Player {
  playerId: string;
  name: string;
  role: 'player' | 'host' | 'tv';
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
  lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2;
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

export interface AudioState {
  currentTrackId: string | null;
  isPlaying: boolean;
  gainDb: number;
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
  correctAnswer: string | null;       // HOST only until FOLLOWUP_RESULTS
  answersByPlayer: FollowupPlayerAnswer[]; // HOST only until FOLLOWUP_RESULTS
  timer: {
    timerId: string;
    startAtServerMs: number;
    durationMs: number;
  } | null;
  answeredByMe?: boolean;             // PLAYER projection helper — computed per connection
}

export interface GameState {
  version: number;
  phase: GamePhase;
  sessionId: string;
  joinCode: string;
  players: Player[];
  roundIndex?: number;
  destination?: Destination;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2 | null;
  clueText: string | null;
  brakeOwnerPlayerId: string | null;
  lockedAnswers: LockedAnswer[];
  followupQuestion: FollowupQuestionState | null;
  scoreboard: ScoreboardEntry[];
  timer?: Timer | null;
  audioState?: AudioState;
}
