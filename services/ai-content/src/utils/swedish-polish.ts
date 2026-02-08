/**
 * Swedish Language Polish Utility
 *
 * Post-processing function to improve Swedish language quality in AI-generated content.
 * Applies rules from docs/content-style-guide.md
 */

/**
 * Apply Swedish language improvements to text
 *
 * This function applies common fixes to make AI-generated Swedish more natural:
 * - Converts passive constructions to active verbs
 * - Removes unnecessary fluff words
 * - Replaces formal/awkward phrases with natural Swedish
 * - Converts anglicisms to Swedish equivalents
 */
export function polishSwedish(text: string): string {
  let polished = text;

  // 1. Passive constructions → Active verbs
  polished = polished.replace(/är känd för att ha\b/gi, 'har');
  polished = polished.replace(/är berömd för att ha\b/gi, 'har');
  polished = polished.replace(/är känd för sina\b/gi, 'har');
  polished = polished.replace(/är känd för sitt\b/gi, 'har');
  polished = polished.replace(/är berömd för sina\b/gi, 'har');
  polished = polished.replace(/är berömd för sitt\b/gi, 'har');

  // 2. Formal verbs → Natural Swedish
  polished = polished.replace(/\bhyser\b/gi, 'har');
  polished = polished.replace(/\bhysa\b/gi, 'ha');
  polished = polished.replace(/\berbjuder många\b/gi, 'har många');
  polished = polished.replace(/\berbjuder en\b/gi, 'har en');
  polished = polished.replace(/\berbjuder ett\b/gi, 'har ett');
  polished = polished.replace(/\bär lokaliserad vid\b/gi, 'ligger vid');
  polished = polished.replace(/\bär lokaliserad i\b/gi, 'ligger i');
  polished = polished.replace(/\bär belägen vid\b/gi, 'ligger vid');
  polished = polished.replace(/\bär belägen i\b/gi, 'ligger i');

  // 3. Remove unnecessary fluff (only when it doesn't add concrete info)
  polished = polished.replace(/\bdetta fantastiska land\b/gi, 'detta land');
  polished = polished.replace(/\bdenna fantastiska stad\b/gi, 'denna stad');
  polished = polished.replace(/\bdetta fantastiska\b/gi, 'detta');
  polished = polished.replace(/\bdenna fantastiska\b/gi, 'denna');
  polished = polished.replace(/\bdet fantastiska\b/gi, 'det');
  polished = polished.replace(/\bdenna vackra stad\b/gi, 'denna stad');
  polished = polished.replace(/\bdetta vackra land\b/gi, 'detta land');

  // Keep "vackra" when it's about specific things (nature, buildings)
  // but remove when it's generic fluff

  // 4. Remove redundant words
  polished = polished.replace(/\bhär finns det\b/gi, 'här finns');
  polished = polished.replace(/\bdetta är ett land som\b/gi, 'detta land');
  polished = polished.replace(/\bdetta är en stad som\b/gi, 'denna stad');
  polished = polished.replace(/\bman kan säga att\b/gi, '');

  // 5. Inclusive pronouns (man → du/här)
  polished = polished.replace(/\bman kan besöka\b/gi, 'du kan besöka');
  polished = polished.replace(/\bman kan se\b/gi, 'du kan se');
  polished = polished.replace(/\bman kan hitta\b/gi, 'du kan hitta');
  polished = polished.replace(/\bman kan uppleva\b/gi, 'du kan uppleva');
  polished = polished.replace(/\bman hittar\b/gi, 'du hittar');

  // 6. I denna stad → Här
  polished = polished.replace(/\bi denna stad kan\b/gi, 'här kan');
  polished = polished.replace(/\bi denna stad finns\b/gi, 'här finns');
  polished = polished.replace(/\bi denna stad ligger\b/gi, 'här ligger');
  polished = polished.replace(/\bi den här staden kan\b/gi, 'här kan');
  polished = polished.replace(/\bi den här staden finns\b/gi, 'här finns');

  // 7. Common anglicisms
  polished = polished.replace(/\brealisera\b/gi, 'inse');
  polished = polished.replace(/\bfacilitera\b/gi, 'underlätta');
  polished = polished.replace(/\bimplementera\b/gi, 'införa');
  polished = polished.replace(/\bapproximera\b/gi, 'uppskatta');

  // 8. Awkward constructions
  polished = polished.replace(/\bdet förekommer många\b/gi, 'det finns många');
  polished = polished.replace(/\bplatsen hyser\b/gi, 'här finns');
  polished = polished.replace(/\bstaden erbjuder\b/gi, 'du hittar');

  // 9. Clean up multiple spaces created by removals
  polished = polished.replace(/\s{2,}/g, ' ');
  polished = polished.trim();

  // 10. Fix spacing around punctuation
  polished = polished.replace(/\s+\./g, '.');
  polished = polished.replace(/\s+,/g, ',');

  return polished;
}

/**
 * Apply Swedish language improvements to an array of texts
 */
export function polishSwedishArray(texts: string[]): string[] {
  return texts.map(polishSwedish);
}

/**
 * Polish a clue object
 */
export interface Clue {
  level: number;
  text: string;
}

export function polishClue(clue: Clue): Clue {
  return {
    ...clue,
    text: polishSwedish(clue.text),
  };
}

/**
 * Polish a followup question object
 */
export interface FollowupQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export function polishFollowup(followup: FollowupQuestion): FollowupQuestion {
  return {
    questionText: polishSwedish(followup.questionText),
    options: polishSwedishArray(followup.options),
    correctAnswer: polishSwedish(followup.correctAnswer),
  };
}

/**
 * Get statistics about what was changed
 */
export interface PolishStats {
  originalLength: number;
  polishedLength: number;
  changesApplied: number;
}

export function polishSwedishWithStats(text: string): { text: string; stats: PolishStats } {
  const original = text;
  const polished = polishSwedish(text);

  // Count differences (rough approximation)
  const changesApplied = original === polished ? 0 : 1;

  return {
    text: polished,
    stats: {
      originalLength: original.length,
      polishedLength: polished.length,
      changesApplied,
    },
  };
}
