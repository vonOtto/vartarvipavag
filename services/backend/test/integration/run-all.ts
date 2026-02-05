#!/usr/bin/env node
/**
 * Main integration test runner
 * Runs all integration test suites
 */

import { runWebSocketTests } from './specs/websocket.test';
import { runGameFlowTests } from './specs/game-flow.test';
import { runStateMachineTests } from './specs/state-machine.test';
import { runBrakeFairnessTests } from './specs/brake-fairness.test';
import { runScoringTests } from './specs/scoring.test';

interface SuiteResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runSuite(name: string, fn: () => Promise<void>): Promise<SuiteResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running: ${name}`);
  console.log('='.repeat(70));

  try {
    await fn();
    return { name, passed: true };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: error.message || String(error),
    };
  }
}

async function main() {
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('   På Spåret - Backend Integration Test Suite');
  console.log('█'.repeat(70));

  const results: SuiteResult[] = [];

  // Run all test suites
  results.push(await runSuite('WebSocket Connection & Auth', runWebSocketTests));
  results.push(await runSuite('Game Flow', runGameFlowTests));
  results.push(await runSuite('State Machine Transitions', runStateMachineTests));
  results.push(await runSuite('Brake Fairness', runBrakeFairnessTests));
  results.push(await runSuite('Scoring', runScoringTests));

  // Print final summary
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('   FINAL SUMMARY');
  console.log('█'.repeat(70));

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  console.log(`\nTotal Suites: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed Suites:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.name}`);
      if (result.error) {
        console.log(`     ${result.error}`);
      }
    });
  }

  console.log('\n' + '█'.repeat(70));

  if (failed.length === 0) {
    console.log('   ✅ ALL INTEGRATION TESTS PASSED!');
    console.log('█'.repeat(70));
    console.log('\n');
    process.exit(0);
  } else {
    console.log(`   ❌ ${failed.length} SUITE(S) FAILED`);
    console.log('█'.repeat(70));
    console.log('\n');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (reason) => {
  console.error('\nUnhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\nUncaught exception:', error);
  process.exit(1);
});

main();
