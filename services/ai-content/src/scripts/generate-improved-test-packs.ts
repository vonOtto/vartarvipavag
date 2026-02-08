/**
 * Generate Improved Test Packs
 *
 * Generates sample content packs with the new improved clue generation system
 * and saves them to test-packs-improved/ directory.
 * Run with: tsx src/scripts/generate-improved-test-packs.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateRound } from '../generators/round-generator';
import { GenerationProgress } from '../types/content-pack';

async function main() {
  console.log('='.repeat(60));
  console.log('Generating IMPROVED Test Content Packs');
  console.log('Testing new clue generation with stricter anti-leak');
  console.log('='.repeat(60));
  console.log('');

  const testPacksDir = path.join(__dirname, '../../test-packs-improved');
  fs.mkdirSync(testPacksDir, { recursive: true });

  const numPacks = 3;

  const results = [];

  for (let i = 1; i <= numPacks; i++) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Generating Pack ${i}/${numPacks}`);
    console.log('─'.repeat(60));

    try {
      const contentPack = await generateRound((progress: GenerationProgress) => {
        console.log(
          `[${progress.currentStep}/${progress.totalSteps}] ${progress.stepName}${
            progress.destination ? ` (${progress.destination})` : ''
          }`
        );
      });

      // Save to file
      const filename = `improved-pack-${i}-${contentPack.destination.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(testPacksDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(contentPack, null, 2), 'utf-8');

      console.log(`\n✓ Saved to: ${filepath}`);
      console.log(`  Destination: ${contentPack.destination.name}, ${contentPack.destination.country}`);
      console.log(`  Clues: ${contentPack.clues.length}`);
      console.log(`  Followups: ${contentPack.followups.length}`);
      console.log(`  Verified: ${contentPack.metadata.verified}`);
      console.log(`  Anti-leak: ${contentPack.metadata.antiLeakChecked}`);

      // Show the clues for manual inspection
      console.log('\n  Generated Clues:');
      contentPack.clues.forEach((clue) => {
        console.log(`    [${clue.level}] ${clue.text}`);
      });

      results.push({
        pack: i,
        destination: `${contentPack.destination.name}, ${contentPack.destination.country}`,
        verified: contentPack.metadata.verified,
        antiLeakPassed: contentPack.metadata.antiLeakChecked,
        clues: contentPack.clues,
      });
    } catch (error) {
      console.error(`\n✗ Failed to generate pack ${i}:`, error);
      results.push({
        pack: i,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary of Generated Packs');
  console.log('='.repeat(60));

  results.forEach((result) => {
    if ('error' in result) {
      console.log(`\nPack ${result.pack}: ✗ FAILED`);
      console.log(`  Error: ${result.error}`);
    } else {
      console.log(`\nPack ${result.pack}: ✓ SUCCESS`);
      console.log(`  Destination: ${result.destination}`);
      console.log(`  Anti-leak: ${result.antiLeakPassed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`  Verified: ${result.verified ? '✓ YES' : '✗ NO'}`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('Done!');
  console.log(`Packs saved to: ${testPacksDir}`);
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
