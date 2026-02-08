/**
 * Content Pool Batch Generation
 *
 * Generates multiple content packs in parallel for cost optimization.
 * Pre-generated packs can be reused across multiple game sessions.
 *
 * Usage:
 *   npm run generate-pool -- --count 50 --parallel 3
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateRound } from '../generators/round-generator';
import { getContentPackStorage } from '../storage/content-pack-storage';

const CONTENT_PACKS_DIR = process.env.CONTENT_PACKS_DIR || './data/content-packs';

interface GenerationStats {
  totalRequested: number;
  successful: number;
  failed: number;
  duration: number;
  averageTimePerPack: number;
  failedRounds: string[];
}

interface PoolMetadata {
  generatedAt: string;
  totalPacks: number;
  stats: GenerationStats;
  packs: Array<{
    roundId: string;
    destination: string;
    country: string;
    verified: boolean;
  }>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { count: number; parallel: number } {
  const args = process.argv.slice(2);
  let count = 10; // default
  let parallel = 2; // default

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--parallel' && args[i + 1]) {
      parallel = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { count, parallel };
}

/**
 * Generate a single content pack with error handling
 */
async function generateSinglePack(index: number, excludeDestinations: string[]): Promise<{
  success: boolean;
  roundId?: string;
  destination?: string;
  country?: string;
  verified?: boolean;
  error?: string;
}> {
  try {
    console.log(`[${index}] Starting generation...`);
    const pack = await generateRound(undefined, 3, excludeDestinations);

    // Note: generateRound now automatically saves to storage via content-pack-storage.ts
    // No need to manually save here

    console.log(`[${index}] ✅ Generated: ${pack.destination.name}, ${pack.destination.country}`);

    return {
      success: true,
      roundId: pack.roundId,
      destination: pack.destination.name,
      country: pack.destination.country,
      verified: pack.metadata.verified,
    };
  } catch (error) {
    console.error(`[${index}] ❌ Failed:`, error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Generate content packs in batches with controlled parallelism
 */
async function generatePool(count: number, parallelism: number): Promise<GenerationStats> {
  console.log(`\n🎯 Generating ${count} content packs with parallelism=${parallelism}\n`);

  const startTime = Date.now();
  const stats: GenerationStats = {
    totalRequested: count,
    successful: 0,
    failed: 0,
    duration: 0,
    averageTimePerPack: 0,
    failedRounds: [],
  };

  const metadata: PoolMetadata = {
    generatedAt: new Date().toISOString(),
    totalPacks: 0,
    stats,
    packs: [],
  };

  // Track generated destinations to avoid duplicates within this batch
  const excludeDestinations: string[] = [];

  // Initialize storage (creates directory if needed)
  const storage = getContentPackStorage();
  console.log(`Storage directory: ${storage.getStorageDir()}\n`);

  // Generate in batches
  for (let i = 0; i < count; i += parallelism) {
    const batchSize = Math.min(parallelism, count - i);
    const batchPromises: Promise<any>[] = [];

    console.log(`\n📦 Batch ${Math.floor(i / parallelism) + 1}/${Math.ceil(count / parallelism)}: Generating ${batchSize} packs in parallel...\n`);

    for (let j = 0; j < batchSize; j++) {
      const index = i + j + 1;
      batchPromises.push(generateSinglePack(index, excludeDestinations));
    }

    // Wait for batch to complete
    const results = await Promise.all(batchPromises);

    // Update stats
    for (const result of results) {
      if (result.success) {
        stats.successful++;
        excludeDestinations.push(result.destination!);
        metadata.packs.push({
          roundId: result.roundId!,
          destination: result.destination!,
          country: result.country!,
          verified: result.verified!,
        });
      } else {
        stats.failed++;
        stats.failedRounds.push(result.error || 'Unknown error');
      }
    }

    // Progress update
    const progress = Math.round(((i + batchSize) / count) * 100);
    console.log(`\n📈 Progress: ${progress}% (${stats.successful} successful, ${stats.failed} failed)\n`);
  }

  stats.duration = Date.now() - startTime;
  stats.averageTimePerPack = stats.successful > 0 ? stats.duration / stats.successful : 0;

  metadata.totalPacks = stats.successful;

  // Save legacy metadata for backwards compatibility
  const metadataPath = path.join(CONTENT_PACKS_DIR, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return stats;
}

/**
 * Main execution
 */
async function main() {
  const { count, parallel } = parseArgs();

  console.log('🚀 Content Pool Generator');
  console.log('═'.repeat(50));
  console.log(`Count: ${count}`);
  console.log(`Parallel: ${parallel}`);
  console.log(`Output: ${CONTENT_PACKS_DIR}`);
  console.log('═'.repeat(50));

  const stats = await generatePool(count, parallel);

  console.log('\n✅ Generation complete!\n');
  console.log('📊 Statistics:');
  console.log('═'.repeat(50));
  console.log(`Total requested: ${stats.totalRequested}`);
  console.log(`Successful: ${stats.successful}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Duration: ${(stats.duration / 1000).toFixed(1)}s`);
  console.log(`Average time per pack: ${(stats.averageTimePerPack / 1000).toFixed(1)}s`);
  console.log(`Success rate: ${((stats.successful / stats.totalRequested) * 100).toFixed(1)}%`);
  console.log('═'.repeat(50));

  if (stats.failed > 0) {
    console.log('\n⚠️  Failed rounds:');
    stats.failedRounds.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  console.log(`\n💾 Content packs saved to: ${CONTENT_PACKS_DIR}`);
  console.log(`📋 Metadata saved to: ${path.join(CONTENT_PACKS_DIR, 'metadata.json')}\n`);

  // Cost estimation
  const estimatedCostPerPack = 0.10; // from cost-optimization-strategy.md
  const estimatedTotalCost = stats.successful * estimatedCostPerPack;
  const costPerGame = estimatedCostPerPack / 10; // assuming 10x reuse

  console.log('💰 Cost Estimation:');
  console.log('═'.repeat(50));
  console.log(`Estimated total cost: $${estimatedTotalCost.toFixed(2)}`);
  console.log(`Estimated cost per game (10x reuse): $${costPerGame.toFixed(4)}`);
  console.log(`Savings vs on-demand: ${((1 - costPerGame / estimatedCostPerPack) * 100).toFixed(0)}%`);
  console.log('═'.repeat(50));
  console.log('');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
