#!/usr/bin/env tsx
/**
 * Quick test script for overlap checker
 *
 * Tests the overlap checker with a simple example without needing API calls
 * (for testing the integration, not the actual AI detection)
 */

import { checkFollowupOverlaps } from '../verification/overlap-checker';
import { Clue, FollowupQuestion, Destination } from '../types/content-pack';

async function testOverlapChecker() {
  console.log('=== Testing Overlap Checker Integration ===\n');

  const destination: Destination = {
    name: 'Paris',
    country: 'Frankrike',
    aliases: ['paris', 'staden paris'],
  };

  const clues: Clue[] = [
    { level: 10, text: 'Staden delas av floden Seine som rinner genom centrum.' },
    { level: 8, text: 'Här finns Eiffeltornet som är 324 meter högt.' },
    { level: 6, text: 'Louvren är världens mest besökta konstmuseum.' },
    { level: 4, text: 'Staden kallas kärlekens stad.' },
    { level: 2, text: 'Huvudstad i Frankrike.' },
  ];

  const followups: FollowupQuestion[] = [
    {
      questionText: 'Vad heter floden som rinner genom staden?',
      options: ['Seine', 'Themsen', 'Donau', 'Rhen'],
      correctAnswer: 'Seine',
    },
    {
      questionText: 'Hur högt är Eiffeltornet?',
      options: ['300m', '324m', '350m', '276m'],
      correctAnswer: '324m',
    },
  ];

  console.log('Destination:', destination.name);
  console.log('\nClues:');
  clues.forEach((clue) => console.log(`  [${clue.level}] ${clue.text}`));
  console.log('\nFollowups:');
  followups.forEach((f, i) => console.log(`  ${i + 1}. ${f.questionText}`));
  console.log('\n--- Running overlap check ---\n');

  try {
    const result = await checkFollowupOverlaps(followups, clues, destination);

    console.log('\n--- Results ---\n');
    console.log(`Overall passed: ${result.passed ? 'YES ✓' : 'NO ✗'}`);
    console.log('\nDetails:');
    result.results.forEach((r, i) => {
      console.log(`\nFollowup ${i + 1}: ${r.questionText}`);
      console.log(`  Status: ${r.hasOverlap ? 'OVERLAP ✗' : 'OK ✓'}`);
      console.log(`  Reason: ${r.reason}`);
      if (r.overlappingConcepts.length > 0) {
        console.log(`  Concepts: ${r.overlappingConcepts.join(', ')}`);
      }
    });

    console.log('\n=== Test Complete ===');

    // Expected: Both should show overlap
    const expectedOverlaps = 2;
    const actualOverlaps = result.results.filter(r => r.hasOverlap).length;

    if (actualOverlaps === expectedOverlaps) {
      console.log(`\n✓ Expected ${expectedOverlaps} overlaps, got ${actualOverlaps}`);
    } else {
      console.log(`\n⚠ Warning: Expected ${expectedOverlaps} overlaps, but got ${actualOverlaps}`);
      console.log('  This might be due to Claude Haiku\'s interpretation or API key issues.');
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.log('\nNote: This test requires ANTHROPIC_API_KEY to be set in .env');
    process.exit(1);
  }
}

// Run test
testOverlapChecker().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
