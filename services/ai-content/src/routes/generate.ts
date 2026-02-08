/**
 * Generate Routes
 *
 * API endpoints for content generation.
 */

import { Router, Request, Response } from 'express';
import { generateRound } from '../generators/round-generator';
import { GenerationProgress, GenerationResponse } from '../types/content-pack';
import { CONFIG } from '../config';

const router = Router();

/**
 * POST /generate/round
 *
 * Generates a complete content pack (destination + clues + followups).
 * Returns progress updates and final content pack.
 */
router.post('/round', async (_req: Request, res: Response) => {
  console.log('[generate] Starting round generation...');

  // Check if API key is configured
  if (!CONFIG.ANTHROPIC_API_KEY) {
    const response: GenerationResponse = {
      success: false,
      error: 'ANTHROPIC_API_KEY not configured. Cannot generate content.',
    };
    res.status(503).json(response);
    return;
  }

  try {
    // Generate round with progress tracking
    let lastProgress: GenerationProgress | undefined;

    const contentPack = await generateRound((progress) => {
      lastProgress = progress;
      console.log(
        `[generate] Progress: Step ${progress.currentStep}/${progress.totalSteps} - ${progress.stepName}`
      );
    });

    // Success response
    const response: GenerationResponse = {
      success: true,
      contentPack,
      progress: lastProgress,
    };

    console.log(`[generate] Round generated successfully: ${contentPack.roundId}`);
    res.json(response);
  } catch (error) {
    console.error('[generate] Failed to generate round:', error);

    const response: GenerationResponse = {
      success: false,
      error: (error as Error).message,
    };

    res.status(500).json(response);
  }
});

/**
 * POST /generate/batch
 *
 * Generates multiple content packs in parallel (for multi-destination games).
 * Body: { count: 3-5, regions?: string[], language?: string }
 * Returns: { packs: Array<{ id, name, country }> }
 */
router.post('/batch', async (req: Request, res: Response) => {
  console.log('[generate] Starting batch generation...');

  if (!CONFIG.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  try {
    const { count, regions, language } = req.body;

    // Validate count
    if (!count || typeof count !== 'number' || count < 3 || count > 5) {
      res.status(400).json({
        error: 'Validation error',
        message: 'count must be a number between 3 and 5',
      });
      return;
    }

    console.log(`[generate] Generating ${count} content packs...`, { regions, language });

    // Generate packs SEQUENTIALLY to avoid duplicates
    const contentPacks = [];
    const excludeDestinations: string[] = [];

    for (let i = 0; i < count; i++) {
      console.log(`[generate] Generating pack ${i + 1}/${count} (excluding: ${excludeDestinations.join(', ')})`);

      const pack = await generateRound(
        (progress) => {
          console.log(
            `[generate] Pack ${i + 1}/${count}: Step ${progress.currentStep}/${progress.totalSteps} - ${progress.stepName}`
          );
        },
        3, // maxRetries
        excludeDestinations // Pass previously generated destinations
      );

      contentPacks.push(pack);
      excludeDestinations.push(pack.destination.name);
    }

    // Return summary with basic info
    const packsummary = contentPacks.map((pack) => ({
      id: pack.roundId,
      name: pack.destination.name,
      country: pack.destination.country,
    }));

    console.log(`[generate] Batch generation complete: ${count} packs generated`);
    res.json({
      success: true,
      packs: packsummary,
      count: contentPacks.length,
    });
  } catch (error) {
    console.error('[generate] Failed to generate batch:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /generate/destination
 *
 * Generates just a destination (for testing/preview).
 */
router.post('/destination', async (_req: Request, res: Response) => {
  if (!CONFIG.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  try {
    const { generateDestination } = await import('../generators/destination-generator');
    const destination = await generateDestination();

    res.json({
      success: true,
      destination,
    });
  } catch (error) {
    console.error('[generate] Failed to generate destination:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /generate/status
 *
 * Returns configuration status.
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: !!CONFIG.ANTHROPIC_API_KEY,
    model: CONFIG.ANTHROPIC_MODEL,
    antiLeakStrictMode: CONFIG.ANTI_LEAK_STRICT_MODE,
    maxRetries: CONFIG.MAX_RETRIES,
  });
});

export default router;
