/**
 * Test runner framework for integration tests
 */

import { AssertionError } from './assertions';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export interface TestSuite {
  name: string;
  tests: Test[];
}

export interface Test {
  name: string;
  fn: () => Promise<void>;
  skip?: boolean;
}

export class TestRunner {
  private results: TestResult[] = [];
  private currentSuite: string = '';

  /**
   * Run a test suite
   */
  async runSuite(suite: TestSuite): Promise<void> {
    this.currentSuite = suite.name;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Suite: ${suite.name}`);
    console.log('='.repeat(60));

    for (const test of suite.tests) {
      if (test.skip) {
        console.log(`⊘ SKIP: ${test.name}`);
        continue;
      }

      await this.runTest(test);
    }
  }

  /**
   * Run a single test
   */
  private async runTest(test: Test): Promise<void> {
    const startTime = Date.now();

    try {
      await test.fn();
      const duration = Date.now() - startTime;

      this.results.push({
        name: test.name,
        passed: true,
        duration,
      });

      console.log(`✅ PASS: ${test.name} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof AssertionError
        ? error.message
        : `${error.message}\n${error.stack}`;

      this.results.push({
        name: test.name,
        passed: false,
        error: errorMessage,
        duration,
      });

      console.log(`❌ FAIL: ${test.name} (${duration}ms)`);
      console.log(`   ${errorMessage}`);
    }
  }

  /**
   * Print summary and exit
   */
  printSummary(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Test Summary');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed);
    const failed = this.results.filter(r => !r.passed);

    console.log(`\nTotal:  ${this.results.length} tests`);
    console.log(`Passed: ${passed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\nFailed tests:');
      failed.forEach(result => {
        console.log(`  ❌ ${result.name}`);
        if (result.error) {
          console.log(`     ${result.error}`);
        }
      });
    }

    console.log('='.repeat(60));

    if (failed.length === 0) {
      console.log('\n✅ All tests passed!\n');
    } else {
      console.log(`\n❌ ${failed.length} test(s) failed\n`);
    }
  }

  /**
   * Get results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    return this.results.every(r => r.passed);
  }

  /**
   * Exit with appropriate code
   */
  exit(): void {
    process.exit(this.allPassed() ? 0 : 1);
  }
}

/**
 * Helper to create a test suite
 */
export function suite(name: string, tests: Test[]): TestSuite {
  return { name, tests };
}

/**
 * Helper to create a test
 */
export function test(name: string, fn: () => Promise<void>): Test {
  return { name, fn };
}

/**
 * Helper to create a skipped test
 */
export function skip(name: string, fn: () => Promise<void>): Test {
  return { name, fn, skip: true };
}
