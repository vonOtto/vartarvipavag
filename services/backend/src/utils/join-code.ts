/**
 * Join code generation utilities
 */

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

/**
 * Generates a random 6-character join code (A-Z, 0-9)
 */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}

/**
 * Validates a join code format
 */
export function isValidJoinCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) {
    return false;
  }
  return /^[A-Z0-9]+$/.test(code);
}
