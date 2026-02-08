/**
 * Round Generator
 *
 * Main orchestrator for generating complete content packs.
 * Combines destination, clues, followups, verification, and anti-leak checks.
 */

import { v4 as uuidv4 } from 'uuid';
import { ContentPack, GenerationProgress } from '../types/content-pack';
import { CONFIG } from '../config';
import { generateDestination } from './destination-generator';
import { generateClues } from './clue-generator';
import { generateFollowups } from './followup-generator';
import {
  verifyDestination,
  verifyAllClues,
  verifyAllFollowups,
} from '../verification/fact-checker';
import {
  checkCluesForLeaks,
  checkFollowupsForLeaks,
} from '../verification/anti-leak-checker';
import { checkFollowupOverlaps } from '../verification/overlap-checker';
import { costTracker } from '../metrics/cost-tracker';
import { polishClue, polishFollowup } from '../utils/swedish-polish';
import { getContentPackStorage } from '../storage/content-pack-storage';

export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Generate a complete content pack with verification and anti-leak checks
 */
export async function generateRound(
  onProgress?: ProgressCallback,
  maxRetries: number = 3,
  excludeDestinations?: string[]
): Promise<ContentPack> {
  const roundId = uuidv4();
  let attempt = 0;

  // Start cost tracking
  costTracker.startRound(roundId);

  // Get storage instance
  const storage = getContentPackStorage();

  while (attempt < maxRetries) {
    attempt++;
    console.log(`[round-generator] Attempt ${attempt}/${maxRetries} for round ${roundId}`);

    try {
      // Step 1: Initialize
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.INIT,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Initierar generering',
        roundId,
      });

      // Step 2: Generate destination
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.GENERATE_DESTINATION,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Genererar destination',
        roundId,
      });

      const destination = await generateDestination(excludeDestinations);

      // Deduplication check: If destination already exists, return existing pack
      const existingPackId = storage.findExistingDestination(destination.name);
      if (existingPackId) {
        console.log(`[round-generator] Destination "${destination.name}" already exists (${existingPackId}), reusing existing pack`);
        const existingPack = storage.loadPack(existingPackId);
        if (existingPack) {
          onProgress?.({
            currentStep: CONFIG.GENERATION_STEPS.COMPLETE,
            totalSteps: CONFIG.TOTAL_STEPS,
            stepName: 'Klar (återanvänd befintlig pack)',
            roundId: existingPackId,
            destination: destination.name,
          });
          return existingPack;
        }
      }

      // Step 3: Generate clues
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.GENERATE_CLUES,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Genererar ledtrådar',
        roundId,
        destination: destination.name,
      });

      let clues = await generateClues(destination);

      // Apply Swedish language polish to clues
      clues = clues.map(polishClue);

      // Step 4: Generate followup questions
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.GENERATE_FOLLOWUPS,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Genererar följdfrågor',
        roundId,
        destination: destination.name,
      });

      let followups = await generateFollowups(destination, 2);

      // Apply Swedish language polish to followups
      followups = followups.map(polishFollowup);

      // Step 5: Verify facts
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.VERIFY_FACTS,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Verifierar fakta',
        roundId,
        destination: destination.name,
      });

      const destinationVerified = await verifyDestination(destination);
      const cluesVerified = await verifyAllClues(clues, destination);
      const followupsVerified = await verifyAllFollowups(followups, destination);

      // Check if any verification failed critically
      const hasCriticalFactError =
        destinationVerified.status === 'rejected' ||
        cluesVerified.some((v) => v.status === 'rejected') ||
        followupsVerified.some((v) => v.status === 'rejected');

      if (hasCriticalFactError) {
        console.warn(`[round-generator] Critical fact error detected, retrying...`);
        continue; // Retry
      }

      // Step 6: Anti-leak check
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.ANTI_LEAK_CHECK,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Kontrollerar anti-leak',
        roundId,
        destination: destination.name,
      });

      const clueLeakCheck = await checkCluesForLeaks(clues, destination);
      const followupLeakCheck = await checkFollowupsForLeaks(followups, destination);
      const overlapCheck = await checkFollowupOverlaps(followups, clues, destination);

      const antiLeakPassed = clueLeakCheck.passed && followupLeakCheck.passed;
      const overlapPassed = overlapCheck.passed;

      if (!antiLeakPassed && CONFIG.ANTI_LEAK_STRICT_MODE) {
        console.warn(`[round-generator] Anti-leak check failed, retrying...`);
        continue; // Retry
      }

      if (!overlapPassed && CONFIG.ANTI_LEAK_STRICT_MODE) {
        console.warn(`[round-generator] Overlap check failed, retrying...`);
        continue; // Retry
      }

      // Step 7: TTS generation placeholder
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.TTS_GENERATION,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Förbereder TTS',
        roundId,
        destination: destination.name,
      });

      // TTS will be generated separately via POST /tts/batch
      // This step just marks that the content is ready for TTS

      // Step 8: Complete
      onProgress?.({
        currentStep: CONFIG.GENERATION_STEPS.COMPLETE,
        totalSteps: CONFIG.TOTAL_STEPS,
        stepName: 'Klar',
        roundId,
        destination: destination.name,
      });

      const allVerified =
        destinationVerified.verified &&
        cluesVerified.every((v) => v.verified) &&
        followupsVerified.every((v) => v.verified);

      const contentPack: ContentPack = {
        roundId,
        destination,
        clues,
        followups,
        metadata: {
          generatedAt: new Date().toISOString(),
          verified: allVerified,
          antiLeakChecked: antiLeakPassed,
          overlapChecked: overlapPassed,
          verificationDetails: {
            destinationVerified,
            cluesVerified,
            followupsVerified,
            antiLeakPassed,
            overlapPassed,
            overlapResults: overlapCheck.results,
          },
        },
      };

      console.log(`[round-generator] Successfully generated round ${roundId}`);
      console.log(`  Destination: ${destination.name}, ${destination.country}`);
      console.log(`  Clues: ${clues.length}`);
      console.log(`  Followups: ${followups.length}`);
      console.log(`  Verified: ${allVerified}`);
      console.log(`  Anti-leak passed: ${antiLeakPassed}`);
      console.log(`  Overlap check passed: ${overlapPassed}`);

      // Save content pack to persistent storage
      storage.savePack(contentPack);

      // Save cost metrics
      costTracker.saveMetrics();

      return contentPack;
    } catch (error) {
      console.error(`[round-generator] Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate round after ${maxRetries} attempts: ${(error as Error).message}`);
      }
      // Wait before retry
      await sleep(2000 * attempt);
    }
  }

  throw new Error('Failed to generate round');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
