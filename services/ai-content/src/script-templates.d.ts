/**
 * Script Templates — Förbättrade dialogmallar med SSML breaks för naturliga pauser
 *
 * Alla texter innehåller SSML markup för att skapa bättre timing och naturlighet.
 * ElevenLabs TTS stödjer SSML breaks (<break time="500ms"/>).
 *
 * Timing-principer:
 * - Korta pauser (300-500ms): mellan meningar i samma tanke
 * - Medellånga pauser (700-1000ms): mellan tankeskiften
 * - Långa pauser (1500-2000ms): innan dramatiska moment (reveal, etc)
 *
 * Version: 1.0.0
 */
export declare const ROUND_INTRO_TEMPLATES: string[];
/**
 * Genererar en naturlig ledtråds-läsning med SSML pauser.
 * Varierar formuleringar för att undvika upprepning.
 */
export interface ClueTemplate {
    intro: string;
    pause: string;
}
export declare const CLUE_TEMPLATES: Record<number, ClueTemplate[]>;
/**
 * Genererar en komplett clue-read med intro + paus + ledtråd.
 * Väljer slumpmässigt bland varianter för att skapa variation.
 */
export declare function buildClueRead(clueLevel: number, clueText: string): string;
export declare const BEFORE_CLUE_TEMPLATES: string[];
export declare const AFTER_BRAKE_TEMPLATES: string[];
export declare const BEFORE_REVEAL_TEMPLATES: string[];
export declare const REVEAL_CORRECT_TEMPLATES: string[];
export declare const REVEAL_INCORRECT_TEMPLATES: string[];
export declare const QUESTION_INTRO_TEMPLATES: {
    template: (q: string) => string;
    slotSuffix: number;
}[];
export declare function buildQuestionRead(questionText: string): {
    text: string;
    slotSuffix: number;
};
export declare function buildFollowupIntro(destinationName: string): string;
export declare const BEFORE_FINAL_TEMPLATES: string[];
/**
 * Väljer en slumpmässig mall från en array av templates.
 */
export declare function pickRandom<T>(templates: T[]): T;
/**
 * Estimerar duration för en text (används när TTS inte är tillgängligt).
 * Räknar ~150ms per ord + extra för SSML breaks.
 */
export declare function estimateDuration(text: string): number;
/**
 * Rensar SSML markup från text (för fallback display).
 */
export declare function stripSSML(text: string): string;
//# sourceMappingURL=script-templates.d.ts.map