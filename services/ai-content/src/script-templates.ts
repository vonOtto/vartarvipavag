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

// ══════════════════════════════════════════════════════════════════════════════
// Round Intro — Skapar förväntan och sätter tonen för rundan
// ══════════════════════════════════════════════════════════════════════════════

export const ROUND_INTRO_TEMPLATES = [
  'Välkomna till en ny resa!<break time="700ms"/> Var tror ni vi ska?<break time="500ms"/> Är ni redo?',
  'Här kommer nästa destination.<break time="800ms"/> Vart är vi på väg den här gången?',
  'En ny utmaning väntar.<break time="600ms"/> Dags att ge er första ledtråden.<break time="500ms"/> Lyssna noga!',
  'Nu kör vi igång!<break time="500ms"/> Vilken plats letar vi efter idag?',
  'Dags för nästa resa.<break time="700ms"/> Har ni era tänkhattar på?',
];

// ══════════════════════════════════════════════════════════════════════════════
// Clue Read — Varje ledtråd läses upp med nivåspecifik inramning
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Genererar en naturlig ledtråds-läsning med SSML pauser.
 * Varierar formuleringar för att undvika upprepning.
 */
export interface ClueTemplate {
  intro: string;  // Inledning med nivå-annonsering
  pause: string;  // Paus efter intro, innan ledtråden
}

export const CLUE_TEMPLATES: Record<number, ClueTemplate[]> = {
  10: [
    {
      intro: 'Vi börjar med den första ledtråden<break time="500ms"/> värd tio poäng',
      pause: '<break time="800ms"/>'
    },
    {
      intro: 'Första ledtråden kommer här<break time="400ms"/> tio poäng',
      pause: '<break time="700ms"/>'
    },
    {
      intro: 'Nivå tio<break time="300ms"/> lyssna på det här',
      pause: '<break time="600ms"/>'
    },
  ],
  8: [
    {
      intro: 'Vi fortsätter<break time="400ms"/> ledtråd nummer två<break time="300ms"/> åtta poäng',
      pause: '<break time="800ms"/>'
    },
    {
      intro: 'Nästa ledtråd<break time="500ms"/> nu för åtta poäng',
      pause: '<break time="700ms"/>'
    },
    {
      intro: 'Nivå åtta<break time="300ms"/> kanske blir det tydligare nu',
      pause: '<break time="700ms"/>'
    },
  ],
  6: [
    {
      intro: 'Ledtråd nummer tre<break time="400ms"/> sex poäng',
      pause: '<break time="800ms"/>'
    },
    {
      intro: 'Vi går vidare till nivå sex<break time="300ms"/> hör ni',
      pause: '<break time="700ms"/>'
    },
    {
      intro: 'Sex poäng för den här ledtråden<break time="400ms"/> lyssna',
      pause: '<break time="700ms"/>'
    },
  ],
  4: [
    {
      intro: 'Ledtråd fyra<break time="400ms"/> nu för fyra poäng<break time="300ms"/> den här kan vara avgörande',
      pause: '<break time="900ms"/>'
    },
    {
      intro: 'Vi närmar oss slutet<break time="500ms"/> fyra poäng',
      pause: '<break time="800ms"/>'
    },
    {
      intro: 'Nivå fyra<break time="300ms"/> har ni kommit på det?',
      pause: '<break time="700ms"/>'
    },
  ],
  2: [
    {
      intro: 'Sista ledtråden<break time="500ms"/> bara två poäng kvar<break time="400ms"/> nu måste ni ha det',
      pause: '<break time="1000ms"/>'
    },
    {
      intro: 'Den femte och sista ledtråden<break time="600ms"/> två poäng',
      pause: '<break time="900ms"/>'
    },
    {
      intro: 'Nivå två<break time="300ms"/> den här ger er nästan allt',
      pause: '<break time="800ms"/>'
    },
  ],
};

/**
 * Genererar en komplett clue-read med intro + paus + ledtråd.
 * Väljer slumpmässigt bland varianter för att skapa variation.
 */
export function buildClueRead(clueLevel: number, clueText: string): string {
  const templates = CLUE_TEMPLATES[clueLevel];
  if (!templates || templates.length === 0) {
    // Fallback om nivån saknas
    return `Ledtråden, ${clueLevel} poäng:<break time="800ms"/> ${clueText}`;
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  return `${template.intro}${template.pause}${clueText}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Before Clue — Fyllnadsfraser mellan ledtrådar (används sparsamt)
// ══════════════════════════════════════════════════════════════════════════════

export const BEFORE_CLUE_TEMPLATES = [
  'Nästa ledtråd kommer här<break time="600ms"/>',
  'Kanske blir det tydligare nu<break time="700ms"/>',
  'Lyssna noga på den här<break time="600ms"/>',
  'Den här kan vara avgörande<break time="700ms"/>',
  'Här får ni nästa pusselbiten<break time="600ms"/>',
  'Är ni med än?<break time="500ms"/> Här kommer mer<break time="700ms"/>',
];

// ══════════════════════════════════════════════════════════════════════════════
// After Brake — Reaktioner när någon bromsar
// ══════════════════════════════════════════════════════════════════════════════

export const AFTER_BRAKE_TEMPLATES = [
  'Där bromsar vi!<break time="600ms"/> Låt oss se vad ni kommit fram till.',
  'Och där fick vi en broms!<break time="500ms"/> Vad säger ni?<break time="400ms"/> Vad tror ni?',
  'Stopp där!<break time="700ms"/> Någon har en teori.<break time="500ms"/> Spännande!',
  'Tåget stannar!<break time="600ms"/> Har ni knäckt koden?',
  'Där kom bromsen!<break time="500ms"/> Nu är det dags att sätta sig.<break time="400ms"/> Vad blir svaret?',
  'Aj då<break time="300ms"/> någon vill svara!<break time="600ms"/> Låt se om ni har rätt.',
];

// ══════════════════════════════════════════════════════════════════════════════
// Before Reveal — Bygger spänning innan avslöjandet
// ══════════════════════════════════════════════════════════════════════════════

export const BEFORE_REVEAL_TEMPLATES = [
  'Nu ska vi se<break time="800ms"/> har ni rätt?<break time="1200ms"/>',
  'Spänningen är påtaglig!<break time="700ms"/> Är det här svaret?<break time="1500ms"/>',
  'Dags för avslöjandet<break time="1000ms"/> drumroll tack<break time="1400ms"/>',
  'Låt oss kolla<break time="600ms"/> om ni är på rätt spår<break time="1300ms"/>',
  'Här kommer det<break time="900ms"/> rätt eller fel?<break time="1400ms"/>',
];

// ══════════════════════════════════════════════════════════════════════════════
// Reveal Reactions — Efter att svaret visats
// ══════════════════════════════════════════════════════════════════════════════

export const REVEAL_CORRECT_TEMPLATES = [
  'Helt rätt!<break time="600ms"/> Bra jobbat!<break time="400ms"/> Ni är på gång.',
  'Precis!<break time="500ms"/> Det var ju utmärkt.<break time="400ms"/> Grattis!',
  'Ja självklart!<break time="600ms"/> Ni har koll.<break time="400ms"/> Fortsätt så!',
  'Perfekt!<break time="500ms"/> Det var det svaret vi letade efter.',
  'Exakt rätt!<break time="600ms"/> Ni är på hugget idag.',
];

export const REVEAL_INCORRECT_TEMPLATES = [
  'Tyvärr<break time="600ms"/> inte det vi letade efter.<break time="500ms"/> Men bra försök!',
  'Aj då<break time="500ms"/> det var inte rätt den här gången.<break time="400ms"/> Nästa gång!',
  'Nej<break time="600ms"/> men det var ett tappert försök!<break time="400ms"/> Fortsätt kämpa!',
  'Inte helt rätt<break time="500ms"/> men ni var nära!<break time="400ms"/> Bättre lycka nästa gång.',
  'Tyvärr inte<break time="700ms"/> men ge inte upp!<break time="400ms"/> Nästa destination väntar.',
];

// ══════════════════════════════════════════════════════════════════════════════
// Followup Question Read — Läser upp följdfrågor
// ══════════════════════════════════════════════════════════════════════════════

export const QUESTION_INTRO_TEMPLATES = [
  { template: (q: string) => `Här kommer frågan<break time="700ms"/> ${q}`, slotSuffix: 0 },
  { template: (q: string) => `Nästa fråga lyder<break time="600ms"/> ${q}`, slotSuffix: 1 },
  { template: (q: string) => `Lyssna på det här<break time="700ms"/> ${q}`, slotSuffix: 0 },
  { template: (q: string) => `Okej<break time="400ms"/> frågan blir<break time="600ms"/> ${q}`, slotSuffix: 1 },
  { template: (q: string) => `Nu blir det svårare<break time="600ms"/> ${q}`, slotSuffix: 0 },
];

export function buildQuestionRead(questionText: string): { text: string; slotSuffix: number } {
  const variant = QUESTION_INTRO_TEMPLATES[Math.floor(Math.random() * QUESTION_INTRO_TEMPLATES.length)];
  return {
    text: variant.template(questionText),
    slotSuffix: variant.slotSuffix,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Followup Intro — Bridge-fras mellan reveal och följdfrågor
// ══════════════════════════════════════════════════════════════════════════════

export function buildFollowupIntro(destinationName: string): string {
  const templates = [
    `Nu ska vi testa era kunskaper<break time="600ms"/> om ${destinationName}.<break time="800ms"/> Är ni redo?`,
    `Dags för följdfrågor<break time="500ms"/> om ${destinationName}!<break time="700ms"/> Här kommer dom!`,
    `Låt oss se<break time="400ms"/> vad kan ni om ${destinationName}?<break time="800ms"/>`,
    `Nu blir det quiz<break time="500ms"/> om ${destinationName}.<break time="700ms"/> Kör hårt!`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// Before Final — Inför den stora finalen
// ══════════════════════════════════════════════════════════════════════════════

export const BEFORE_FINAL_TEMPLATES = [
  'Nu närmar vi oss målstationen<break time="800ms"/> Vem vinner kvällens resa?<break time="1200ms"/>',
  'Dags att räkna poängen!<break time="700ms"/> Vem tar hem segern ikväll?<break time="1300ms"/>',
  'Slutstationen är här<break time="800ms"/> Nu ska vi se vem som vunnit!<break time="1400ms"/>',
  'Det har varit en fantastisk kväll<break time="600ms"/> men nu<break time="400ms"/> vem står som vinnare?<break time="1300ms"/>',
];

// ══════════════════════════════════════════════════════════════════════════════
// Utility functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Väljer en slumpmässig mall från en array av templates.
 */
export function pickRandom<T>(templates: T[]): T {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Estimerar duration för en text (används när TTS inte är tillgängligt).
 * Räknar ~150ms per ord + extra för SSML breaks.
 */
export function estimateDuration(text: string): number {
  // Räkna ord (exkluderar SSML markup)
  const plainText = text.replace(/<break[^>]*>/g, '');
  const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;

  // Räkna breaks och summera deras duration
  const breakMatches = text.match(/<break time="(\d+)ms"\/>/g) || [];
  const breakDuration = breakMatches.reduce((sum, match) => {
    const ms = match.match(/(\d+)ms/);
    return sum + (ms ? parseInt(ms[1]) : 0);
  }, 0);

  // ~150ms per ord + breaks + 500ms marginal
  return Math.max(wordCount * 150 + breakDuration + 500, 2000);
}

/**
 * Rensar SSML markup från text (för fallback display).
 */
export function stripSSML(text: string): string {
  return text.replace(/<break[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
