/**
 * Hardcoded destinations with clues for Sprint 1 testing
 * In Sprint 2+, this will be replaced by AI-generated content
 */

export interface Clue {
  points: 10 | 8 | 6 | 4 | 2;
  text: string;
}

export interface FollowupQuestion {
  questionText: string;
  options: string[] | null;          // null = open-text
  correctAnswer: string;
  aliases?: string[];                // accepted alternative answers (open-text only)
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  aliases: string[];
  clues: Clue[];
  followupQuestions: FollowupQuestion[];
}

export const HARDCODED_DESTINATIONS: Destination[] = [
  {
    id: 'paris',
    name: 'Paris',
    country: 'Frankrike',
    aliases: ['paris', 'paree', 'city of light', 'ljusets stad'],
    clues: [
      {
        points: 10,
        text: 'Här finns ett 324 meter högt järntorn som invigdes 1889.',
      },
      {
        points: 8,
        text: "Staden kallas 'Ljusets stad' och är känd för sin konst och mode.",
      },
      {
        points: 6,
        text: 'Här ligger Louvren, världens mest besökta konstmuseum.',
      },
      {
        points: 4,
        text: 'Från denna stad kan du ta Thalys-tåget till Bryssel eller Amsterdam.',
      },
      {
        points: 2,
        text: 'Huvudstad i Frankrike, berömd för Champs-Élysées och Notre-Dame.',
      },
    ],
    followupQuestions: [
      {
        questionText: 'Vilket år byggdes Eiffel Tower?',
        options: ['1869', '1889', '1909', '1929'],
        correctAnswer: '1889',
      },
      {
        questionText: 'Vilken flod flödar genom Paris?',
        options: null,
        correctAnswer: 'Seine',
        aliases: ['seine'],
      },
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    aliases: ['tokyo', 'tokio', 'edo'],
    clues: [
      {
        points: 10,
        text: 'I denna stad finns världens mest trafikerade tågstation, Shinjuku.',
      },
      {
        points: 8,
        text: 'Staden var värd för olympiska sommarspelen 1964 och 2020.',
      },
      {
        points: 6,
        text: 'Här står Tokyo Tower och det moderna Tokyo Skytree.',
      },
      {
        points: 4,
        text: 'Staden ligger vid Tokyobukten och är känd för sin fiskmarknad Tsukiji.',
      },
      {
        points: 2,
        text: 'Huvudstad i Japan och en av världens största metropoler.',
      },
    ],
    followupQuestions: [
      {
        questionText: 'I vilken stadsdel (ward) ligger Imperial Palace?',
        options: ['Chiyoda', 'Shinjuku', 'Shibuya', 'Minato'],
        correctAnswer: 'Chiyoda',
      },
      {
        questionText: 'Vad heter den gamla namn som Tokyo hade innan 1868?',
        options: null,
        correctAnswer: 'Edo',
        aliases: ['edo'],
      },
    ],
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    aliases: ['new york', 'nyc', 'new york city', 'big apple', 'stora äpplet'],
    clues: [
      {
        points: 10,
        text: 'I denna stad finns en grön staty som var en gåva från Frankrike 1886.',
      },
      {
        points: 8,
        text: 'Staden består av fem stadsdelar: Manhattan, Brooklyn, Queens, Bronx och Staten Island.',
      },
      {
        points: 6,
        text: 'Här ligger Times Square och Broadway med sina kända musikaler.',
      },
      {
        points: 4,
        text: 'Central Park är en 341 hektar stor park mitt i staden.',
      },
      {
        points: 2,
        text: 'Största stad i USA, ofta kallad "The Big Apple".',
      },
    ],
    followupQuestions: [
      {
        questionText: 'Hur många stadsdelar (boroughs) har New York City?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '5',
      },
      {
        questionText: 'Vad heter den stora parken mitt i Manhattan?',
        options: null,
        correctAnswer: 'Central Park',
        aliases: ['central park'],
      },
    ],
  },
];

/**
 * Gets a random destination from the hardcoded list
 */
export function getRandomDestination(): Destination {
  const index = Math.floor(Math.random() * HARDCODED_DESTINATIONS.length);
  return HARDCODED_DESTINATIONS[index];
}

/**
 * Gets a destination by ID
 */
export function getDestinationById(id: string): Destination | undefined {
  return HARDCODED_DESTINATIONS.find((d) => d.id === id);
}

/**
 * Normalizes answer text for comparison
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Checks if an answer matches the destination or any of its aliases
 */
export function isAnswerCorrect(
  answerText: string,
  destination: Destination
): boolean {
  const normalizedAnswer = normalizeAnswer(answerText);
  const normalizedName = normalizeAnswer(destination.name);

  // Check exact name match
  if (normalizedAnswer === normalizedName) {
    return true;
  }

  // Check aliases
  return destination.aliases.some(
    (alias) => normalizeAnswer(alias) === normalizedAnswer
  );
}

/**
 * Checks if an answer matches a follow-up question.
 * Multiple-choice: exact option match (case-insensitive).
 * Open-text: match against correctAnswer + aliases.
 */
export function isFollowupAnswerCorrect(
  answerText: string,
  question: FollowupQuestion
): boolean {
  const normalizedAnswer = normalizeAnswer(answerText);

  if (question.options) {
    // Multiple-choice: must match one of the options exactly AND be the correct one
    return normalizedAnswer === normalizeAnswer(question.correctAnswer);
  }

  // Open-text: check correctAnswer + aliases
  if (normalizedAnswer === normalizeAnswer(question.correctAnswer)) {
    return true;
  }
  return (question.aliases || []).some(
    (alias) => normalizeAnswer(alias) === normalizedAnswer
  );
}
