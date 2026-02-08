/**
 * Overlap Checker Tests
 *
 * These tests demonstrate the overlap checker functionality.
 * They require ANTHROPIC_API_KEY to be set in .env
 *
 * Run with: tsx src/verification/__tests__/overlap-checker.test.ts
 */

import { checkFollowupOverlap, checkFollowupOverlaps } from '../overlap-checker';
import { Clue, FollowupQuestion, Destination } from '../../types/content-pack';

// Test data
const parisDestination: Destination = {
  name: 'Paris',
  country: 'Frankrike',
  aliases: ['paris', 'staden paris'],
};

// Test case 1: OVERLAP - River name mentioned in clue
const cluesWithSeine: Clue[] = [
  { level: 10, text: 'Staden delas av floden Seine som rinner genom centrum.' },
  { level: 8, text: 'Här finns ett berömt torn byggt 1889.' },
];

const followupAboutSeine: FollowupQuestion = {
  questionText: 'Vad heter floden som rinner genom staden?',
  options: ['Seine', 'Themsen', 'Donau', 'Rhen'],
  correctAnswer: 'Seine',
};

// Test case 2: OK - River mentioned but not named
const cluesWithoutSeineName: Clue[] = [
  { level: 10, text: 'En stor flod delar staden i två delar.' },
  { level: 8, text: 'Här finns ett berömt torn byggt 1889.' },
];

// Test case 3: OVERLAP - Eiffel Tower height mentioned
const cluesWithEiffelHeight: Clue[] = [
  { level: 10, text: 'Staden har ett järntorn som är 324 meter högt.' },
  { level: 8, text: 'Staden är känd för sina konstmuseer.' },
];

const followupAboutEiffelHeight: FollowupQuestion = {
  questionText: 'Hur högt är Eiffeltornet?',
  options: ['300m', '324m', '350m', '276m'],
  correctAnswer: '324m',
};

// Test case 4: OK - Tower mentioned but height not specified
const cluesWithEiffelNoHeight: Clue[] = [
  { level: 10, text: 'Staden har ett berömt järntorn från 1889.' },
  { level: 8, text: 'Staden är känd för sina konstmuseer.' },
];

// Test case 5: OVERLAP - Louvre mentioned by name
const cluesWithLouvre: Clue[] = [
  { level: 10, text: 'Här finns Louvren, världens mest besökta konstmuseum.' },
  { level: 8, text: 'Staden ligger vid en stor flod.' },
];

const followupAboutLouvre: FollowupQuestion = {
  questionText: 'Vilket museum visar Mona Lisa?',
  options: ['Louvren', 'Orsay', 'Prado', 'Uffizi'],
  correctAnswer: 'Louvren',
};

// Test case 6: OK - Museum mentioned but not Louvre specifically
const cluesWithMuseumGeneric: Clue[] = [
  { level: 10, text: 'Staden har flera världsberömda konstmuseer.' },
  { level: 8, text: 'En flod delar staden i två delar.' },
];

async function runTests() {
  console.log('=== Overlap Checker Tests ===\n');

  // Test 1: Should detect overlap - Seine mentioned
  console.log('Test 1: OVERLAP expected - Seine mentioned in clue');
  const result1 = await checkFollowupOverlap(followupAboutSeine, cluesWithSeine, parisDestination);
  console.log(`  Result: ${result1.hasOverlap ? 'OVERLAP ✓' : 'OK ✗ (should be overlap!)'}`);
  console.log(`  Reason: ${result1.reason}`);
  console.log(`  Concepts: ${result1.overlappingConcepts.join(', ')}\n`);

  // Test 2: Should NOT detect overlap - river mentioned but not named
  console.log('Test 2: OK expected - river mentioned but not named');
  const result2 = await checkFollowupOverlap(followupAboutSeine, cluesWithoutSeineName, parisDestination);
  console.log(`  Result: ${result2.hasOverlap ? 'OVERLAP ✗ (should be OK!)' : 'OK ✓'}`);
  console.log(`  Reason: ${result2.reason}\n`);

  // Test 3: Should detect overlap - Eiffel Tower height mentioned
  console.log('Test 3: OVERLAP expected - Eiffel Tower height mentioned');
  const result3 = await checkFollowupOverlap(
    followupAboutEiffelHeight,
    cluesWithEiffelHeight,
    parisDestination
  );
  console.log(`  Result: ${result3.hasOverlap ? 'OVERLAP ✓' : 'OK ✗ (should be overlap!)'}`);
  console.log(`  Reason: ${result3.reason}`);
  console.log(`  Concepts: ${result3.overlappingConcepts.join(', ')}\n`);

  // Test 4: Should NOT detect overlap - tower mentioned but not height
  console.log('Test 4: OK expected - tower mentioned but height not specified');
  const result4 = await checkFollowupOverlap(
    followupAboutEiffelHeight,
    cluesWithEiffelNoHeight,
    parisDestination
  );
  console.log(`  Result: ${result4.hasOverlap ? 'OVERLAP ✗ (should be OK!)' : 'OK ✓'}`);
  console.log(`  Reason: ${result4.reason}\n`);

  // Test 5: Should detect overlap - Louvre mentioned
  console.log('Test 5: OVERLAP expected - Louvre mentioned by name');
  const result5 = await checkFollowupOverlap(followupAboutLouvre, cluesWithLouvre, parisDestination);
  console.log(`  Result: ${result5.hasOverlap ? 'OVERLAP ✓' : 'OK ✗ (should be overlap!)'}`);
  console.log(`  Reason: ${result5.reason}`);
  console.log(`  Concepts: ${result5.overlappingConcepts.join(', ')}\n`);

  // Test 6: Should NOT detect overlap - museum mentioned generically
  console.log('Test 6: OK expected - museum mentioned but not Louvre specifically');
  const result6 = await checkFollowupOverlap(
    followupAboutLouvre,
    cluesWithMuseumGeneric,
    parisDestination
  );
  console.log(`  Result: ${result6.hasOverlap ? 'OVERLAP ✗ (should be OK!)' : 'OK ✓'}`);
  console.log(`  Reason: ${result6.reason}\n`);

  // Test 7: Batch check with multiple followups
  console.log('Test 7: Batch check - mixed results expected');
  const mixedFollowups = [followupAboutSeine, followupAboutEiffelHeight];
  const result7 = await checkFollowupOverlaps(mixedFollowups, cluesWithSeine, parisDestination);
  console.log(`  Overall passed: ${result7.passed ? 'YES' : 'NO'}`);
  result7.results.forEach((r, i) => {
    console.log(`  Followup ${i + 1}: ${r.hasOverlap ? 'OVERLAP' : 'OK'} - ${r.reason}`);
  });

  console.log('\n=== Tests Complete ===');
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}
