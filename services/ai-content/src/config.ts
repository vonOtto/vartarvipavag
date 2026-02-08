/**
 * Configuration for AI Content Generation
 */

export const CONFIG = {
  // Anthropic API
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: 'claude-sonnet-4-5-20250929',

  // Content generation settings
  MAX_RETRIES: 3,
  TIMEOUT_MS: 60000, // 60 seconds per generation step

  // Anti-leak verification
  ANTI_LEAK_STRICT_MODE: false, // If true, reject rounds with potential leaks

  // Banned terms that should not appear in early clues
  BANNED_TERMS_IN_EARLY_CLUES: [
    'staden', 'city', 'huvudstad', 'capital', 'land', 'country'
  ],

  // Generation steps (for progress tracking)
  GENERATION_STEPS: {
    INIT: 1,
    GENERATE_DESTINATION: 2,
    GENERATE_CLUES: 3,
    GENERATE_FOLLOWUPS: 4,
    VERIFY_FACTS: 5,
    ANTI_LEAK_CHECK: 6,
    TTS_GENERATION: 7,
    COMPLETE: 8,
  },

  // Total steps for progress calculation
  TOTAL_STEPS: 8,
} as const;

export function validateConfig(): void {
  if (!CONFIG.ANTHROPIC_API_KEY) {
    console.warn('');
    console.warn('⚠️  ANTHROPIC_API_KEY is not set. AI generation will fail with 503 errors.');
    console.warn('   Get your key at: https://console.anthropic.com/');
    console.warn('   Add to .env: ANTHROPIC_API_KEY=sk-ant-api03-your-key-here');
    console.warn('');
    console.warn('   Workaround: Use pre-generated content packs (npm run generate-test-packs)');
    console.warn('');
  }
}
