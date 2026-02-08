/**
 * Show Cost Metrics
 *
 * Display aggregated cost metrics for content generation.
 *
 * Usage:
 *   npm run metrics
 *   npm run metrics -- --from 2025-01-01 --to 2025-01-31
 */

import { CostTracker } from '../metrics/cost-tracker';

function parseArgs(): { from?: Date; to?: Date } {
  const args = process.argv.slice(2);
  let from: Date | undefined;
  let to: Date | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      from = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--to' && args[i + 1]) {
      to = new Date(args[i + 1]);
      i++;
    }
  }

  return { from, to };
}

function main() {
  console.log('📊 Cost Metrics Dashboard');
  console.log('═'.repeat(60));

  const { from, to } = parseArgs();

  if (from || to) {
    console.log('Date range:');
    if (from) console.log(`  From: ${from.toISOString().split('T')[0]}`);
    if (to) console.log(`  To: ${to.toISOString().split('T')[0]}`);
    console.log('');
  }

  const metrics = CostTracker.getAggregatedMetrics(from, to);

  console.log('Summary:');
  console.log('─'.repeat(60));
  console.log(`  Total rounds: ${metrics.totalRounds}`);
  console.log(`  Total cost: $${metrics.totalCost.toFixed(2)}`);
  console.log(`  Average cost/round: $${metrics.averageCostPerRound.toFixed(4)}`);
  console.log(`  Claude API calls: ${metrics.claudeCalls}`);
  console.log(`  TTS cache hit rate: ${(metrics.ttsCacheHitRate * 100).toFixed(1)}%`);
  console.log('═'.repeat(60));

  if (metrics.totalRounds === 0) {
    console.log('\n⚠️  No metrics found. Generate some content first!\n');
    return;
  }

  // Cost projections
  console.log('\n💰 Cost Projections:');
  console.log('─'.repeat(60));

  const costPer100Games = metrics.averageCostPerRound * 100;
  const costPer1000Games = metrics.averageCostPerRound * 1000;

  console.log(`  Cost for 100 games: $${costPer100Games.toFixed(2)}`);
  console.log(`  Cost for 1,000 games: $${costPer1000Games.toFixed(2)}`);

  // Optimization impact
  const baselineCostPerRound = 0.10; // from cost-optimization-strategy.md
  const savingsPercent = ((1 - metrics.averageCostPerRound / baselineCostPerRound) * 100);

  console.log('\n📉 Optimization Impact:');
  console.log('─'.repeat(60));
  console.log(`  Baseline cost/round: $${baselineCostPerRound.toFixed(4)}`);
  console.log(`  Optimized cost/round: $${metrics.averageCostPerRound.toFixed(4)}`);
  console.log(`  Savings: ${savingsPercent.toFixed(1)}%`);

  // TTS cache efficiency
  if (metrics.ttsCacheHitRate > 0) {
    console.log('\n🎙️  TTS Cache Efficiency:');
    console.log('─'.repeat(60));
    console.log(`  Cache hit rate: ${(metrics.ttsCacheHitRate * 100).toFixed(1)}%`);

    if (metrics.ttsCacheHitRate >= 0.8) {
      console.log('  Status: ✅ Excellent cache performance!');
    } else if (metrics.ttsCacheHitRate >= 0.5) {
      console.log('  Status: ⚠️  Good, but could be better. Consider pre-generating more common phrases.');
    } else {
      console.log('  Status: ❌ Low cache hit rate. Run `npm run pregen-phrases` to improve.');
    }
  }

  console.log('\n═'.repeat(60));
  console.log('');
}

main();
