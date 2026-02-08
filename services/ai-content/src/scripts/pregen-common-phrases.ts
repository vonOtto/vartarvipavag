/**
 * Pre-generate Common Phrases TTS
 *
 * Generates TTS audio for all common phrases and saves them to cache.
 * This is a one-time operation that dramatically reduces TTS costs.
 *
 * Usage: npm run pregen-phrases
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateOrFetch, CACHE_DIR, PUBLIC_URL } from '../tts-client';
import { getAllPhrases, getPhraseCount } from '../common-phrases';

// Default Swedish voice from ElevenLabs
const DEFAULT_VOICE_ID = process.env.DEFAULT_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Adam (multilingual)

interface PhraseManifest {
  generatedAt: string;
  voiceId: string;
  totalPhrases: number;
  phrases: Array<{
    phraseId: string;
    text: string;
    category: string;
    subcategory?: string;
    assetId: string;
    url: string;
    durationMs: number;
  }>;
}

async function main() {
  console.log('🎙️  Pre-generating common phrases TTS...\n');

  const phrases = getAllPhrases();
  const totalCount = getPhraseCount();

  console.log(`📊 Total phrases to generate: ${totalCount}`);
  console.log(`💾 Cache directory: ${CACHE_DIR}`);
  console.log(`🔊 Voice ID: ${DEFAULT_VOICE_ID}\n`);

  // Ensure cache directory exists
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const manifest: PhraseManifest = {
    generatedAt: new Date().toISOString(),
    voiceId: DEFAULT_VOICE_ID,
    totalPhrases: totalCount,
    phrases: [],
  };

  let generated = 0;
  let cached = 0;
  let failed = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const progress = `[${i + 1}/${totalCount}]`;

    try {
      // Check if already cached
      const beforeSize = fs.readdirSync(CACHE_DIR).length;

      const clip = await generateOrFetch(phrase.text, DEFAULT_VOICE_ID);

      const afterSize = fs.readdirSync(CACHE_DIR).length;
      const wasGenerated = afterSize > beforeSize;

      if (wasGenerated) {
        generated++;
        console.log(`${progress} ✅ Generated: "${phrase.text.slice(0, 50)}..."`);
      } else {
        cached++;
        console.log(`${progress} 💾 Cached: "${phrase.text.slice(0, 50)}..."`);
      }

      manifest.phrases.push({
        phraseId: phrase.id,
        text: phrase.text,
        category: phrase.category,
        subcategory: phrase.subcategory,
        assetId: clip.assetId,
        url: `${PUBLIC_URL}/audio/${clip.assetId}.${clip.ext}`,
        durationMs: clip.durationMs,
      });
    } catch (error) {
      failed++;
      console.error(
        `${progress} ❌ Failed: "${phrase.text.slice(0, 50)}..." - ${error}`
      );
    }

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === phrases.length - 1) {
      const percent = Math.round(((i + 1) / totalCount) * 100);
      console.log(`\n📈 Progress: ${percent}% (${i + 1}/${totalCount})\n`);
    }
  }

  // Save manifest
  const manifestPath = path.join(CACHE_DIR, 'common-phrases-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n✅ Pre-generation complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total phrases: ${totalCount}`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Cached: ${cached}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n💾 Manifest saved to: ${manifestPath}`);

  // Calculate estimated cost savings
  const avgCharsPerPhrase = 30;
  const costPerChar = 0.00003; // $0.03 per 1000 chars
  const estimatedCost = totalCount * avgCharsPerPhrase * costPerChar;

  console.log('\n💰 Cost Analysis:');
  console.log(`   Estimated one-time cost: $${estimatedCost.toFixed(4)}`);
  console.log(`   Cost per game (without cache): ~$0.057`);
  console.log(`   Cost per game (with cache): ~$0.006`);
  console.log(`   Savings per game: ~90%`);
  console.log(
    `   Break-even after: ${Math.ceil(estimatedCost / 0.051)} games\n`
  );
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
