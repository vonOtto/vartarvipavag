/**
 * Assertion helpers for integration tests
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Assert that a condition is true
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Assert that two values are equal
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg = message || `Expected ${expected}, got ${actual}`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertExists<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    const msg = message || `Expected value to exist, got ${value}`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that an array contains an element matching predicate
 */
export function assertContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
): void {
  if (!array.some(predicate)) {
    const msg = message || `Array does not contain expected element`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that an array has expected length
 */
export function assertLength(array: any[], expected: number, message?: string): void {
  if (array.length !== expected) {
    const msg = message || `Expected array length ${expected}, got ${array.length}`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that a value is in an array
 */
export function assertIncludes<T>(array: T[], value: T, message?: string): void {
  if (!array.includes(value)) {
    const msg = message || `Expected array to include ${value}`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that an object has a property with a specific value
 */
export function assertProperty(obj: any, key: string, expectedValue?: any, message?: string): void {
  if (!(key in obj)) {
    const msg = message || `Expected object to have property '${key}'`;
    throw new AssertionError(msg);
  }

  if (expectedValue !== undefined && obj[key] !== expectedValue) {
    const msg = message || `Expected property '${key}' to be ${expectedValue}, got ${obj[key]}`;
    throw new AssertionError(msg);
  }
}

/**
 * Assert that a function throws an error
 */
export async function assertThrows(
  fn: () => Promise<any> | any,
  message?: string
): Promise<Error> {
  try {
    await fn();
    throw new AssertionError(message || 'Expected function to throw');
  } catch (error) {
    if (error instanceof AssertionError) {
      throw error;
    }
    return error as Error;
  }
}

/**
 * Assert that a value matches a pattern (regex)
 */
export function assertMatches(value: string, pattern: RegExp, message?: string): void {
  if (!pattern.test(value)) {
    const msg = message || `Expected '${value}' to match ${pattern}`;
    throw new AssertionError(msg);
  }
}
