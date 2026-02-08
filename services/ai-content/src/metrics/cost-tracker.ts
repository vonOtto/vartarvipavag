/**
 * Cost Tracker
 *
 * Tracks AI and TTS costs for content generation to enable cost optimization.
 */

import fs from 'node:fs';
import path from 'node:path';

const METRICS_DIR = process.env.METRICS_DIR || '/tmp/pa-sparet-metrics';

// Pricing (as of Jan 2025, per 1M tokens/chars)
const PRICING = {
  claude: {
    sonnet: {
      input: 3.0,  // $3.00 per 1M input tokens
      output: 15.0, // $15.00 per 1M output tokens
    },
    haiku: {
      input: 1.0,  // $1.00 per 1M input tokens
      output: 5.0, // $5.00 per 1M output tokens
    },
  },
  tts: {
    elevenlabs: 0.03, // $0.03 per 1000 characters
  },
} as const;

export interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface GenerationMetrics {
  roundId: string;
  timestamp: string;
  claudeApiCalls: number;
  claudeTotalTokens: number;
  ttsTotalChars: number;
  ttsCacheHits: number;
  ttsCacheMisses: number;
  estimatedCostUSD: number;
  modelBreakdown: {
    sonnet: ModelUsage;
    haiku: ModelUsage;
  };
  ttsCost: number;
}

class CostTracker {
  private currentMetrics: GenerationMetrics | null = null;

  /**
   * Start tracking a new round
   */
  startRound(roundId: string): void {
    this.currentMetrics = {
      roundId,
      timestamp: new Date().toISOString(),
      claudeApiCalls: 0,
      claudeTotalTokens: 0,
      ttsTotalChars: 0,
      ttsCacheHits: 0,
      ttsCacheMisses: 0,
      estimatedCostUSD: 0,
      modelBreakdown: {
        sonnet: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
        haiku: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      },
      ttsCost: 0,
    };
  }

  /**
   * Track a Claude API call
   */
  trackClaudeCall(
    model: 'sonnet' | 'haiku',
    inputTokens: number,
    outputTokens: number
  ): void {
    if (!this.currentMetrics) {
      console.warn('[cost-tracker] No active round, call startRound() first');
      return;
    }

    const pricing = PRICING.claude[model];
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    this.currentMetrics.claudeApiCalls++;
    this.currentMetrics.claudeTotalTokens += inputTokens + outputTokens;

    const breakdown = this.currentMetrics.modelBreakdown[model];
    breakdown.calls++;
    breakdown.inputTokens += inputTokens;
    breakdown.outputTokens += outputTokens;
    breakdown.cost += cost;

    this.recalculateTotalCost();
  }

  /**
   * Track a TTS generation
   */
  trackTTS(chars: number, fromCache: boolean): void {
    if (!this.currentMetrics) {
      console.warn('[cost-tracker] No active round, call startRound() first');
      return;
    }

    this.currentMetrics.ttsTotalChars += chars;

    if (fromCache) {
      this.currentMetrics.ttsCacheHits++;
    } else {
      this.currentMetrics.ttsCacheMisses++;
      // Only count cost for cache misses (actual API calls)
      const cost = (chars / 1000) * PRICING.tts.elevenlabs;
      this.currentMetrics.ttsCost += cost;
    }

    this.recalculateTotalCost();
  }

  /**
   * Recalculate total estimated cost
   */
  private recalculateTotalCost(): void {
    if (!this.currentMetrics) return;

    const claudeCost =
      this.currentMetrics.modelBreakdown.sonnet.cost +
      this.currentMetrics.modelBreakdown.haiku.cost;

    this.currentMetrics.estimatedCostUSD = claudeCost + this.currentMetrics.ttsCost;
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): GenerationMetrics | null {
    return this.currentMetrics ? { ...this.currentMetrics } : null;
  }

  /**
   * Save metrics to disk
   */
  saveMetrics(): void {
    if (!this.currentMetrics) {
      console.warn('[cost-tracker] No metrics to save');
      return;
    }

    try {
      fs.mkdirSync(METRICS_DIR, { recursive: true });

      const filename = `metrics-${this.currentMetrics.roundId}.json`;
      const filepath = path.join(METRICS_DIR, filename);

      fs.writeFileSync(filepath, JSON.stringify(this.currentMetrics, null, 2));

      console.log(`[cost-tracker] Metrics saved to ${filepath}`);
      console.log(`[cost-tracker] Total cost: $${this.currentMetrics.estimatedCostUSD.toFixed(4)}`);
    } catch (error) {
      console.error('[cost-tracker] Failed to save metrics:', error);
    }
  }

  /**
   * Load metrics for a specific round
   */
  static loadMetrics(roundId: string): GenerationMetrics | null {
    try {
      const filename = `metrics-${roundId}.json`;
      const filepath = path.join(METRICS_DIR, filename);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[cost-tracker] Failed to load metrics for ${roundId}:`, error);
      return null;
    }
  }

  /**
   * Get aggregated metrics for a date range
   */
  static getAggregatedMetrics(
    fromDate?: Date,
    toDate?: Date
  ): {
    totalRounds: number;
    totalCost: number;
    averageCostPerRound: number;
    claudeCalls: number;
    ttsCacheHitRate: number;
  } {
    try {
      if (!fs.existsSync(METRICS_DIR)) {
        return {
          totalRounds: 0,
          totalCost: 0,
          averageCostPerRound: 0,
          claudeCalls: 0,
          ttsCacheHitRate: 0,
        };
      }

      const files = fs.readdirSync(METRICS_DIR).filter((f) => f.startsWith('metrics-'));

      let totalRounds = 0;
      let totalCost = 0;
      let totalClaudeCalls = 0;
      let totalTTSHits = 0;
      let totalTTSMisses = 0;

      for (const file of files) {
        const filepath = path.join(METRICS_DIR, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        const metrics: GenerationMetrics = JSON.parse(content);

        // Filter by date range if provided
        if (fromDate && new Date(metrics.timestamp) < fromDate) continue;
        if (toDate && new Date(metrics.timestamp) > toDate) continue;

        totalRounds++;
        totalCost += metrics.estimatedCostUSD;
        totalClaudeCalls += metrics.claudeApiCalls;
        totalTTSHits += metrics.ttsCacheHits;
        totalTTSMisses += metrics.ttsCacheMisses;
      }

      const ttsCacheHitRate =
        totalTTSHits + totalTTSMisses > 0
          ? totalTTSHits / (totalTTSHits + totalTTSMisses)
          : 0;

      return {
        totalRounds,
        totalCost,
        averageCostPerRound: totalRounds > 0 ? totalCost / totalRounds : 0,
        claudeCalls: totalClaudeCalls,
        ttsCacheHitRate,
      };
    } catch (error) {
      console.error('[cost-tracker] Failed to get aggregated metrics:', error);
      return {
        totalRounds: 0,
        totalCost: 0,
        averageCostPerRound: 0,
        claudeCalls: 0,
        ttsCacheHitRate: 0,
      };
    }
  }
}

// Singleton instance
export const costTracker = new CostTracker();

// Export class for static methods
export { CostTracker };
