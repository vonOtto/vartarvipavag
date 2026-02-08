/**
 * Fact Checker
 *
 * Verifies that clues and followup questions contain factually correct information.
 * Uses Claude with extended context to verify claims.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { Clue, FollowupQuestion, Destination, VerificationResult } from '../types/content-pack';

interface FactCheckResponse {
  verified: boolean;
  status: 'verified' | 'uncertain' | 'rejected';
  reason: string;
  sources: string[];
}

const SYSTEM_PROMPT = `Du är en expert fact-checker som verifierar geografiska fakta.

Din uppgift:
1. Verifiera att påståenden om platser, städer och länder är korrekta
2. Använd din kunskap för att kontrollera fakta (datum, siffror, namn, etc.)
3. Var kritisk men rimlig - mindre avvikelser i exakta siffror är OK om de är "nära nog"

Bedöm varje påstående som:
- "verified": Fakta stämmer helt eller i stort
- "uncertain": Kan inte bekräfta med säkerhet
- "rejected": Fakta är uppenbart felaktiga

Svara ENBART med JSON:
{
  "verified": true/false,
  "status": "verified" | "uncertain" | "rejected",
  "reason": "Förklaring av bedömningen",
  "sources": ["Vilka källor/kunskaper du baserar detta på"]
}`;

/**
 * Verify a single clue for factual accuracy
 */
export async function verifyClue(
  clue: Clue,
  destination: Destination
): Promise<VerificationResult> {
  const prompt = `Verifiera denna ledtråd om ${destination.name}, ${destination.country}:

"${clue.text}"

Är denna ledtråd faktamässigt korrekt? Kontrollera:
- Siffror och datum
- Geografiska uppgifter
- Historiska fakta
- Namn på byggnader, platser, etc.

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for simple fact verification (cost optimization)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<FactCheckResponse>(response);

    console.log(`[fact-checker] Clue [${clue.level}]: ${result.status} - ${result.reason}`);

    return {
      verified: result.verified,
      status: result.status,
      reason: result.reason,
      sources: result.sources,
    };
  } catch (error) {
    console.error(`[fact-checker] Failed to verify clue:`, error);
    return {
      verified: false,
      status: 'uncertain',
      reason: `Verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Verify a followup question for factual accuracy
 */
export async function verifyFollowup(
  followup: FollowupQuestion,
  destination: Destination
): Promise<VerificationResult> {
  const prompt = `Verifiera denna följdfråga om ${destination.name}, ${destination.country}:

Fråga: "${followup.questionText}"
Alternativ: ${followup.options.join(', ')}
Korrekt svar: "${followup.correctAnswer}"

Kontrollera:
1. Är det korrekta svaret verkligen korrekt?
2. Är de felaktiga alternativen verkligen felaktiga?
3. Finns det några faktafel i frågan?

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for simple fact verification (cost optimization)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<FactCheckResponse>(response);

    console.log(`[fact-checker] Followup "${followup.questionText}": ${result.status} - ${result.reason}`);

    return {
      verified: result.verified,
      status: result.status,
      reason: result.reason,
      sources: result.sources,
    };
  } catch (error) {
    console.error(`[fact-checker] Failed to verify followup:`, error);
    return {
      verified: false,
      status: 'uncertain',
      reason: `Verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Verify all clues in a content pack
 */
export async function verifyAllClues(
  clues: Clue[],
  destination: Destination
): Promise<VerificationResult[]> {
  console.log(`[fact-checker] Verifying ${clues.length} clues...`);

  const results: VerificationResult[] = [];
  for (const clue of clues) {
    const result = await verifyClue(clue, destination);
    results.push(result);
  }

  return results;
}

/**
 * Verify all followup questions in a content pack
 */
export async function verifyAllFollowups(
  followups: FollowupQuestion[],
  destination: Destination
): Promise<VerificationResult[]> {
  console.log(`[fact-checker] Verifying ${followups.length} followup questions...`);

  const results: VerificationResult[] = [];
  for (const followup of followups) {
    const result = await verifyFollowup(followup, destination);
    results.push(result);
  }

  return results;
}

/**
 * Check if destination itself is valid
 */
export async function verifyDestination(
  destination: Destination
): Promise<VerificationResult> {
  const prompt = `Verifiera denna destination:

Namn: ${destination.name}
Land: ${destination.country}

Kontrollera:
1. Existerar denna plats/stad?
2. Ligger den verkligen i det angivna landet?
3. Är namnet korrekt stavat?

Svara med JSON enligt systemprompten.`;

  try {
    // Use Haiku for simple fact verification (cost optimization)
    const response = await callClaude(prompt, {
      model: 'haiku',
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
    });
    const result = parseClaudeJSON<FactCheckResponse>(response);

    console.log(`[fact-checker] Destination ${destination.name}: ${result.status} - ${result.reason}`);

    return {
      verified: result.verified,
      status: result.status,
      reason: result.reason,
      sources: result.sources,
    };
  } catch (error) {
    console.error(`[fact-checker] Failed to verify destination:`, error);
    return {
      verified: false,
      status: 'uncertain',
      reason: `Verification failed: ${(error as Error).message}`,
    };
  }
}
