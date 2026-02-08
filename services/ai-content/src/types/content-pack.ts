/**
 * Content Pack Types
 *
 * Defines the structure for AI-generated game rounds.
 * Compatible with backend's content-hardcoded.ts structure.
 */

export interface Clue {
  level: 10 | 8 | 6 | 4 | 2;
  text: string;
}

export interface FollowupQuestion {
  questionText: string;
  options: string[];           // 4 options for multiple choice
  correctAnswer: string;       // must be one of the options
}

export interface Destination {
  name: string;
  country: string;
  aliases: string[];           // lowercase normalized alternatives
}

export interface VerificationResult {
  verified: boolean;
  status: 'verified' | 'uncertain' | 'rejected';
  reason?: string;
  sources?: string[];
}

export interface ContentPack {
  roundId: string;
  destination: Destination;
  clues: Clue[];
  followups: FollowupQuestion[];
  metadata: {
    generatedAt: string;       // ISO timestamp
    verified: boolean;
    antiLeakChecked: boolean;
    verificationDetails?: {
      destinationVerified: VerificationResult;
      cluesVerified: VerificationResult[];
      followupsVerified: VerificationResult[];
      antiLeakPassed: boolean;
    };
  };
}

/**
 * Progress tracking for generation process
 */
export interface GenerationProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  roundId?: string;
  destination?: string;
}

/**
 * Final response from generation endpoint
 */
export interface GenerationResponse {
  success: boolean;
  contentPack?: ContentPack;
  progress?: GenerationProgress;
  error?: string;
}
