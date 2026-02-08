/**
 * Content Pack Loader
 * Loads and caches AI-generated content packs from disk
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Content pack structure from ai-content service
 */
export interface ContentPack {
  roundId: string;
  destination: {
    name: string;
    country: string;
    aliases: string[];
  };
  clues: Array<{
    level: number;
    text: string;
  }>;
  followups: Array<{
    questionText: string;
    options: string[] | null;
    correctAnswer: string;
    aliases?: string[];
  }>;
  metadata: {
    generatedAt: string;
    verified: boolean;
    antiLeakChecked: boolean;
    verificationDetails?: any;
  };
}

/**
 * Normalized content pack for use with existing game logic
 * Maps to the Destination interface in content-hardcoded.ts
 */
export interface NormalizedContentPack {
  id: string;
  name: string;
  country: string;
  aliases: string[];
  clues: Array<{
    points: 10 | 8 | 6 | 4 | 2;
    text: string;
  }>;
  followupQuestions: Array<{
    questionText: string;
    options: string[] | null;
    correctAnswer: string;
    aliases?: string[];
  }>;
  metadata?: {
    generatedAt: string;
    verified: boolean;
    antiLeakChecked: boolean;
  };
}

// In-memory cache for loaded content packs
const contentPackCache = new Map<string, NormalizedContentPack>();

/**
 * Gets the content packs directory from environment or default
 */
function getContentPacksDir(): string {
  return process.env.CONTENT_PACKS_DIR || '/tmp/pa-sparet-content-packs';
}

/**
 * Maps content pack clue level (10, 8, 6, 4, 2) to points
 */
function mapClueLevel(level: number): 10 | 8 | 6 | 4 | 2 {
  const validLevels: Array<10 | 8 | 6 | 4 | 2> = [10, 8, 6, 4, 2];
  if (validLevels.includes(level as any)) {
    return level as 10 | 8 | 6 | 4 | 2;
  }
  throw new Error(`Invalid clue level: ${level}`);
}

/**
 * Normalizes a content pack to the format expected by the game engine
 */
function normalizeContentPack(raw: ContentPack): NormalizedContentPack {
  // Sort clues by level descending (10, 8, 6, 4, 2)
  const sortedClues = [...raw.clues].sort((a, b) => b.level - a.level);

  // Validate that we have exactly 5 clues
  if (sortedClues.length !== 5) {
    throw new Error(
      `Content pack must have exactly 5 clues, got ${sortedClues.length}`
    );
  }

  // Validate levels
  const expectedLevels = [10, 8, 6, 4, 2];
  const actualLevels = sortedClues.map((c) => c.level);
  if (!expectedLevels.every((level, idx) => level === actualLevels[idx])) {
    throw new Error(
      `Content pack clues must have levels [10, 8, 6, 4, 2], got [${actualLevels.join(', ')}]`
    );
  }

  return {
    id: raw.roundId,
    name: raw.destination.name,
    country: raw.destination.country,
    aliases: raw.destination.aliases || [],
    clues: sortedClues.map((clue) => ({
      points: mapClueLevel(clue.level),
      text: clue.text,
    })),
    followupQuestions: raw.followups.map((fq) => ({
      questionText: fq.questionText,
      options: fq.options,
      correctAnswer: fq.correctAnswer,
      aliases: fq.aliases,
    })),
    metadata: {
      generatedAt: raw.metadata.generatedAt,
      verified: raw.metadata.verified,
      antiLeakChecked: raw.metadata.antiLeakChecked,
    },
  };
}

/**
 * Loads a content pack from disk by roundId
 * Returns cached version if available
 * @throws Error if pack not found or invalid
 */
export function loadContentPack(roundId: string): NormalizedContentPack {
  // Check cache first
  if (contentPackCache.has(roundId)) {
    logger.debug('Content pack loaded from cache', { roundId });
    return contentPackCache.get(roundId)!;
  }

  const contentPacksDir = getContentPacksDir();
  const packPath = path.join(contentPacksDir, `${roundId}.json`);

  logger.info('Loading content pack from disk', { roundId, packPath });

  // Check if file exists
  if (!fs.existsSync(packPath)) {
    throw new Error(`Content pack not found: ${roundId}`);
  }

  // Read and parse JSON
  let raw: ContentPack;
  try {
    const fileContent = fs.readFileSync(packPath, 'utf-8');
    raw = JSON.parse(fileContent);
  } catch (error: any) {
    logger.error('Failed to parse content pack JSON', {
      roundId,
      error: error.message,
    });
    throw new Error(`Invalid content pack JSON: ${error.message}`);
  }

  // Validate roundId matches
  if (raw.roundId !== roundId) {
    throw new Error(
      `Content pack roundId mismatch: expected ${roundId}, got ${raw.roundId}`
    );
  }

  // Normalize and validate
  let normalized: NormalizedContentPack;
  try {
    normalized = normalizeContentPack(raw);
  } catch (error: any) {
    logger.error('Failed to normalize content pack', {
      roundId,
      error: error.message,
    });
    throw new Error(`Invalid content pack structure: ${error.message}`);
  }

  // Cache for future use
  contentPackCache.set(roundId, normalized);

  logger.info('Content pack loaded successfully', {
    roundId,
    destination: normalized.name,
    clueCount: normalized.clues.length,
    followupCount: normalized.followupQuestions.length,
    verified: normalized.metadata?.verified,
  });

  return normalized;
}

/**
 * Lists all available content pack IDs
 */
export function listContentPacks(): string[] {
  const contentPacksDir = getContentPacksDir();

  logger.debug('Listing content packs', { contentPacksDir });

  // Check if directory exists
  if (!fs.existsSync(contentPacksDir)) {
    logger.warn('Content packs directory does not exist', { contentPacksDir });
    return [];
  }

  // Read all JSON files
  try {
    const files = fs.readdirSync(contentPacksDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const roundIds = jsonFiles.map((f) => f.replace('.json', ''));

    logger.debug('Content packs found', {
      count: roundIds.length,
      roundIds,
    });

    return roundIds;
  } catch (error: any) {
    logger.error('Failed to list content packs', {
      contentPacksDir,
      error: error.message,
    });
    return [];
  }
}

/**
 * Checks if a content pack exists
 */
export function contentPackExists(roundId: string): boolean {
  if (contentPackCache.has(roundId)) {
    return true;
  }

  const contentPacksDir = getContentPacksDir();
  const packPath = path.join(contentPacksDir, `${roundId}.json`);
  return fs.existsSync(packPath);
}

/**
 * Clears the content pack cache
 * Useful for testing or hot-reloading
 */
export function clearContentPackCache(): void {
  logger.info('Clearing content pack cache', {
    cachedCount: contentPackCache.size,
  });
  contentPackCache.clear();
}
