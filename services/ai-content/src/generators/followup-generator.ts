/**
 * Followup Question Generator
 *
 * Generates 2-3 follow-up questions with 4 multiple-choice options each.
 * Questions should be about the destination but not reveal it prematurely.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { FollowupQuestion, Destination } from '../types/content-pack';

interface FollowupResponse {
  followups: Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    reasoning: string;
  }>;
}

const SWEDISH_LANGUAGE_RULES = `
VIKTIGT - Svenska språkregler:
- Använd aktiva verb (inte "är känd för att ha" → använd "har")
- Undvik onödigt fluff ("fantastiska", "vackra" om det inte tillför konkreta detaljer)
- Konkreta exempel och siffror > vaga beskrivningar
- Naturligt språk som en svensk skulle säga
- Inga anglicismer (realisera → inse, facilitera → underlätta)
- Formulera frågor naturligt: "Vilken flod flöder genom denna stad?" eller "Vilken flod möter havet här?"
- Rolig och smart, inte för tung eller formell
`;

const SYSTEM_PROMPT = `Du är en expert på att skapa följdfrågor för ett geografiskt quiz-spel likt "På Spåret".

${SWEDISH_LANGUAGE_RULES}

REGLER för följdfrågor:

1. ANTI-LEAK (kritiskt):
   - Frågan får INTE nämna destinationens namn direkt
   - Formulera frågor om destinationen utan att avslöja vilken stad det är
   - Exempel: "Vilken flod flödar genom denna stad?" istället för "Vilken flod flödar genom Paris?"

2. FORMAT:
   - Exakt 4 svarsalternativ (A, B, C, D)
   - Ett korrekt svar
   - Distraktorerna (fel svar) ska vara trovärdiga men felaktiga

3. SVÅRIGHETSGRAD:
   - Variera svårigheten (någon lätt, någon svår)
   - Kräv kunskap om destinationen
   - Undvik för obskyra fakta

4. STIL:
   - Svenska språket
   - Tydlig frågeformulering
   - Koncisa svarsalternativ
   - Faktakorrekt

EXEMPEL (Paris, utan att nämna "Paris"):
- "Vilken flod flöder genom denna stad?"
  Options: ["Seine", "Thames", "Donau", "Rhône"]
  Correct: "Seine"

- "Vilket år invigdes det berömda järntornet här?"
  Options: ["1869", "1889", "1909", "1929"]
  Correct: "1889"

Svara ENBART med JSON i detta format:
{
  "followups": [
    {
      "questionText": "Fråga här?",
      "options": ["Alt A", "Alt B", "Alt C", "Alt D"],
      "correctAnswer": "Alt B",
      "reasoning": "Varför denna fråga är bra"
    },
    ...
  ]
}`;

export async function generateFollowups(
  destination: Destination,
  count: number = 2
): Promise<FollowupQuestion[]> {
  if (count < 2 || count > 3) {
    throw new Error('Followup count must be 2 or 3');
  }

  const prompt = `Generera ${count} följdfrågor för destinationen: ${destination.name}, ${destination.country}

VIKTIGT:
- Frågor får INTE nämna "${destination.name}" direkt
- Använd formuleringar som "denna stad", "denna plats", "här"
- Exakt 4 svarsalternativ per fråga
- Ett korrekt svar som måste vara ett av alternativen
- Distraktorerna ska vara trovärdiga

Generera nu ${count} följdfrågor enligt systemprompten.`;

  // Use Sonnet for creative followup generation
  const response = await callClaude(prompt, {
    model: 'sonnet',
    maxTokens: 2048,
    systemPrompt: SYSTEM_PROMPT,
  });
  const parsed = parseClaudeJSON<FollowupResponse>(response);

  if (parsed.followups.length !== count) {
    throw new Error(`Expected ${count} followup questions, got ${parsed.followups.length}`);
  }

  // Verify each followup
  parsed.followups.forEach((followup, index) => {
    if (followup.options.length !== 4) {
      throw new Error(`Followup ${index} must have exactly 4 options, got ${followup.options.length}`);
    }

    if (!followup.options.includes(followup.correctAnswer)) {
      throw new Error(`Followup ${index} correct answer "${followup.correctAnswer}" not in options`);
    }

    // Check for destination name leak
    const lowerQuestion = followup.questionText.toLowerCase();
    const lowerName = destination.name.toLowerCase();
    if (lowerQuestion.includes(lowerName)) {
      throw new Error(`Followup ${index} contains destination name: "${followup.questionText}"`);
    }
  });

  console.log(`[followup-generator] Generated ${count} followup questions for ${destination.name}`);
  parsed.followups.forEach((followup, i) => {
    console.log(`  [${i + 1}] ${followup.questionText}`);
    console.log(`      Options: ${followup.options.join(', ')}`);
    console.log(`      Correct: ${followup.correctAnswer}`);
    console.log(`      → ${followup.reasoning}`);
  });

  return parsed.followups.map((f) => ({
    questionText: f.questionText,
    options: f.options,
    correctAnswer: f.correctAnswer,
  }));
}
