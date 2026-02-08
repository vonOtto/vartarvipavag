/**
 * Claude API Client
 *
 * Wrapper around Anthropic SDK for content generation and verification.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config';
import { costTracker } from './metrics/cost-tracker';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    if (!CONFIG.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    client = new Anthropic({
      apiKey: CONFIG.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export type ClaudeModel = 'sonnet' | 'haiku';

export interface ClaudeOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Get the actual model ID for a given model type
 */
function getModelId(model: ClaudeModel): string {
  switch (model) {
    case 'sonnet':
      return CONFIG.ANTHROPIC_MODEL; // claude-sonnet-4-5-20250929
    case 'haiku':
      return 'claude-3-5-haiku-20241022';
    default:
      return CONFIG.ANTHROPIC_MODEL;
  }
}

/**
 * Call Claude API with retry logic and model selection
 *
 * Model selection guidelines:
 * - Use 'sonnet' (default) for creative tasks: content generation, clue writing, followup writing
 * - Use 'haiku' for simple tasks: fact verification, anti-leak checking, format validation
 *
 * Cost comparison (per 1M tokens):
 * - Sonnet: $3.00 input / $15.00 output
 * - Haiku: $1.00 input / $5.00 output
 */
export async function callClaude(
  prompt: string,
  options?: ClaudeOptions
): Promise<string> {
  const {
    model = 'sonnet',
    maxTokens = 4096,
    systemPrompt,
  } = options || {};

  const client = getClaudeClient();
  const modelId = getModelId(model);

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Track usage for cost analysis
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        costTracker.trackClaudeCall(model, inputTokens, outputTokens);

        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      if (attempt === CONFIG.MAX_RETRIES) {
        throw error;
      }
      // Exponential backoff: 2s, 4s, 8s
      await sleep(1000 * 2 ** attempt);
    }
  }

  throw new Error('Failed to call Claude API after retries');
}

/**
 * Parse JSON from Claude response, handling markdown code blocks
 */
export function parseClaudeJSON<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON from Claude: ${(error as Error).message}\n\nResponse:\n${response}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
