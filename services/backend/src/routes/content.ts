/**
 * Content Pack Management API Routes
 * Handles listing, loading, and generating AI content packs
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import {
  listContentPacks,
  loadContentPack,
  contentPackExists,
} from '../game/content-pack-loader';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * Gets AI Content Service URL from environment
 */
function getAIContentServiceUrl(): string {
  return process.env.AI_CONTENT_SERVICE_URL || 'http://localhost:3002';
}

/**
 * GET /v1/content/packs
 * Lists all available content packs with metadata
 * Returns ContentPackInfo format expected by iOS Host
 */
router.get('/v1/content/packs', (_req: Request, res: Response) => {
  try {
    const packIds = listContentPacks();

    logger.info('Loading content packs with metadata', {
      count: packIds.length,
    });

    // Load each pack to extract metadata
    const packs = [];
    const errors = [];

    for (const id of packIds) {
      try {
        const pack = loadContentPack(id);
        packs.push({
          roundId: pack.id,
          destinationName: pack.name,
          destinationCountry: pack.country,
          generatedAt: pack.metadata?.generatedAt || new Date().toISOString(),
          verified: pack.metadata?.verified || false,
          antiLeakChecked: pack.metadata?.antiLeakChecked || false,
        });
      } catch (error: any) {
        logger.error('Failed to load content pack for listing', {
          packId: id,
          error: error.message,
        });
        errors.push({ packId: id, error: error.message });
      }
    }

    logger.info('Listed content packs', {
      successCount: packs.length,
      errorCount: errors.length,
    });

    return res.status(200).json({
      packs,
      count: packs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    logger.error('Failed to list content packs', {
      error: error.message,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list content packs',
    });
  }
});

/**
 * GET /v1/content/packs/:id
 * Gets a specific content pack (for preview)
 */
router.get('/v1/content/packs/:id', (req: Request, res: Response) => {
  try {
    const packId = req.params.id;

    // Check if pack exists
    if (!contentPackExists(packId)) {
      return res.status(404).json({
        error: 'Not found',
        message: `Content pack not found: ${packId}`,
      });
    }

    // Load the pack
    const pack = loadContentPack(packId);

    logger.info('Content pack retrieved', {
      packId,
      destination: pack.name,
    });

    return res.status(200).json({
      roundId: pack.id,
      destination: {
        name: pack.name,
        country: pack.country,
      },
      clues: pack.clues,
      followupQuestions: pack.followupQuestions,
      metadata: pack.metadata,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve content pack', {
      packId: req.params.id,
      error: error.message,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to retrieve content pack: ${error.message}`,
    });
  }
});

/**
 * POST /v1/content/generate
 * Starts content pack generation via ai-content service
 * Body: { theme?: string, language?: string }
 * Returns: { generateId: string, status: string }
 */
router.post('/v1/content/generate', async (req: Request, res: Response) => {
  try {
    const { theme, language } = req.body;

    const aiContentUrl = getAIContentServiceUrl();
    const generateEndpoint = `${aiContentUrl}/generate/round`;

    logger.info('Initiating content generation', {
      aiContentUrl: generateEndpoint,
      theme,
      language,
    });

    // Proxy request to ai-content service
    const response = await axios.post(
      generateEndpoint,
      {
        theme,
        language: language || 'sv',
      },
      {
        timeout: 10000, // 10s timeout for initial request
      }
    );

    const { roundId, status } = response.data;

    logger.info('Content generation started', {
      roundId,
      status,
    });

    return res.status(202).json({
      generateId: roundId,
      status,
      roundId, // Also return roundId for clarity
    });
  } catch (error: any) {
    logger.error('Failed to initiate content generation', {
      error: error.message,
      response: error.response?.data,
    });

    if (error.response) {
      // Forward error from ai-content service
      return res.status(error.response.status).json({
        error: 'Content generation failed',
        message: error.response.data?.message || error.message,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to start content generation: ${error.message}`,
    });
  }
});

/**
 * GET /v1/content/generate/:id/status
 * Polls content generation status
 * Returns: { status: "generating" | "completed" | "failed", currentStep?, totalSteps?, contentPackId? }
 */
router.get(
  '/v1/content/generate/:id/status',
  async (req: Request, res: Response) => {
    try {
      const generateId = req.params.id;

      const aiContentUrl = getAIContentServiceUrl();
      const statusEndpoint = `${aiContentUrl}/generate/round/${generateId}/status`;

      logger.debug('Polling content generation status', {
        generateId,
        statusEndpoint,
      });

      // Proxy request to ai-content service
      const response = await axios.get(statusEndpoint, {
        timeout: 5000, // 5s timeout
      });

      const { status, currentStep, totalSteps, roundId } = response.data;

      logger.debug('Content generation status retrieved', {
        generateId,
        status,
        currentStep,
        totalSteps,
      });

      return res.status(200).json({
        status,
        currentStep,
        totalSteps,
        contentPackId: roundId,
      });
    } catch (error: any) {
      logger.error('Failed to get content generation status', {
        generateId: req.params.id,
        error: error.message,
      });

      if (error.response?.status === 404) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Generation task not found',
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: `Failed to get generation status: ${error.message}`,
      });
    }
  }
);

/**
 * DELETE /v1/content/packs/:id
 * Deletes a content pack from disk
 */
router.delete('/v1/content/packs/:id', (req: Request, res: Response) => {
  try {
    const packId = req.params.id;

    // Check if pack exists
    if (!contentPackExists(packId)) {
      return res.status(404).json({
        error: 'Not found',
        message: `Content pack not found: ${packId}`,
      });
    }

    // Delete the pack file
    const contentPacksDir =
      process.env.CONTENT_PACKS_DIR || '/tmp/pa-sparet-content-packs';
    const packPath = path.join(contentPacksDir, `${packId}.json`);

    fs.unlinkSync(packPath);

    logger.info('Content pack deleted', { packId });

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete content pack', {
      packId: req.params.id,
      error: error.message,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to delete content pack: ${error.message}`,
    });
  }
});

/**
 * POST /v1/content/packs/import
 * Imports a content pack from JSON
 * Body: ContentPack JSON structure
 */
router.post('/v1/content/packs/import', (req: Request, res: Response) => {
  try {
    const contentPack = req.body;

    // Basic validation
    if (!contentPack.roundId) {
      return res.status(400).json({
        error: 'Invalid content pack',
        message: 'Missing roundId field',
      });
    }

    if (!contentPack.destination?.name || !contentPack.destination?.country) {
      return res.status(400).json({
        error: 'Invalid content pack',
        message: 'Missing or invalid destination field',
      });
    }

    if (!Array.isArray(contentPack.clues) || contentPack.clues.length !== 5) {
      return res.status(400).json({
        error: 'Invalid content pack',
        message: 'Must have exactly 5 clues',
      });
    }

    if (!Array.isArray(contentPack.followups)) {
      return res.status(400).json({
        error: 'Invalid content pack',
        message: 'Missing followups array',
      });
    }

    // Check if pack already exists
    if (contentPackExists(contentPack.roundId)) {
      return res.status(409).json({
        error: 'Conflict',
        message: `Content pack already exists: ${contentPack.roundId}`,
      });
    }

    // Save to disk
    const contentPacksDir =
      process.env.CONTENT_PACKS_DIR || '/tmp/pa-sparet-content-packs';

    // Ensure directory exists
    if (!fs.existsSync(contentPacksDir)) {
      fs.mkdirSync(contentPacksDir, { recursive: true });
    }

    const packPath = path.join(contentPacksDir, `${contentPack.roundId}.json`);
    fs.writeFileSync(packPath, JSON.stringify(contentPack, null, 2), 'utf-8');

    logger.info('Content pack imported', {
      packId: contentPack.roundId,
      destination: contentPack.destination.name,
    });

    return res.status(201).json({
      message: 'Content pack imported successfully',
      roundId: contentPack.roundId,
    });
  } catch (error: any) {
    logger.error('Failed to import content pack', {
      error: error.message,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: `Failed to import content pack: ${error.message}`,
    });
  }
});

export default router;
