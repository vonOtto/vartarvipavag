/**
 * CI test runner — executes the full pre-merge suite sequentially.
 * Stops on the first script that exits non-zero (fail-fast).
 *
 * Usage:  npx tsx scripts/run-ci-tests.ts
 *   or    npm run test:ci
 *
 * Pre-requisite: the backend must already be running on localhost:3000.
 */

import { execSync } from "child_process";
import path from "path";

const SCRIPTS_DIR = path.resolve(__dirname);

/** Ordered list of test scripts.  Each must exit 0 on success, non-zero on failure. */
const SUITE: readonly string[] = [
  "game-flow-test.ts",
  "brake-concurrency-test.ts",
  "reconnect-test.ts",
  "e2e-followups-test.ts",
];

const SEPARATOR = "─".repeat(60);

function log(msg: string) {
  console.log(msg);
}

function main() {
  log("");
  log("  På Spåret — CI test suite");
  log(`  ${SUITE.length} suites, fail-fast mode`);
  log(SEPARATOR);

  let index = 0;

  for (const script of SUITE) {
    index++;
    const fullPath = path.join(SCRIPTS_DIR, script);
    log("");
    log(`  [${index}/${SUITE.length}]  ${script}`);
    log(SEPARATOR);

    try {
      execSync(`npx tsx ${fullPath}`, {
        stdio: "inherit",   // forward stdout/stderr directly
        timeout: 120_000,   // 2 min hard cap per suite
      });
    } catch (err: unknown) {
      // execSync throws if child exits != 0
      const exitCode =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number | null }).status
          : null;

      log("");
      log(SEPARATOR);
      log(`  ❌ FAILED — ${script} exited with code ${exitCode ?? "unknown"}`);
      log(`  Aborting remaining suites (fail-fast).`);
      log(SEPARATOR);
      process.exit(exitCode ?? 1);
    }

    log("");
    log(`  ✅ ${script} — passed`);
  }

  log("");
  log(SEPARATOR);
  log(`  ✅ All ${SUITE.length} suites passed.`);
  log(SEPARATOR);
  log("");

  process.exit(0);
}

main();
