/**
 * Anti-Leak Checker
 *
 * Verifies that early clues (10/8/6) and followup questions don't leak the destination.
 * Uses Claude to simulate a player trying to guess the destination.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { Clue, FollowupQuestion, Destination } from '../types/content-pack';

interface LeakCheckResponse {
  canGuess: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  guess?: string;
  reasoning: string;
}

const SYSTEM_PROMPT = `Du är en spelare i ett geografiskt quiz-spel likt "På Spåret". Din uppgift är att försöka gissa destinationen baserat på ledtrådar.

VIKTIGT - Strikt bedömning:
- Du ska aktivt FÖRSÖKA gissa destinationen
- Använd all din kunskap om geografi, historia, kultur
- Om du kan komma på EN ENDA plats som passar bra → gissa den
- Bedöm din säkerhet ärligt

Regler:
1. Läs ledtråden noggrant
2. Försök aktivt identifiera destinationen (tänk på alla möjliga platser)
3. Bedöm din säkerhet:
   - "high": Jag är 80-100% säker på att det är denna plats
   - "medium": Jag är 50-80% säker, skulle gissa detta
   - "low": Jag är 20-50% säker, skulle möjligen gissa detta
   - "none": Jag är <20% säker, kan inte gissa meningsfullt

4. LEAK-kriterier (för nivå 10/8):
   - Om du kan gissa med "high" confidence → LEAK
   - Om du kan gissa med "medium" confidence → LEAK
   - Endast "low" eller "none" är acceptabelt för tidiga ledtrådar

Svara ENBART med JSON:
{
  "canGuess": true/false,
  "confidence": "high" | "medium" | "low" | "none",
  "guess": "Din gissning (om confidence >= low)",
  "reasoning": "Förklara din tankegång och varför du valde denna säkerhetsnivå"
}`;

/**
 * Check if a single clue leaks the destination
 */
export async function checkClueForLeak(
  clue: Clue,
  destination: Destination,
  previousClues: Clue[] = []
): Promise<{ leaks: boolean; reason: string }> {
  // Build context from previous clues
  let context = '';
  if (previousClues.length > 0) {
    context = 'Du har redan sett dessa ledtrådar:\n';
    previousClues.forEach((c) => {
      context += `- [${c.level}] ${c.text}\n`;
    });
    context += '\n';
  }

  // Add stricter criteria for level 10
  const levelGuidance =
    clue.level === 10
      ? `\n\nDetta är en NIVÅ 10-ledtråd (svårast). Den ska vara MYCKET svår att gissa. Om du kan gissa med mer än "low" confidence är ledtråden FÖR LÄTT och ska REJEKTAS.`
      : clue.level === 8
        ? `\n\nDetta är en NIVÅ 8-ledtråd (svår). Den ska fortfarande vara utmanande. Om du kan gissa med "high" confidence är den FÖR LÄTT.`
        : '';

  const prompt = `${context}Ny ledtråd: "${clue.text}"${levelGuidance}

Kan du gissa destinationen baserat på denna ledtråd${previousClues.length > 0 ? ' och tidigare ledtrådar' : ''}?

Tänk steg för steg:
1. Vilka platser skulle kunna passa denna beskrivning?
2. Finns det en plats som passar MYCKET bättre än andra?
3. Hur säker är jag på min gissning?

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for simple leak detection (cost optimization)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<LeakCheckResponse>(response);

    // Check if the guess is correct
    let leaks = false;
    let reason = result.reasoning;

    if (result.canGuess && result.guess) {
      const normalizedGuess = result.guess.toLowerCase().trim();
      const isCorrect = destination.aliases.some(
        (alias) => normalizedGuess.includes(alias) || alias.includes(normalizedGuess)
      );

      if (isCorrect) {
        // Stricter criteria for level 10: even "low" confidence can be a leak if guessed correctly
        if (clue.level === 10) {
          if (result.confidence === 'high' || result.confidence === 'medium') {
            leaks = true;
            reason = `Ledtråd läcker! NIVÅ 10 ska vara mycket svår, men kan gissas med ${result.confidence} confidence: "${result.guess}". ${result.reasoning}`;
          }
        } else {
          // For level 8 and 6, require high or medium confidence
          if (result.confidence === 'high' || result.confidence === 'medium') {
            leaks = true;
            reason = `Ledtråd läcker! Kan gissas med ${result.confidence} confidence: "${result.guess}". ${result.reasoning}`;
          }
        }
      }
    }

    console.log(`[anti-leak] Clue [${clue.level}]: ${leaks ? 'LEAK!' : 'OK'} - ${reason}`);

    return { leaks, reason };
  } catch (error) {
    console.error(`[anti-leak] Failed to check clue:`, error);
    // If verification fails, assume no leak (fail open)
    return {
      leaks: false,
      reason: `Leak check failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Check all early clues (10, 8, 6) for leaks
 */
export async function checkCluesForLeaks(
  clues: Clue[],
  destination: Destination
): Promise<{ passed: boolean; results: Array<{ level: number; leaks: boolean; reason: string }> }> {
  console.log(`[anti-leak] Checking clues for leaks...`);

  const results: Array<{ level: number; leaks: boolean; reason: string }> = [];
  const previousClues: Clue[] = [];

  for (const clue of clues) {
    // Only check early clues (10, 8, 6) for leaks
    // Levels 4 and 2 are expected to be easier
    if (clue.level === 10 || clue.level === 8 || clue.level === 6) {
      const result = await checkClueForLeak(clue, destination, previousClues);
      results.push({
        level: clue.level,
        leaks: result.leaks,
        reason: result.reason,
      });

      if (result.leaks) {
        console.log(`[anti-leak] LEAK DETECTED at level ${clue.level}!`);
      }
    }

    previousClues.push(clue);
  }

  const passed = results.every((r) => !r.leaks);
  console.log(`[anti-leak] Overall: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, results };
}

/**
 * Check if a followup question leaks the destination
 */
export async function checkFollowupForLeak(
  followup: FollowupQuestion,
  destination: Destination
): Promise<{ leaks: boolean; reason: string }> {
  const prompt = `Du ser denna följdfråga:

"${followup.questionText}"
Alternativ: ${followup.options.join(', ')}

Kan du gissa vilken destination spelet handlar om?

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for simple leak detection (cost optimization)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<LeakCheckResponse>(response);

    let leaks = false;
    let reason = result.reasoning;

    if (result.canGuess && result.guess) {
      const normalizedGuess = result.guess.toLowerCase().trim();
      const isCorrect = destination.aliases.some(
        (alias) => normalizedGuess.includes(alias) || alias.includes(normalizedGuess)
      );

      if (isCorrect && (result.confidence === 'high' || result.confidence === 'medium')) {
        leaks = true;
        reason = `Följdfråga läcker! Kan gissas med ${result.confidence} confidence: "${result.guess}". ${result.reasoning}`;
      }
    }

    console.log(`[anti-leak] Followup "${followup.questionText}": ${leaks ? 'LEAK!' : 'OK'} - ${reason}`);

    return { leaks, reason };
  } catch (error) {
    console.error(`[anti-leak] Failed to check followup:`, error);
    return {
      leaks: false,
      reason: `Leak check failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Check all followup questions for leaks
 */
export async function checkFollowupsForLeaks(
  followups: FollowupQuestion[],
  destination: Destination
): Promise<{ passed: boolean; results: Array<{ questionText: string; leaks: boolean; reason: string }> }> {
  console.log(`[anti-leak] Checking followup questions for leaks...`);

  const results: Array<{ questionText: string; leaks: boolean; reason: string }> = [];

  for (const followup of followups) {
    const result = await checkFollowupForLeak(followup, destination);
    results.push({
      questionText: followup.questionText,
      leaks: result.leaks,
      reason: result.reason,
    });

    if (result.leaks) {
      console.log(`[anti-leak] LEAK DETECTED in followup!`);
    }
  }

  const passed = results.every((r) => !r.leaks);
  console.log(`[anti-leak] Overall: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, results };
}
