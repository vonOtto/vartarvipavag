Test Coverage Analysis (QA Context)

Du arbetar nu i QA-rollen. Analysera test coverage och identifiera test gaps.

**Kontext:**
- Deep dive i test coverage metrics
- Identifiera untested code paths
- Prioritera test improvements
- Fokus på: coverage percentage, critical paths, edge cases

**Uppgift:**
1. Kör coverage analysis:
   ```bash
   cd services/backend
   npm run test:integration  # or with coverage tool
   ```
2. Analysera coverage per fil/modul:
   - State machine coverage
   - WebSocket handlers coverage
   - API endpoints coverage
   - Scoring logic coverage
   - Brake fairness coverage
3. Identifiera critical untested paths:
   - Game flow critical paths (lobby → clue → reveal)
   - Error handling paths
   - Edge cases (reconnect, timeout, concurrent actions)
4. Prioritera test additions:
   - **P0 (Critical):** Core game flow, scoring, brake fairness
   - **P1 (High):** Error scenarios, edge cases
   - **P2 (Medium):** UI state updates, reconnect flows
   - **P3 (Low):** Nice-to-have scenarios
5. Dokumentera i docs/testing/coverage-analysis-[DATE].md:
   - Current coverage percentage per module
   - Critical gaps (P0/P1)
   - Recommended tests to add
   - Target coverage goals

**Output:**
- Coverage report med metrics
- Prioriterad lista av test gaps
- Test implementation plan
- Target coverage goals

**Viktigt:**
- Fokusera på critical paths först (game flow, scoring)
- Följ contracts/ för event/state validation
- Koordinera med backend agent för test implementation
- Dokumentera findings visuellt (tables, charts)
