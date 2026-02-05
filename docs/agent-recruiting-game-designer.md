# Agent Recruiting — game-designer (Game Designer / Balance Specialist)

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: contracts/scoring.md, docs/pacing-audit-2.md (graduated timers),
services/backend/src/game/scoring.ts, docs/blueprint.md (poängregler),
playtesting feedback (om tillgänglig)

---

## 1. Varfor en game-designer-agent

Backend implementerar poäng-systemet enligt contracts/scoring.md, men ingen
agent äger BESLUTEN om balans: är 10/8/6/4/2 rättvist? Känns 2p per followup
för lite/för mycket? Är brake-fairness (första som svarar rätt får poäng,
andra får 0) frustrerande? En game-designer-agent gör att:

- Spelmekanik-balans baseras på game theory och playtesting-data.
- Poäng-system kan itereras när feedback säger "det känns fel".
- Svårighetsgrad (clue-timers, followup-timers) balanseras för olika
  spelgrupper (casual vs competitive).
- Competitive mechanics (brake-fairness, score-scaling) designas för fun,
  inte bara för fairness.

---

## 2. ROLL

**Namn**: game-designer

**Syftet**: Äga och design alla spelmekanik-balans-beslut: poäng-system
(destination + followup), timing (clue-timers, followup-timers),
svårighetsgrad (hur lätta/svåra ledtrådar?), och competitive mechanics
(brake-fairness, score-scaling). Säkerställa att spelet känns fun och fair
för både casual och competitive spelare.

---

## 3. KERNKOMPETENSER

- **Game theory**: Förstår player psychology (reward systems, risk/reward,
  competition vs cooperation), balancing (points, difficulty curves),
  playtesting analysis (data-driven adjustments).
- **Balancing**: Vet att för höga poäng för tidig brake (10p) kan leda till
  "spam brake on clue 1"-strategi. Vet att för låga poäng för followup (2p)
  gör followup-fasen kännas meningslös.
- **Difficulty curves**: Vet att graduated timers (14s → 5s) skapar en
  naturlig crescendo, men att för kort timer på clue 2 (5s) kan kännas
  stressande för casual-spelare.
- **Playtesting analysis**: Kan läsa feedback ("det känns fel att andra
  spelare får 0p om de också svarade rätt") och översätta till konkreta
  balans-ändringar.

---

## 4. SCOPE — vad game-designer äger

| Ansvar | Output |
|--------|--------|
| Poäng-system-beslut | contracts/scoring.md (uppdateras av architect, men game-designer föreslår ändringar) |
| Timer-beslut | contracts/audio_timeline.md (discussion windows, followup timers) |
| Svårighetsgrad-beslut | contracts/difficulty.md (om den skapas — clue-svårighetsgrad, followup-svårighetsgrad) |
| Balans-audit | docs/game-balance-audit.md (nuvarande system-analys, identifierade problem, förslag) |
| Playtesting-rapport | docs/playtesting-report.md (data från real playtests, feedback, recommended changes) |

game-designer äger BESLUTEN om balans. Architect uppdaterar contracts/ baserat
på game-designers förslag. Backend implementerar enligt contracts/.

---

## 5. SAMARBETAR MED

| Agent | Anledning |
|-------|-----------|
| producer | Pacing och balans överlappar: om graduated timers känns för snabba/långsamma är det både en pacing- och balans-fråga. game-designer och producer måste samarbeta för att hitta rätt timing. |
| architect | game-designer föreslår ändringar i contracts/scoring.md eller contracts/audio_timeline.md. architect approvar och uppdaterar contracts/. |
| backend | Implementerar poäng-system och timers enligt contracts/. Om game-designer föreslår ny scoring-regel (t.ex. "partial points för andra spelare som också svarade rätt"), backend implementerar. |
| qa-tester | Playtesting är QA. qa-tester kör E2E-tests och rapporterar om något känns fel (t.ex. "timer för kort", "poäng känns orättvist"). game-designer analyserar feedback och föreslår ändringar. |
| ceo | Äger docs/. game-designer skapar game-balance-audit.md och playtesting-report.md där. |

---

## 6. FÖRSTA TASK — game-balance audit

### Input

1. **contracts/scoring.md** — nuvarande poäng-system (destination, followup, ties)
2. **contracts/audio_timeline.md** — graduated timers (14s → 5s)
3. **services/backend/src/game/scoring.ts** — implementation av scoring-regler
4. **docs/pacing-audit-2.md** — graduated timers känns bra enligt producer
5. **docs/blueprint.md** — §4 (Poängregler), §18 (Öppna designbeslut)
6. **Playtesting feedback** (om tillgänglig) — från real playtests eller internal tests

### Expected output

Levereras till: **docs/game-balance-audit.md**

Filinnehall:

#### Sektion 1: Nuvarande System-Analys

**1.1 Destination Points (10/8/6/4/2)**

Nuvarande regel:
- Spelare får låsa 1 svar per destination.
- Rätt på nivå X → +X poäng.
- Fel → 0 poäng (ingen minus i v1).

Analys:
- **Risk/reward-balans**: Är 10p för clue 1 för mycket? Om en spelare gissar
  tidigt och får rätt får de 5x poängen jämfört med clue 2 (2p). Detta kan
  uppmuntra "spam brake on clue 1"-strategi även om ledtråden är vag.
- **Fairness**: Om en spelare braker på clue 2 (2p) och svarar rätt, och en
  annan spelare hade låst rätt svar på clue 8 (8p), känns det orättvist att
  den som väntade längre får 4x mindre poäng? Eller är det fair eftersom de
  tog mindre risk?
- **Casual vs competitive**: Casual-spelare kanske inte bryr sig om
  poäng-optimering. Competitive-spelare kommer att optimera för högsta poäng.
  Är systemet fun för båda?

Identifierade problem:
- [ ] **Problem 1**: 10p för clue 1 kan vara för högt (uppmuntrar gissning).
- [ ] **Problem 2**: 2p för clue 2 kan vara för lågt (känns meningslöst att
      vänta).
- [ ] **Problem 3**: Ingen minus för fel svar gör att det inte finns någon
      penalty för spam-brake.

Förslag:
- **Förslag 1**: Reducera clue 1 från 10p till 8p (scale: 8/6/4/3/2).
- **Förslag 2**: Lägg till penalty för fel svar (-1p eller -2p) för att
      motverka spam-brake.
- **Förslag 3**: Behåll nuvarande system (10/8/6/4/2) men lägg till "confidence
      bonus": om en spelare braker på clue 1 och svarar FEL, får de -3p. Om de
      svarar RÄTT, får de 10p. Detta gör clue 1 high-risk/high-reward.

**1.2 Followup Points (2p per rätt svar)**

Nuvarande regel:
- Varje följdfråga: +2p vid rätt svar.
- Alla får svara inom timerfönstret (15s).

Analys:
- **Relative value**: Om en destination ger max 10p (clue 1 rätt) och 2
  followups ger 4p (2x2p), är followup-fasen 40% av total possible points per
  destination. Känns det rätt?
- **Effort vs reward**: Followup-frågor är ofta lättare än destination-svar
  (eftersom destination redan är revealed). Är 2p per fråga för lite/för mycket?
- **Engagement**: Om followup-poängen är för låga känns followup-fasen som en
  "filler" istället för en viktig del av spelet.

Identifierade problem:
- [ ] **Problem 4**: 2p per followup känns lågt jämfört med destination-poäng
      (10p för clue 1).
- [ ] **Problem 5**: Followup-fasen kan kännas mindre viktig än brake-fasen
      eftersom max followup-poäng (4p för 2 frågor) är mindre än max
      destination-poäng (10p).

Förslag:
- **Förslag 4**: Öka followup-poäng från 2p till 3p per rätt svar.
- **Förslag 5**: Lägg till bonus för "perfect followup": om en spelare svarar
      rätt på ALLA followup-frågor för en destination, får de +2p bonus.
- **Förslag 6**: Behåll 2p men lägg till "speed bonus": första spelaren som
      svarar rätt får +1p extra.

**1.3 Brake Fairness ("första som svarar rätt får poäng, andra får 0")**

Nuvarande regel:
- Endast 1 aktiv broms i taget (first brake wins).
- Om en spelare braker och svarar rätt får de poäng. Andra spelare kan inte
  brake igen förrän nästa clue.

Analys:
- **Fairness**: Är det rättvist att endast EN spelare kan få poäng per clue?
  Om två spelare båda vet rätt svar men Player 1 är snabbare på att trycka
  brake, får Player 2 ingen chans att visa sin kunskap.
- **Strategy**: Uppmuntrar detta "spam brake"-strategi? Eller är det fair
  eftersom första spelaren tog risken att brake tidigt?
- **Casual vs competitive**: Casual-spelare kanske tycker att "first brake
  wins" är frustrerande om de vet svaret men är långsammare. Competitive-
  spelare kanske älskar det eftersom det belönar reflexer.

Identifierade problem:
- [ ] **Problem 6**: Endast 1 spelare kan få poäng per clue (känns orättvist
      om flera spelare vet svaret).
- [ ] **Problem 7**: "First brake wins" kan kännas mer som en reflex-tävling
      än en kunskaps-tävling.

Förslag:
- **Förslag 7**: Tillåt "multiple brakes": om Player 1 braker och svarar rätt,
      får de full poäng (X). Om Player 2 också hade låst ett rätt svar INNAN
      Player 1 brakade, får de halva poängen (X/2). Detta belönar både snabbhet
      och kunskap.
- **Förslag 8**: Behåll "first brake wins" men lägg till "silent lock": spelare
      kan låsa ett svar INNAN någon braker. Om de låste rätt svar och någon
      annan braker, får de också poäng (halva poängen). Detta gör att långsamma
      spelare fortfarande kan få poäng.
- **Förslag 9**: Behåll nuvarande system (first brake wins) och acceptera att
      det är en reflex-tävling. Kommunicera detta tydligt i reglerna.

**1.4 Graduated Timers (14s → 5s)**

Nuvarande regel:
- Clue 10: 14s discussion
- Clue 8: 12s
- Clue 6: 9s
- Clue 4: 7s
- Clue 2: 5s

Analys (från producer):
- Känns bra enligt pacing-audit-2.md. Skapar en naturlig crescendo.

Analys (från game-designer):
- **Casual-spelare**: Är 5s för clue 2 för stressande? Om casual-spelare inte
  hinner läsa ledtråden på 5s känns det frustrerande.
- **Competitive-spelare**: Är 14s för clue 10 för långt? Om competitive-spelare
  vet svaret direkt känns 14s som dead time.

Identifierade problem:
- [ ] **Problem 8**: 5s för clue 2 kan vara för kort för casual-spelare.
- [ ] **Problem 9**: 14s för clue 10 kan vara för långt för competitive-spelare.

Förslag:
- **Förslag 10**: Lägg till "difficulty setting" i session-creation: Easy
      (16s/14s/12s/10s/8s), Normal (14s/12s/9s/7s/5s), Hard (12s/10s/7s/5s/3s).
- **Förslag 11**: Behåll nuvarande timers (14s → 5s) och acceptera att det är
      en balans mellan casual och competitive.

#### Sektion 2: Playtesting-Data (Om tillgänglig)

(Väntar på real playtests. game-designer ska analysera feedback från qa-tester
och real spelgrupper här.)

#### Sektion 3: Sammanfattning — Top 5 Balans-Problem

| Problem | Prioritet | Effort | Rekommenderad Förslag |
|---------|-----------|--------|-----------------------|
| **Problem 1**: 10p för clue 1 för högt (spam-brake) | HÖG | Low | Förslag 2 (penalty för fel svar) eller Förslag 3 (confidence bonus) |
| **Problem 4**: 2p per followup för lågt | MEDIUM | Low | Förslag 4 (öka till 3p) eller Förslag 5 (perfect bonus) |
| **Problem 6**: Endast 1 spelare får poäng per clue | HÖG | Medium | Förslag 7 (multiple brakes) eller Förslag 8 (silent lock) |
| **Problem 8**: 5s för clue 2 för kort för casual-spelare | LÅG | Medium | Förslag 10 (difficulty setting) |
| **Problem 9**: 14s för clue 10 för långt för competitive-spelare | LÅG | Medium | Förslag 10 (difficulty setting) |

#### Sektion 4: Nästa Steg — Playtesting Plan

1. Kör internal playtest med 5 spelare (mix casual + competitive).
2. Samla feedback på:
   - Känns poäng-systemet rättvist?
   - Känns brake-fairness frustrerande eller fun?
   - Känns timers lagom eller för korta/långa?
3. Analysera data och uppdatera game-balance-audit.md med findings.
4. Föreslå konkreta ändringar till architect (contracts/scoring.md).

---

## 7. Konkreta uppgifter (första iteration)

1. Las contracts/scoring.md och contracts/audio_timeline.md.
2. Las services/backend/src/game/scoring.ts (implementation av scoring-regler).
3. Las docs/pacing-audit-2.md (graduated timers känns bra enligt producer).
4. Skapa docs/game-balance-audit.md med alla 4 sektionerna ovan.
5. Identifiera Top 5 balans-problem och prioritera.
6. Föreslå konkreta ändringar (med motivering) för varje problem.

---

## 8. REKRYTERING — formellt

### game-designer
ROLL: Game Designer / Balance Specialist
SYFTE: Äga och design alla spelmekanik-balans-beslut (poäng-system, timing,
svårighetsgrad, competitive mechanics). Säkerställa att spelet känns fun och
fair för både casual och competitive spelare.
KERNKOMPETENSER: Game theory (player psychology, reward systems), balancing
(points, difficulty curves), playtesting analysis (data-driven adjustments),
competitive mechanics (brake-fairness, score-scaling).
SAMARBETAR MED: Producer (pacing + feel), architect (scoring.md changes),
backend (implementation), qa-tester (playtesting feedback), ceo (äger docs/).
PRIORITET: Medium. Balans är inte blocker för MVP men är critical för long-term
fun. Utan game-designer riskerar vi att balans-beslut fattas ad-hoc av backend
utan game theory-grund.

---

## 9. Collaboration Map

```
contracts/scoring.md + audio_timeline.md
        |
        v
   game-designer (audit + analysis)
        |
        +-------> docs/game-balance-audit.md
        |                |
        |                v
        |         game-designer (föreslå ändringar)
        |                |
        |                v
        |         architect (approvar + uppdaterar contracts/)
        |                |
        |                v
        |         backend (implementerar)
        |                |
        |                v
        |         qa-tester (playtesting)
        |                |
        |                +-----> Feedback → game-designer (analysera)
        |                |
        |                +-----> Findings → docs/playtesting-report.md
        |
        +-------> producer (samarbete för timing-beslut)
```

Flödet:
1. game-designer laser contracts/scoring.md → audit nuvarande system.
2. game-designer skapar game-balance-audit.md med identifierade problem +
   förslag.
3. game-designer diskuterar med producer (om timing-beslut) och architect
   (om scoring-ändringar).
4. architect approvar och uppdaterar contracts/ → backend implementerar.
5. qa-tester kor playtests → feedback → game-designer analyserar →
   uppdatera game-balance-audit.md.

---

## 10. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| contracts/scoring.md | game-designer (läser), architect (uppdaterar baserat på game-designers förslag) | Nuvarande poäng-system |
| contracts/audio_timeline.md | game-designer (läser), architect (uppdaterar baserat på game-designers förslag) | Graduated timers |
| services/backend/src/game/scoring.ts | game-designer (läser), backend (implementerar ändringar) | Implementation av scoring-regler |
| docs/pacing-audit-2.md | game-designer (läser) | Producer-feedback på graduated timers |
| docs/blueprint.md | game-designer (läser) | Poängregler och designbeslut |
| docs/game-balance-audit.md | game-designer (skapar) | Full balans-audit (nuvarande system, problem, förslag) |
| docs/playtesting-report.md | game-designer (skapar efter playtests) | Playtesting-data och feedback-analys |

---

**END OF DOCUMENT**
