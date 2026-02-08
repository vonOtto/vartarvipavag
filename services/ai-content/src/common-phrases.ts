/**
 * Common Phrases Library
 *
 * Pre-defined Swedish phrases for game events to minimize TTS generation costs.
 * These phrases are pre-generated and cached, avoiding repeated API calls.
 */

export const COMMON_PHRASES = {
  banter: {
    correct: [
      'Helt rätt!',
      'Exakt så är det!',
      'Briljant gissat!',
      'Perfekt!',
      'Det stämmer!',
      'Alldeles korrekt!',
      'Precis!',
      'Hundra procent rätt!',
      'Det var ett utmärkt svar!',
      'Fantastiskt!',
      'Strålande!',
      'Mycket bra!',
      'Absolut rätt!',
      'Det var rätt svar!',
      'Ja, det är korrekt!',
      'Det är helt rätt!',
      'Riktigt bra!',
      'Det var precis rätt!',
      'Bra jobbat!',
      'Imponerande!',
      'Toppen!',
      'Skarpt!',
      'Just det!',
      'Självklart rätt!',
      'Fullt poäng!',
      'Det där var rätt!',
      'Ja, helt korrekt!',
      'Du har rätt!',
      'Det stämmer precis!',
      'Riktigt svarat!',
      'Exakt!',
      'Rätt!',
      'Yes!',
      'Bingo!',
      'Tjabo!',
      'Klockrent!',
      'Utmärkt!',
    ],
    incorrect: [
      'Tyvärr inte rätt den här gången',
      'Det var en bra gissning!',
      'Inte helt rätt',
      'Tyvärr fel',
      'Det var nära!',
      'Nästan!',
      'Inte riktigt',
      'Det stämmer inte',
      'Fel svar',
      'Det var fel',
      'Nej, tyvärr',
      'Det stämmer inte riktigt',
      'Fel denna gång',
      'Det var inte rätt',
      'Tyvärr missade ni',
      'Inte korrekt',
      'Inte rätt svar',
      'Det stämde inte',
      'Nej, det var fel',
      'Tyvärr inte rätt',
      'Det var inte det',
      'Fel destination',
      'Aj då!',
      'Nej, tyvärr!',
      'Fel den här gången!',
      'Inte denna gång!',
      'Det var inte rätt!',
      'Fortsätt gissa!',
      'Oj, inte rätt!',
    ],
    timeRunningOut: [
      'Tiden rinner ut!',
      'Snart är tiden slut!',
      'Skynda er!',
      'Bara några sekunder kvar!',
      'Tiden går!',
      'Tio sekunder kvar!',
      'Nu gäller det!',
      'Tiden tar slut!',
      'Klockan tickar!',
      'Sista sekunderna!',
    ],
  },
  instructions: {
    roundStart: [
      'Dags för en ny runda!',
      'Här kommer nästa destination!',
      'Nu börjar en ny omgång!',
      'Ny runda startar!',
      'Dags för nästa resa!',
      'Här är nästa utmaning!',
      'Ny destination väntar!',
      'Redo för nästa destination?',
      'Nästa stopp väntar!',
      'Ny destination!',
      'Nästa runda!',
      'Kör igång!',
    ],
    brakeTime: [
      'Tryck på bromsen när du vet svaret!',
      'Snabbast på bromsen vinner!',
      'Bromsa när du har svaret!',
      'Tryck bromsen om du vet!',
      'Vem är snabbast på bromsen?',
      'Bromsa för att svara!',
      'Vet du svaret? Bromsa!',
      'Först på bromsen får svara!',
      'Tryck bromsen snabbt!',
      'Den snabbaste bromsen vinner!',
    ],
    followupIncoming: [
      'Dags för följdfråga!',
      'Här kommer följdfrågan!',
      'Nu blir det en följdfråga!',
      'Följdfråga på gång!',
      'Redo för följdfrågan?',
      'Nu kommer en följdfråga!',
      'Dags att testa kunskaperna!',
      'Följdfråga väntar!',
      'Nu blir det quizdags!',
      'Här är följdfrågan!',
    ],
    answerLocked: [
      'Svaret är låst!',
      'Ditt svar är registrerat!',
      'Svaret är inlåst!',
      'Svar mottaget!',
      'Låst och klart!',
      'Svaret är sparat!',
      'Registrerat!',
      'Inlåst!',
      'Klart!',
      'Inlämnat!',
      'Mottaget!',
    ],
  },
  followupIntro: [
    'Nu kommer en följdfråga!',
    'Dags för följdfrågan!',
    'Här är en följdfråga!',
    'Nu blir det quiz!',
    'Följdfråga!',
    'Dags att testa era kunskaper!',
    'Här kommer nästa fråga!',
    'Redo för en följdfråga?',
    'Nu kör vi en följdfråga!',
    'Kvittofråga på gång!',
  ],
  reveal: [
    'Rätt svar är...',
    'Destinationen var...',
    'Det var...',
    'Svaret är...',
    'Vi letade efter...',
    'Korrekt svar är...',
    'Destinationen vi sökte var...',
    'Det rätta svaret var...',
    'Vi reste till...',
    'Platsen var...',
  ],
  transition: {
    nextClue: [
      'Här kommer nästa ledtråd!',
      'Ledtråd nummer två!',
      'Tredje ledtråden!',
      'Fjärde ledtråden!',
      'Sista ledtråden!',
      'Nu får ni en ny ledtråd!',
      'Nästa tips!',
      'Här är mer information!',
      'Ytterligare en ledtråd!',
      'Mer hjälp på väg!',
    ],
  },
  scoreboard: {
    announcement: [
      'Här är poängställningen!',
      'Dags att se poängen!',
      'Poängtavlan!',
      'Läget just nu!',
      'Aktuella poäng!',
      'Så här ser det ut!',
      'Här är ställningen!',
      'Poängläget!',
      'Vem leder?',
      'Ställningen är...',
    ],
  },
} as const;

/**
 * Get a random phrase from a category
 */
export function getRandomPhrase(
  category: keyof typeof COMMON_PHRASES,
  subcategory?: string
): string {
  const categoryPhrases = COMMON_PHRASES[category];

  if (!categoryPhrases) {
    throw new Error(`Unknown phrase category: ${category}`);
  }

  // If it's a simple array
  if (Array.isArray(categoryPhrases)) {
    return categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];
  }

  // If it has subcategories
  if (subcategory && subcategory in categoryPhrases) {
    const phrases = (categoryPhrases as any)[subcategory];
    if (Array.isArray(phrases)) {
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
  }

  throw new Error(`Invalid subcategory: ${subcategory} in ${category}`);
}

/**
 * Get all phrases as a flat list with metadata
 */
export function getAllPhrases(): Array<{
  id: string;
  text: string;
  category: string;
  subcategory?: string;
}> {
  const result: Array<{
    id: string;
    text: string;
    category: string;
    subcategory?: string;
  }> = [];

  for (const [category, content] of Object.entries(COMMON_PHRASES)) {
    if (Array.isArray(content)) {
      // Simple array
      content.forEach((text, index) => {
        result.push({
          id: `${category}_${index}`,
          text,
          category,
        });
      });
    } else {
      // Object with subcategories
      for (const [subcategory, phrases] of Object.entries(content)) {
        if (Array.isArray(phrases)) {
          phrases.forEach((text, index) => {
            result.push({
              id: `${category}_${subcategory}_${index}`,
              text,
              category,
              subcategory,
            });
          });
        }
      }
    }
  }

  return result;
}

/**
 * Get total count of all phrases
 */
export function getPhraseCount(): number {
  return getAllPhrases().length;
}
