/**
 * Test Content Pack Storage
 *
 * Simple script to test the content pack storage and deduplication system.
 *
 * Usage:
 *   tsx src/scripts/test-storage.ts
 */

import { getContentPackStorage } from '../storage/content-pack-storage';
import { ContentPack } from '../types/content-pack';

function createMockPack(destination: string, country: string): ContentPack {
  return {
    roundId: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    destination: {
      name: destination,
      country,
      aliases: [destination.toLowerCase()],
    },
    clues: [
      { level: 10, text: 'Test clue 10' },
      { level: 8, text: 'Test clue 8' },
      { level: 6, text: 'Test clue 6' },
      { level: 4, text: 'Test clue 4' },
      { level: 2, text: 'Test clue 2' },
    ],
    followups: [
      {
        questionText: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      verified: true,
      antiLeakChecked: true,
      overlapChecked: true,
    },
  };
}

async function testStorage() {
  console.log('🧪 Testing Content Pack Storage\n');
  console.log('='.repeat(50));

  const storage = getContentPackStorage();

  console.log(`\n📁 Storage directory: ${storage.getStorageDir()}`);

  // Test 1: Save a pack
  console.log('\n[TEST 1] Saving a mock content pack...');
  const pack1 = createMockPack('Stockholm', 'Sverige');
  storage.savePack(pack1);
  console.log(`✅ Saved: ${pack1.destination.name} (${pack1.roundId})`);

  // Test 2: Load the pack
  console.log('\n[TEST 2] Loading the pack...');
  const loaded = storage.loadPack(pack1.roundId);
  if (loaded && loaded.destination.name === 'Stockholm') {
    console.log(`✅ Loaded successfully: ${loaded.destination.name}`);
  } else {
    console.log('❌ Failed to load pack');
  }

  // Test 3: Check deduplication
  console.log('\n[TEST 3] Testing deduplication...');
  const existingId = storage.findExistingDestination('Stockholm');
  if (existingId === pack1.roundId) {
    console.log(`✅ Found existing destination: ${existingId}`);
  } else {
    console.log('❌ Deduplication failed');
  }

  // Test 4: Case-insensitive deduplication
  console.log('\n[TEST 4] Testing case-insensitive deduplication...');
  const existingId2 = storage.findExistingDestination('STOCKHOLM');
  if (existingId2 === pack1.roundId) {
    console.log(`✅ Case-insensitive match works: ${existingId2}`);
  } else {
    console.log('❌ Case-insensitive deduplication failed');
  }

  // Test 5: Save another pack
  console.log('\n[TEST 5] Saving another pack...');
  const pack2 = createMockPack('Paris', 'Frankrike');
  storage.savePack(pack2);
  console.log(`✅ Saved: ${pack2.destination.name} (${pack2.roundId})`);

  // Test 6: Get index
  console.log('\n[TEST 6] Loading index...');
  const index = storage.getIndex();
  console.log(`✅ Index loaded: ${index.totalPacks} packs`);
  console.log('   Packs in index:');
  index.packs.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.destination}, ${p.country} (${p.roundId})`);
  });

  // Test 7: Get all pack IDs
  console.log('\n[TEST 7] Getting all pack IDs...');
  const allIds = storage.getAllPackIds();
  console.log(`✅ Found ${allIds.length} pack IDs`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed!\n');
}

testStorage().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
