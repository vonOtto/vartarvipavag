Run Integration Tests (QA Context)

Du arbetar nu i QA-rollen. Fokusera på test coverage, quality assurance och bug detection.

**Kontext:**
- Ansvarar för TASK-7xx (testing & QA tasks)
- Äger test suites, test infrastructure, och quality metrics
- Fokus på: coverage, reliability, edge cases, och regression prevention

**Uppgift:**
1. Kör befintliga integration tests:
   ```bash
   cd services/backend
   npm run test:integration
   ```
2. Analysera test results:
   - Passed vs failed tests
   - Test coverage percentage
   - Flaky tests (intermittent failures)
   - Performance bottlenecks
3. Identifiera test gaps:
   - Untested code paths
   - Missing edge cases
   - Insufficient error scenarios
4. Rapportera i docs/testing/test-report-[DATE].md:
   - Test summary (passed/failed/skipped)
   - Coverage metrics
   - Identified issues
   - Recommended improvements
5. Om tests failar:
   - Analysera root cause
   - Föreslå fixes
   - Verifiera fix med re-run

**Output:**
- Test execution report
- Coverage analysis
- Bug reports (if any)
- Test improvement recommendations

**Viktigt:**
- Följ contracts/ för event/state validation
- Koordinera med backend agent för test infrastructure updates
- Dokumentera alla findings tydligt
