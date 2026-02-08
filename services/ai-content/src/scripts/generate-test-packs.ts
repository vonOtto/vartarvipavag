/**
 * Generate Test Packs
 *
 * Generates sample content packs and saves them to test-packs/ directory.
 * Run with: npm run generate-test-packs
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateRound } from '../generators/round-generator';
import { GenerationProgress } from '../types/content-pack';

async function main() {
  console.log('='.repeat(60));
  console.log('Generating Test Content Packs');
  console.log('='.repeat(60));
  console.log('');

  const testPacksDir = path.join(__dirname, '../../test-packs');
  fs.mkdirSync(testPacksDir, { recursive: true });

  const numPacks = 2;

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
      const filename = `pack-${i}-${contentPack.destination.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(testPacksDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(contentPack, null, 2), 'utf-8');

      console.log(`\n✓ Saved to: ${filepath}`);
      console.log(`  Destination: ${contentPack.destination.name}, ${contentPack.destination.country}`);
      console.log(`  Clues: ${contentPack.clues.length}`);
      console.log(`  Followups: ${contentPack.followups.length}`);
      console.log(`  Verified: ${contentPack.metadata.verified}`);
      console.log(`  Anti-leak: ${contentPack.metadata.antiLeakChecked}`);
    } catch (error) {
      console.error(`\n✗ Failed to generate pack ${i}:`, error);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Done!');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
