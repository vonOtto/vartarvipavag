/**
 * Overlap Checker
 *
 * Verifies that followup questions don't ask about facts already mentioned in clues.
 * Prevents questions like "What is the river called?" when "Seine" was mentioned in clues.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { Clue, FollowupQuestion, Destination } from '../types/content-pack';

interface OverlapCheckResponse {
  hasOverlap: boolean;
  overlappingConcepts: string[];
  reason: string;
}

const SYSTEM_PROMPT = `Du är en kvalitetskontrollant för ett quiz-spel. Din uppgift är att identifiera om en följdfråga frågar om något som redan nämnts i ledtrådarna.

OVERLAP = Om följdfrågan frågar om exakt samma fakta/koncept som redan avslöjats i ledtrådarna.

Exempel på OVERLAP:
- Ledtråd: "Floden Seine delar staden i två" + Följdfråga: "Vad heter floden?" → OVERLAP
- Ledtråd: "Eiffeltornet är 324m högt" + Följdfråga: "Hur högt är Eiffeltornet?" → OVERLAP
- Ledtråd: "Louvren är världens största konstmuseum" + Följdfråga: "Vilket museum visar Mona Lisa?" → OVERLAP (Louvren redan nämnt)
- Ledtråd: "Notre-Dame byggdes på 1100-talet" + Följdfråga: "När byggdes Notre-Dame?" → OVERLAP

Exempel på INTE overlap:
- Ledtråd: "Staden har en flod" + Följdfråga: "Vad heter floden?" → OK (floden inte namngiven)
- Ledtråd: "Berömt torn från 1889" + Följdfråga: "Hur högt är Eiffeltornet?" → OK (tornet inte namngivet)
- Ledtråd: "Världsberömt konstmuseum" + Följdfråga: "Vilket museum visar Mona Lisa?" → OK (museet inte namngivet)
- Ledtråd: "Gotisk katedral" + Följdfråga: "När byggdes Notre-Dame?" → OK (katedralen inte namngiven)

VIKTIGT:
- Om det specifika namnet/värdet/faktumet redan nämnts i ledtrådarna → OVERLAP
- Om endast kategorin/typen nämns utan specifikt namn → INTE overlap
- Om relaterade men olika fakta (t.ex. olika byggnader, olika årtal) → INTE overlap

Svara ENBART med JSON:
{
  "hasOverlap": boolean,
  "overlappingConcepts": ["koncept1", "koncept2"],
  "reason": "Förklaring av varför overlap upptäcktes eller inte"
}`;

/**
 * Check if a single followup question overlaps with clues
 */
export async function checkFollowupOverlap(
  followup: FollowupQuestion,
  clues: Clue[],
  destination: Destination
): Promise<{ hasOverlap: boolean; reason: string; overlappingConcepts: string[] }> {
  // Build context from all clues
  let cluesText = 'Ledtrådar som spelaren redan sett:\n';
  clues.forEach((clue) => {
    cluesText += `- [${clue.level}] ${clue.text}\n`;
  });

  const prompt = `${cluesText}

Följdfråga som ska kontrolleras:
"${followup.questionText}"
Alternativ: ${followup.options.join(', ')}
Rätt svar: ${followup.correctAnswer}

Destination: ${destination.name}, ${destination.country}

Analysera om följdfrågan frågar om något som redan nämnts explicit i ledtrådarna.

Tänk steg för steg:
1. Vad frågar följdfrågan om? (specifikt namn/värde/faktum)
2. Har detta specifika namn/värde/faktum nämnts i någon ledtråd?
3. Eller är det bara kategorin/typen som nämnts (utan specifikt namn)?

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for cost optimization (overlap detection is a simple task)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<OverlapCheckResponse>(response);

    console.log(
      `[overlap-check] Followup "${followup.questionText}": ${result.hasOverlap ? 'OVERLAP!' : 'OK'} - ${result.reason}`
    );

    return {
      hasOverlap: result.hasOverlap,
      reason: result.reason,
      overlappingConcepts: result.overlappingConcepts || [],
    };
  } catch (error) {
    console.error(`[overlap-check] Failed to check followup:`, error);
    // If check fails, assume no overlap (fail open)
    return {
      hasOverlap: false,
      reason: `Overlap check failed: ${(error as Error).message}`,
      overlappingConcepts: [],
    };
  }
}

/**
 * Check all followup questions for overlaps with clues
 */
export async function checkFollowupOverlaps(
  followups: FollowupQuestion[],
  clues: Clue[],
  destination: Destination
): Promise<{
  passed: boolean;
  results: Array<{
    questionText: string;
    hasOverlap: boolean;
    reason: string;
    overlappingConcepts: string[];
  }>;
}> {
  console.log(`[overlap-check] Checking followup questions for overlaps with clues...`);

  const results: Array<{
    questionText: string;
    hasOverlap: boolean;
    reason: string;
    overlappingConcepts: string[];
  }> = [];

  for (const followup of followups) {
    const result = await checkFollowupOverlap(followup, clues, destination);
    results.push({
      questionText: followup.questionText,
      hasOverlap: result.hasOverlap,
      reason: result.reason,
      overlappingConcepts: result.overlappingConcepts,
    });

    if (result.hasOverlap) {
      console.log(
        `[overlap-check] OVERLAP DETECTED in followup! Concepts: ${result.overlappingConcepts.join(', ')}`
      );
    }
  }

  const passed = results.every((r) => !r.hasOverlap);
  console.log(`[overlap-check] Overall: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, results };
}
