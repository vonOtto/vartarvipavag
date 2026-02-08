/**
 * Game Plan API Routes
 * Handles creation and management of multi-destination game plans
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { sessionStore, GamePlan, DestinationConfig } from '../store/session-store';
import { loadContentPack, contentPackExists } from '../game/content-pack-loader';
import axios from 'axios';
import { getServerTimeMs } from '../utils/time';

const router = Router();

/**
 * Gets AI Content Service URL from environment
 */
function getAIContentServiceUrl(): string {
  return process.env.AI_CONTENT_SERVICE_URL || 'http://localhost:3002';
}

/**
 * Parses a text number (e.g. "tre", "four", "5") into a numeric value
 */
function parseTextNumber(text: string): number | undefined {
  const map: Record<string, number> = {
    'tre': 3, 'three': 3,
    'fyra': 4, 'four': 4,
    'fem': 5, 'five': 5,
  };
  const numValue = parseInt(text, 10);
  return map[text] || (!isNaN(numValue) ? numValue : undefined);
}

/**
 * Parses a natural language destination prompt into structured parameters
 * Examples:
 * - "4 resmål i Europa" → { count: 4, regions: ["Europe"] }
 * - "Tre destinationer i Asien" → { count: 3, regions: ["Asia"] }
 * - "5 nordic countries" → { count: 5, regions: ["Nordic"] }
 * - "destinations in South America" → { regions: ["South America"] }
 */
function parseDestinationPrompt(prompt: string): { count?: number; regions?: string[] } {
  const lower = prompt.toLowerCase();

  // Extract count (3, 4, 5, "tre", "four", etc.)
  const numberMatch = lower.match(/(\d+|tre|three|fyra|four|fem|five)/);
  const count = numberMatch ? parseTextNumber(numberMatch[1]) : undefined;

  // Extract region keywords
  const regions: string[] = [];

  if (lower.includes('europa') || lower.includes('europe')) {
    regions.push('Europe');
  }
  if (lower.includes('asien') || lower.includes('asia')) {
    regions.push('Asia');
  }
  if (lower.includes('afrika') || lower.includes('africa')) {
    regions.push('Africa');
  }
  if (lower.includes('oceani') || lower.includes('oceania')) {
    regions.push('Oceania');
  }

  // Handle Americas (with North/South variants)
  if (lower.includes('amerika') || lower.includes('america')) {
    if (lower.includes('south') || lower.includes('syd')) {
      regions.push('South America');
    } else if (lower.includes('north') || lower.includes('nord')) {
      regions.push('North America');
    } else {
      regions.push('Americas');
    }
  }

  // Nordic/Scandinavian regions
  if (lower.includes('nordisk') || lower.includes('nordic') || lower.includes('scandinav')) {
    regions.push('Nordic');
  }

  return {
    count,
    regions: regions.length > 0 ? regions : undefined
  };
}

/**
 * POST /v1/sessions/:sessionId/game-plan/generate-ai
 * Creates a game plan by generating multiple destinations via AI
 * Body: { numDestinations?: 3-5, regions?: string[], prompt?: string }
 * - If prompt is provided, it will be parsed to extract count and regions
 * - Otherwise, numDestinations and regions will be used directly
 * Returns: { gamePlan: GamePlan, destinations: DestinationSummary[] }
 */
router.post(
  '/v1/sessions/:sessionId/game-plan/generate-ai',
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { numDestinations, regions, prompt } = req.body;

      // Validate session exists
      const session = sessionStore.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Session not found',
        });
      }

      // Parse prompt if provided, otherwise use direct parameters
      let count = numDestinations;
      let targetRegions = regions;

      if (prompt && typeof prompt === 'string') {
        const parsed = parseDestinationPrompt(prompt);
        count = parsed.count || numDestinations || 3; // Fallback to numDestinations or default 3
        targetRegions = parsed.regions || regions; // Fallback to regions parameter

        logger.info('Parsed destination prompt', {
          sessionId,
          prompt,
          parsedCount: parsed.count,
          parsedRegions: parsed.regions,
          finalCount: count,
          finalRegions: targetRegions,
        });
      }

      // Validate count (after parsing)
      if (
        !count ||
        typeof count !== 'number' ||
        count < 3 ||
        count > 5
      ) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Destination count must be between 3 and 5',
        });
      }

      // Validate session is in LOBBY
      if (session.state.phase !== 'LOBBY') {
        return res.status(400).json({
          error: 'Invalid phase',
          message: 'Game plan can only be created in LOBBY phase',
        });
      }

      logger.info('Generating AI game plan', {
        sessionId,
        count,
        regions: targetRegions,
        prompt: prompt || undefined,
      });

      // Call ai-content service to generate batch
      const aiContentUrl = getAIContentServiceUrl();
      const batchEndpoint = `${aiContentUrl}/generate/batch`;

      const aiResponse = await axios.post(
        batchEndpoint,
        {
          count: count,
          regions: targetRegions || [],
          language: 'sv',
        },
        {
          timeout: 360000, // 6 minutes timeout for batch generation (60-90s per pack × 3-5 packs)
        }
      );

      const { packs } = aiResponse.data;

      if (!packs || packs.length !== count) {
        logger.error('AI content service returned unexpected data', {
          expected: count,
          received: packs?.length,
        });
        return res.status(500).json({
          error: 'Content generation failed',
          message: 'Failed to generate all destinations',
        });
      }

      // Create GamePlan
      const destinations: DestinationConfig[] = packs.map(
        (pack: any, index: number) => ({
          contentPackId: pack.id,
          sourceType: 'ai' as const,
          order: index + 1,
        })
      );

      const gamePlan: GamePlan = {
        destinations,
        currentIndex: 0,
        mode: 'ai',
        createdAt: getServerTimeMs(),
        generatedBy: 'ai-content',
      };

      // Save to session
      session.gamePlan = gamePlan;

      logger.info('AI game plan created', {
        sessionId,
        destinationCount: destinations.length,
        packIds: packs.map((p: any) => p.id),
      });

      // Return summary
      const destinationSummaries = packs.map((pack: any) => ({
        name: pack.name,
        country: pack.country,
      }));

      return res.status(201).json({
        gamePlan,
        destinations: destinationSummaries,
      });
    } catch (error: any) {
      logger.error('Failed to generate AI game plan', {
        sessionId: req.params.sessionId,
        error: error.message,
        response: error.response?.data,
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Content generation failed',
          message: error.response.data?.message || error.message,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: `Failed to generate game plan: ${error.message}`,
      });
    }
  }
);

/**
 * POST /v1/sessions/:sessionId/game-plan/import
 * Creates a game plan by importing manual content packs
 * Body: { contentPackIds: string[] }
 * Returns: { gamePlan: GamePlan, destinations: DestinationSummary[] }
 */
router.post(
  '/v1/sessions/:sessionId/game-plan/import',
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { contentPackIds } = req.body;

      // Validate session exists
      const session = sessionStore.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Session not found',
        });
      }

      // Validate contentPackIds
      if (
        !contentPackIds ||
        !Array.isArray(contentPackIds) ||
        contentPackIds.length < 3 ||
        contentPackIds.length > 5
      ) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'contentPackIds must be an array of 3-5 pack IDs',
        });
      }

      // Validate session is in LOBBY
      if (session.state.phase !== 'LOBBY') {
        return res.status(400).json({
          error: 'Invalid phase',
          message: 'Game plan can only be created in LOBBY phase',
        });
      }

      // Validate all packs exist
      const invalidPacks = contentPackIds.filter((id) => !contentPackExists(id));
      if (invalidPacks.length > 0) {
        return res.status(404).json({
          error: 'Content packs not found',
          message: `The following content packs do not exist: ${invalidPacks.join(', ')}`,
        });
      }

      logger.info('Creating manual game plan', {
        sessionId,
        packCount: contentPackIds.length,
        packIds: contentPackIds,
      });

      // Load all packs to get destination info
      const packs = contentPackIds.map((id) => loadContentPack(id));

      // Create GamePlan
      const destinations: DestinationConfig[] = contentPackIds.map((id, index) => ({
        contentPackId: id,
        sourceType: 'manual' as const,
        order: index + 1,
      }));

      const gamePlan: GamePlan = {
        destinations,
        currentIndex: 0,
        mode: 'manual',
        createdAt: getServerTimeMs(),
        generatedBy: 'manual-import',
      };

      // Save to session
      session.gamePlan = gamePlan;

      logger.info('Manual game plan created', {
        sessionId,
        destinationCount: destinations.length,
        packIds: contentPackIds,
      });

      // Return summary
      const destinationSummaries = packs.map((pack) => ({
        name: pack.name,
        country: pack.country,
      }));

      return res.status(201).json({
        gamePlan,
        destinations: destinationSummaries,
      });
    } catch (error: any) {
      logger.error('Failed to create manual game plan', {
        sessionId: req.params.sessionId,
        error: error.message,
      });

      return res.status(500).json({
        error: 'Internal server error',
        message: `Failed to create game plan: ${error.message}`,
      });
    }
  }
);

/**
 * POST /v1/sessions/:sessionId/game-plan/hybrid
 * Creates a game plan with mixed AI and manual content
 * Body: { aiGenerated: number, manualPackIds: string[] }
 * Returns: { gamePlan: GamePlan, destinations: DestinationSummary[] }
 */
router.post(
  '/v1/sessions/:sessionId/game-plan/hybrid',
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { aiGenerated, manualPackIds } = req.body;

      // Validate session exists
      const session = sessionStore.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Session not found',
        });
      }

      // Validate counts
      if (typeof aiGenerated !== 'number' || aiGenerated < 0 || aiGenerated > 5) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'aiGenerated must be a number between 0 and 5',
        });
      }

      if (!Array.isArray(manualPackIds)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'manualPackIds must be an array',
        });
      }

      const totalDestinations = aiGenerated + manualPackIds.length;
      if (totalDestinations < 3 || totalDestinations > 5) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Total destinations (AI + manual) must be between 3 and 5',
        });
      }

      // Validate session is in LOBBY
      if (session.state.phase !== 'LOBBY') {
        return res.status(400).json({
          error: 'Invalid phase',
          message: 'Game plan can only be created in LOBBY phase',
        });
      }

      // Validate manual packs exist
      const invalidPacks = manualPackIds.filter((id) => !contentPackExists(id));
      if (invalidPacks.length > 0) {
        return res.status(404).json({
          error: 'Content packs not found',
          message: `The following content packs do not exist: ${invalidPacks.join(', ')}`,
        });
      }

      logger.info('Creating hybrid game plan', {
        sessionId,
        aiGenerated,
        manualPacks: manualPackIds.length,
      });

      // Generate AI packs if needed
      let aiPacks: any[] = [];
      if (aiGenerated > 0) {
        const aiContentUrl = getAIContentServiceUrl();
        const batchEndpoint = `${aiContentUrl}/generate/batch`;

        const aiResponse = await axios.post(
          batchEndpoint,
          {
            count: aiGenerated,
            language: 'sv',
          },
          {
            timeout: 180000,
          }
        );

        aiPacks = aiResponse.data.packs || [];

        if (aiPacks.length !== aiGenerated) {
          return res.status(500).json({
            error: 'Content generation failed',
            message: 'Failed to generate all AI destinations',
          });
        }
      }

      // Load manual packs
      const manualPacks = manualPackIds.map((id) => loadContentPack(id));

      // Interleave AI and manual packs (alternating pattern)
      const allPacks: Array<{ id: string; name: string; country: string; type: 'ai' | 'manual' }> =
        [];
      let aiIndex = 0;
      let manualIndex = 0;

      for (let i = 0; i < totalDestinations; i++) {
        if (i % 2 === 0 && aiIndex < aiPacks.length) {
          // Even index: try AI first
          const pack = aiPacks[aiIndex++];
          allPacks.push({ ...pack, type: 'ai' });
        } else if (manualIndex < manualPacks.length) {
          // Odd index or no more AI: use manual
          const pack = manualPacks[manualIndex++];
          allPacks.push({ id: pack.id, name: pack.name, country: pack.country, type: 'manual' });
        } else {
          // No more manual: use remaining AI
          const pack = aiPacks[aiIndex++];
          allPacks.push({ ...pack, type: 'ai' });
        }
      }

      // Create GamePlan
      const destinations: DestinationConfig[] = allPacks.map((pack, index) => ({
        contentPackId: pack.id,
        sourceType: pack.type,
        order: index + 1,
      }));

      const gamePlan: GamePlan = {
        destinations,
        currentIndex: 0,
        mode: 'hybrid',
        createdAt: getServerTimeMs(),
        generatedBy: 'hybrid',
      };

      // Save to session
      session.gamePlan = gamePlan;

      logger.info('Hybrid game plan created', {
        sessionId,
        destinationCount: destinations.length,
        aiPacks: aiGenerated,
        manualPacks: manualPackIds.length,
      });

      // Return summary
      const destinationSummaries = allPacks.map((pack) => ({
        name: pack.name,
        country: pack.country,
      }));

      return res.status(201).json({
        gamePlan,
        destinations: destinationSummaries,
      });
    } catch (error: any) {
      logger.error('Failed to create hybrid game plan', {
        sessionId: req.params.sessionId,
        error: error.message,
        response: error.response?.data,
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Content generation failed',
          message: error.response.data?.message || error.message,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: `Failed to create game plan: ${error.message}`,
      });
    }
  }
);

/**
 * GET /v1/sessions/:sessionId/game-plan
 * Gets the current game plan for a session
 * Returns: { gamePlan: GamePlan, currentDestination: DestinationInfo }
 */
router.get('/v1/sessions/:sessionId/game-plan', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;

    // Validate session exists
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found',
      });
    }

    // Check if game plan exists
    if (!session.gamePlan) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No game plan exists for this session',
      });
    }

    const { gamePlan } = session;
    const currentDest = gamePlan.destinations[gamePlan.currentIndex];

    // Load current destination info
    let currentDestinationInfo = null;
    if (currentDest && contentPackExists(currentDest.contentPackId)) {
      const pack = loadContentPack(currentDest.contentPackId);
      currentDestinationInfo = {
        index: gamePlan.currentIndex + 1,
        total: gamePlan.destinations.length,
        name: pack.name,
        country: pack.country,
      };
    }

    logger.debug('Game plan retrieved', {
      sessionId,
      mode: gamePlan.mode,
      currentIndex: gamePlan.currentIndex,
      totalDestinations: gamePlan.destinations.length,
    });

    return res.status(200).json({
      gamePlan,
      currentDestination: currentDestinationInfo,
    });
  } catch (error: any) {
    logger.error('Failed to get game plan', {
      sessionId: req.params.sessionId,
      error: error.message,
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to get game plan: ${error.message}`,
    });
  }
});

export default router;
