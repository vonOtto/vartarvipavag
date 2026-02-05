Game Balance Audit (Game Designer Context)

Du arbetar nu i Game Designer-rollen. Analysera spelbalans och användarupplevelse.

**Kontext:**
- Ansvarar för TASK-9xx (game balance & UX tasks)
- Äger scoring balance, timer tuning, difficulty progression
- Fokus på: fairness, engagement, competitive balance, fun factor

**Uppgift:**
1. Scoring Analysis (contracts/scoring.md):
   - Clue level points: 10/8/6/4/2 - är progressionen lagom?
   - Time bonus formula: Rättvis för snabba vs tänkande spelare?
   - Followup points: Belönar rätt beteende?
   - Brake advantage: För stor/liten fördel för första spelaren?
2. Timer Balance:
   - Clue reveal timing (contracts/timing.md)
   - Followup answer window - för kort/lång?
   - Brake window - tillräckligt för att läsa ledtråd?
   - Round transitions - bra pacing?
3. Difficulty Progression:
   - Är ledtrådar lagom svåra på varje nivå?
   - Followup-frågor: Rätt svårighetsgrad?
   - Balans mellan geografi/kultur/historia-frågor?
4. Fairness Analysis:
   - Brake fairness: Fungerar lock-mekanismen?
   - Network latency impact på brake timing
   - Reconnect impact på spelare som tappat anslutning
5. Playtest Scenarios (om möjligt):
   - Simulera 3-player game
   - Testa olika strategier (brake tidigt/sent)
   - Verifiera scoring känns fair
6. Dokumentera i docs/game-design/balance-audit-[DATE].md:
   - Scoring analysis med recommended changes
   - Timer tuning recommendations
   - Difficulty adjustments
   - Fairness improvements
   - Playtest findings

**Output:**
- Balance audit report
- Recommended tuning changes
- Updated contracts/ (if changes approved)
- Playtest scenarios

**Viktigt:**
- Följ contracts/scoring.md och contracts/timing.md
- Koordinera med architect för contract changes
- Testa recommendations med playtest scenarios
- Balansera fun vs competitive fairness
