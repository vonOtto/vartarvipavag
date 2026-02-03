/**
 * Hardcoded destinations with clues for Sprint 1 testing
 * In Sprint 2+, this will be replaced by AI-generated content
 */

export interface Clue {
  points: 10 | 8 | 6 | 4 | 2;
  text: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  aliases: string[];
  clues: Clue[];
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
