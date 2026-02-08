# Game Design Review - Tripto (På Spåret Party Edition)

**Review Date**: 2026-02-08
**Status**: Sprint 2 Complete (Multi-destination system deployed)
**Reviewer**: CEO Agent
**Version**: 1.0

---

## Executive Summary

Tripto har en solid teknisk foundation med robust multi-destination support, server-auktoritativ state machine och välimplementerad audio system. Spelet fungerar tekniskt bra, men flera aspekter av **spelarupplevelsen** och **party game-dynamiken** behöver justeras för att maximera engagemang och "couch fun".

**Nuvarande styrkor**:
- Tekniskt robust architecture (reconnect, fairness, sync)
- Multi-destination system ger variation
- Audio system med TTS och music ducking fungerar väl
- Pro-vy för värd ger bra kontroll

**Kritiska förbättringsområden**:
- Långsamma väntetider mellan phases (ingen timer på ledtrådar = kan bli tråkigt)
- Spelarna ser för lite feedback under spelet (ingen visibility av andra spelares aktivitet)
- Onboarding är för teknisk (manuell kod-input på tvOS)
- Balansering behövs (10p för första ledtråd känns lågrisk om ingen tidsgräns finns)

**Rekommenderad prioritet**: Fokusera på timing/pacing (Critical), player feedback (High), sedan polish.

---

## Critical Issues (Must Fix)

### 1. CLUE_LEVEL har ingen timer - Spelet kan stanna upp

**Problem**:
- Nuvarande: Ingen timer på ledtrådar, spelet väntar tills alla svarat eller värd skippar
- Resultat: Om en spelare är osäker kan alla andra sitta och vänta i 30+ sekunder
- Party game-killer: Downtime = tråkighet

**Impact**: Hög - förstör tempot, särskilt med 5+ spelare

**Solution**:
```markdown
Implementera graduated timers per ledtråd:
- Ledtråd 1 (10p): 14 sekunder
- Ledtråd 2 (8p): 12 sekunder
- Ledtråd 3 (6p): 10 sekunder
- Ledtråd 4 (4p): 8 sekunder
- Ledtråd 5 (2p): 5 sekunder

Totalt: Max 49 sekunder per destination (+ followups)
Auto-advance när timer går ut eller alla svarat.
```

**Rationale**:
- Graduated timers skapar urgency och belönar snabba gissningar
- Kortare tid på senare ledtrådar = högre energi mot slutet
- Förhindrar "analysis paralysis"

**Implementation**:
- Backend: Lägg till `clueLevelTimer` i state machine (contracts/audio_timeline.md redan stöder timers)
- tvOS: Visa countdown visuellt (ring runt poäng?)
- Web: Visa timer badge

**Priority**: Critical (Sprint 3.1)

---

### 2. Spelare ser för lite av vad andra gör under CLUE_LEVEL

**Problem**:
- Spelare vet inte om andra redan svarat
- Ingen feedback när någon låser svar (förutom locked count)
- Svårt att känna "tävlingen"

**Impact**: Medium-High - minskar engagemang, "vad händer egentligen?"

**Solution**:
```markdown
Lägg till live activity indicators:
- "3 / 5 spelare har svarat" badge (web + tvOS)
- Animation på tvOS när någon låser svar (subtle pulse)
- Web: Visa antal låsta + timer i samma vy som ledtråd
```

**Alternative (mer aggressiv)**:
- Visa spelarnamn när de låser: "Anna svarade på 8p!"
- Risk: Kan kännas invasivt, test först

**Implementation**:
- Backend: Broadcast `ANSWER_LOCKED_COUNT` event (eller inkludera i STATE_SNAPSHOT)
- tvOS: Animated badge i nedre vänstra hörnet
- Web: Header badge ovanför clue text

**Priority**: High (Sprint 3.2)

---

### 3. Onboarding är för teknisk - tvOS manual kod-input är klumpig

**Problem**:
- tvOS kräver manuell kod-input med Apple TV-remote (svårt att skriva)
- QR-kod på TV → web funkar bra, men tvOS connection känns "tacked on"
- Ingen "How to play"-guide för första gången

**Impact**: Medium - sänker första intrycket, höjer friction

**Solution (kort sikt)**:
```markdown
1. tvOS: Auto-connect via Bonjour/mDNS
   - Hitta sessioner på samma nätverk automatiskt
   - Fallback: Visa kod-input om auto-connect misslyckas

2. Lobby: Lägg till "Hur spelar man?"-knapp (modal)
   - 4-5 bullet points om spelregler
   - Visa vid första sessionen (localStorage flag)
```

**Solution (lång sikt)**:
```markdown
3. iOS Host → tvOS casting
   - Använd AirPlay/tvOS companion API
   - Host app "castar" session till TV direkt
   - Eliminerar manuell kod helt
```

**Implementation**:
- Short-term: Bonjour discovery (tvos-agent, 1-2 dagar)
- Long-term: Casting integration (ios-host + tvos-agent, 1 vecka)
- Guide modal: web-agent (2 timmar)

**Priority**: High (Sprint 3.3 - Bonjour först, casting senare)

---

## High-Priority Improvements (Should Have)

### 4. ROUND_INTRO känns onödig - direktstart till CLUE_LEVEL är bättre

**Current State**:
- ROUND_INTRO spelar intro-banter (3-5 sekunder) + 1.5s breathing window
- Totalt: ~6 sekunder väntetid innan första ledtråd

**Issues**:
- Spelarna vill starta direkt, inte vänta på intro varje gång
- Banter är trevlig första destinationen, men repetitiv vid 3-5 destinationer
- 6 sekunder väntetid × 3 destinations = 18 sekunder "dead air"

**Recommendations**:
```markdown
Option A: Gör ROUND_INTRO optional (endast första destination)
- Destination 1: Spela intro-banter
- Destination 2-5: Skippa intro, gå direkt till CLUE_LEVEL

Option B: Kortare intro för destination 2+
- Destination 1: Full intro (5s)
- Destination 2+: Kort sting (1.5s) + direkt till ledtråd

Option C: Parallellisera intro + första ledtråd
- Spela intro-banter samtidigt som första ledtråden visas
- Text syns direkt, audio läggs över
```

**Recommendation**: Option A (enklast + bäst pacing)

**Implementation**:
- Backend: Lägg till `isFirstDestination` flag, skippa ROUND_INTRO om false
- Contracts: Inget behövs (already optional phase)

**Priority**: High (Sprint 3.2)

---

### 5. SCOREBOARD auto-advance saknas - värd måste klicka varje gång

**Current State**:
- Efter SCOREBOARD: Värd klickar "Nästa destination" manuellt
- Inget auto-advance alternativ

**Issues**:
- Värd måste hålla koll på iPhone varje SCOREBOARD
- Känns "mindre TV-show" (borde flyta automatiskt)
- Risk att glömma starta = lång paus

**Recommendations**:
```markdown
Option A: Auto-advance efter X sekunder (med cancel-knapp)
- Standard: 5 sekunder countdown innan nästa destination
- Host kan cancela och stanna på SCOREBOARD längre
- UI: "Nästa destination om 5... 4... 3..." + "Avbryt"-knapp

Option B: Hybrid approach
- Första scoreboard: Auto-advance (5s)
- Sista scoreboard (FINAL_RESULTS): Ingen auto-advance

Option C: Settings toggle (värd väljer i lobby)
- "Auto-advance scoreboard: ON/OFF"
```

**Recommendation**: Option A (bäst balans mellan automation och kontroll)

**Implementation**:
- Backend: Auto-timer i state machine (SCOREBOARD → NEXT_DESTINATION efter 5s)
- iOS Host: Cancel-knapp som skickar HOST_PAUSE
- tvOS: Countdown badge i nedre högra hörnet

**Priority**: High (Sprint 3.3)

---

### 6. Poängsystem känns lågrisk - 10p för första ledtråd är "free"

**Current State**:
- 10/8/6/4/2 poäng distribution
- Ingen penalty för fel svar
- Ingen timer = kan vänta på lättare ledtrådar utan risk

**Issues**:
- Optimal strategi: Vänta tills ledtråd 3-4 (lättare) istället för chansa på ledtråd 1
- 10p känns "för mycket" om ledtråden är lätt
- Ingen incentive att svara tidigt om man är osäker

**Recommendations**:
```markdown
Option A: Lägg till timer-bonus (endast om timer implementeras)
- Svara på första halvan av timer: +2p bonus
- Exempel: Ledtråd 1 (10p) + snabb = 12p
- Belönar snabbhet utan att straffa

Option B: Justera poäng-kurvan (mer exponentiell)
- 15 / 10 / 6 / 3 / 1 (högre risk/reward på tidiga ledtrådar)
- Gör det värt att chansa tidigt

Option C: Penalty för fel svar (mild)
- Fel svar: -2p (inte -10, för hårt)
- Ger weight till beslut, men inte game-breaking

Option D: "Double or nothing" power-up (advanced)
- Spelare väljer att dubbla poäng INNAN svar
- Risk: Fel = 0p, Rätt = 2× poäng
```

**Recommendation**: Option A (timer-bonus) + Option B (justera kurva) kombinerat

**Implementation**:
- Backend: Uppdatera scoring.ts med timer-bonus logic
- Contracts: Uppdatera scoring.md
- Architect approval behövs (contracts change)

**Priority**: High (Sprint 3.4 - efter timer implementation)

---

### 7. Följdfrågor känns platta - 2p samma för alla svar

**Current State**:
- Alla följdfrågor: 2p per rätt svar
- 20s timer (samma för alla)
- Multiple choice (4 alternativ)

**Issues**:
- Ingen variation i svårighetsgrad = monotont
- 2p är lågt jämfört med destination-poäng (10p max)
- Svåra frågor känns inte värda det

**Recommendations**:
```markdown
Option A: Difficulty-based poäng
- Easy (trivia): 1p
- Medium (requires thought): 2p (default)
- Hard (obscure fact): 3p

Option B: Timer-scaling poäng
- Svara på första 10s: 3p
- Svara på sista 10s: 1p
- Belönar snabbhet dynamiskt

Option C: Question type variation
- Multiple choice (4 options): 2p
- True/False: 1p (lättare)
- Open text: 3p (svårare att matcha rätt)
```

**Recommendation**: Option A (enklast) eller Option C (mest variation)

**Implementation**:
- Backend: Lägg till `difficulty` field i followup question
- AI-content: Tag questions som easy/medium/hard vid generation
- Contracts: Uppdatera followup scoring i scoring.md

**Priority**: Medium (Sprint 4)

---

### 8. Brake-mekaniken är oklar för nya spelare - behöver onboarding

**Current State**:
- Brake-knapp syns, men ingen förklaring av när/varför man ska använda den
- "First brake wins" är inte intuitivt
- 10s exclusive + 5s för alla är inte synligt

**Issues**:
- Nya spelare trycker brake för tidigt eller för sent
- Oklart vad som händer när någon annan brakat

**Recommendations**:
```markdown
1. Lobby: Lägg till "Brake-tips" i "Hur spelar man?"-guide
   - "Tryck brake när du vet svaret!"
   - "Första spelare får 10s exklusiv tid, sedan 5s för alla"

2. Första gången brake används: Show tooltip (en gång per spelare)
   - "Bra jobbat! Du fick exklusiv tid att svara."
   - localStorage flag: "brakeTooltipShown"

3. tvOS: Visa brake-timer visuellt
   - "Annas exklusiva tid: 8s kvar"
   - Sedan: "Alla kan svara: 3s kvar"
```

**Implementation**:
- Web: Tooltip modal (localStorage flag)
- tvOS: Timer badge under brake-meddelande
- Guide modal: Lägg till brake-sektion

**Priority**: Medium (Sprint 4)

---

### 9. tvOS display har för lite "energy" - känns statiskt

**Current State**:
- Text-only på de flesta screens (LobbyView, ClueView, RevealView)
- Inga animationer förutom confetti vid FINAL_RESULTS
- Typografi är läsbar men "boring"

**Issues**:
- Känns inte som en "TV-show" (mer som en presentation)
- Scoreboard är en lista (ingen drama)
- Reveal är "bara text" (ingen buildup)

**Recommendations**:
```markdown
1. Animationer:
   - Clue reveal: Fade in + slight scale animation
   - Locked answer: Pulse effect när någon låser
   - Scoreboard: Animate podium ranks (1st/2nd/3rd highlight)

2. Visual effects (beyond confetti):
   - Rätt svar reveal: Green flash effect
   - Timer urgency: Red pulse när <5s kvar
   - Brake pull: Screen shake + sfx

3. Background visuals:
   - Lobby: Subtle animated gradient (travel theme)
   - CLUE_LEVEL: Map/globe visual (rotate slowly)
   - FOLLOWUP: Quiz show spotlight effect

4. Typography/color:
   - Större poäng-siffror (more prominent)
   - Color-coded phases (blue=clue, orange=followup, green=reveal)
```

**Recommendation**: Start med #1 (animationer), sedan #3 (backgrounds)

**Implementation**:
- tvOS: SwiftUI animations (withAnimation, .transition)
- Visual assets: Lägg till i assets/ (gradient images, map textures)
- Effort: 2-3 dagar

**Priority**: Medium (Sprint 4)

---

### 10. Web player har för lite att göra mellan svar - "vänta och se"

**Current State**:
- Efter submit: "Ditt svar är låst" → vänta
- Ingen interaktion under väntetid
- Locked count är enda feedback

**Issues**:
- Spelarna tittar på telefonen och ser ingenting händer
- Känns disconnected från spelet (borde kolla på TV istället)

**Recommendations**:
```markdown
Option A: Distraction-free mode
- Efter submit: Hide phone UI, visa "Titta på TV:n!" message
- Gör telefonen till en "remote" (ingen info)
- Tvingar spelare att engagera med storbild

Option B: Live scoreboard preview
- Visa current standings medan väntar
- Update när någon låser svar

Option C: Mini-game under väntetid (advanced)
- Guess how many will answer correctly
- Predict winner
- Bonus points for correct predictions?

Option D: Reactions/emojis (social)
- Spelare skickar reactions under väntetid
- "🔥" för hett svar, "😅" för svår ledtråd
- Visas på tvOS som floating emojis
```

**Recommendation**: Option A (enklast + bäst focus) + Option D (social layer)

**Implementation**:
- Web: "Titta på TV"-screen efter submit (1 timme)
- Reactions: Backend event + tvOS overlay (2 dagar)

**Priority**: Medium (Sprint 5)

---

## Nice-to-Have Enhancements (Could Have)

### 11. Achievements/badges skulle öka replay value

**Idea**:
- "Broms-mästare" (3 brake pulls i en session)
- "Perfekt runda" (rätt på alla ledtrådar + followups)
- "Comeback kid" (vinna från 3rd place)
- "Speedster" (svara på <5s varje gång)

**Benefit**: Ger långsiktig motivation, "one more game"-feel

**Implementation**: Backend tracking + FINAL_RESULTS display (3 dagar)

**Priority**: Low (Sprint 6+)

---

### 12. Team mode skulle öka social dynamik

**Idea**:
- 2-4 lag istället för individuella spelare
- Laget delar poäng, diskuterar svar tillsammans
- Brake = lagbeslut (måste enas)

**Benefit**: Bättre för större grupper (8+ personer)

**Implementation**: Major backend refactor (state machine, scoring) - 1-2 veckor

**Priority**: Low (post-MVP)

---

### 13. Custom content packs (user-generated)

**Idea**:
- Host kan skapa egna destinationer/ledtrådar via iOS app
- Upload JSON eller via form
- Dela med andra användare

**Benefit**: Infinite content, community-driven

**Implementation**: Backend upload API + iOS content editor (1 vecka)

**Priority**: Low (post-MVP)

---

### 14. Difficulty settings i lobby

**Idea**:
- Easy: 3 ledtrådar (10/6/2), enklare followups
- Normal: 5 ledtrådar (10/8/6/4/2), default
- Hard: 5 ledtrådar, svårare AI-frågor, kortare timers

**Benefit**: Anpassning för olika målgrupper (familj vs trivia nerds)

**Implementation**: AI-content difficulty tuning + lobby UI (2 dagar)

**Priority**: Medium (Sprint 5)

---

### 15. Reconnect UX kunde vara smidigare

**Current State**: STATE_SNAPSHOT fungerar tekniskt, men ingen feedback till spelare

**Idea**:
- "Välkommen tillbaka!"-toast när reconnect lyckas
- Visa "Du missade X ledtrådar" om game är igång
- Auto-scroll till nuvarande phase

**Implementation**: Web reconnect handler + localStorage sync (1 dag)

**Priority**: Low (Sprint 6)

---

## Detailed Analysis

### 1. Anslutningsflöde (Onboarding)

**Current State**:
- Värd: iOS app auto-skapar session → genererar 3 AI destinations (~40s) → visar QR-kod
- tvOS: Manual kod-input (Apple TV remote typing)
- Spelare: QR-scan → localhost:5173 → matar in kod → lobby

**Issues**:
1. **AI generation tar 40s** - OK för host, men känns långt
2. **tvOS manual kod-input är klumpig** - Apple TV remote är svår att skriva med
3. **Ingen onboarding guide** - nya spelare kastar in i lobby utan instruktioner
4. **QR-kod är statisk** - pekar på localhost:5173, inte dynamisk join-URL

**Recommendations**:
1. **AI generation**:
   - Visa progress indicator med steg ("Genererar destination 1/3...")
   - 40s är acceptabelt om progress är tydlig
   - Alternative: Pre-generate common content packs (Europa, Asien) för instant start

2. **tvOS connection**:
   - Implementera Bonjour/mDNS auto-discovery (scan nätverk för sessions)
   - Fallback till kod-input om auto-connect misslyckas
   - Long-term: iOS → tvOS casting (AirPlay/companion API)

3. **Onboarding**:
   - Lägg till "Hur spelar man?"-knapp i lobby (modal med 5 bullets)
   - Visa första gången användaren joinar (localStorage flag)
   - Include brake-explanation, timer-tips

4. **QR-kod**:
   - Dynamisk URL: `https://tripto.app/join/{sessionId}?t={joinToken}`
   - När deployed (inte localhost)

**Priority**: High (tvOS connection), Medium (guide), Low (QR-URL)

---

### 2. Spelflöde (Game Flow)

**Current State**:
```
LOBBY → PREPARING_ROUND → ROUND_INTRO (5s) →
CLUE_LEVEL (10p, no timer) → CLUE_LEVEL (8p) → ... →
REVEAL_DESTINATION (10s) → FOLLOWUP_QUESTION (20s × 2-3) →
SCOREBOARD (manual advance) → NEXT_DESTINATION (3s) → repeat
```

**Issues**:
1. **CLUE_LEVEL har ingen timer** = kan ta evighet om spelare är osäker
2. **ROUND_INTRO känns onödig** efter första destination
3. **SCOREBOARD manual advance** = värd måste hålla koll varje gång
4. **5 ledtrådar kan kännas långt** om timer läggs till

**Recommendations**:
1. **Timers på CLUE_LEVEL** (Critical):
   - 14/12/10/8/5 sekunder per ledtråd (graduated)
   - Auto-advance när timer går ut eller alla svarat
   - Visual countdown på tvOS + web

2. **ROUND_INTRO optional**:
   - Endast spela intro på första destination
   - Skippa på destination 2-5 (direkt till CLUE_LEVEL)

3. **SCOREBOARD auto-advance**:
   - 5s countdown innan nästa destination
   - Host kan cancela och stanna längre

4. **5 ledtrådar är lagom** (behåll):
   - Med timers blir totalt ~49s per destination (snabbt nog)
   - Ger bra progression från svår → lätt

**Priority**: Critical (timers), High (auto-advance), Medium (intro optional)

---

### 3. Timing & Tempo

**Current State**:
- ROUND_INTRO: 5s (banter + 1.5s breathing)
- CLUE_LEVEL: Ingen timer (väntar på svar)
- REVEAL: ~10s (rätt svar + sources)
- SCOREBOARD: Manual advance
- FOLLOWUP: 20s per fråga

**Analysis**:
- **Utan CLUE_LEVEL timer**: Spelet kan ta 5-10 minuter per destination (för långsamt)
- **Med timer (graduated)**: ~49s ledtrådar + ~60s followups + ~15s reveal = 2-2.5 min per destination (perfekt!)

**Recommendations**:
1. **CLUE_LEVEL timer**: 14/12/10/8/5s (graduated, se ovan)
2. **FOLLOWUP timer**: Behåll 20s (lagom för multiple choice)
3. **SCOREBOARD**: Auto-advance efter 5s (med cancel-option)
4. **REVEAL**: Behåll 10s (lagom för att läsa sources)
5. **NEXT_DESTINATION transition**: Behåll 3s (smooth)

**Total game time (3 destinations)**:
- Per destination: ~2.5 min (med timers)
- Total: 3 × 2.5 = 7.5 minuter (perfekt för party game!)

**Priority**: Critical (implementera timers först, sedan justera andra)

---

### 4. Spelarinteraktion (Player UX)

**Current State**:
- Lobby: Väntar, ser andra spelare
- Clue: Ser ledtråd text, skriver svar, submit
- Locked: "Ditt svar är låst" → vänta
- Reveal: Ser rätt svar + sin poäng
- Scoreboard: Ser alla poäng, väntar

**Issues**:
1. **För lite feedback under CLUE_LEVEL** (vet inte om andra svarat)
2. **Väntetid efter submit känns död** (inget att göra)
3. **Ingen haptic feedback** (vibration vid events)
4. **Brake är oklar** för nya spelare

**Recommendations**:
1. **Live activity indicators**:
   - "3 / 5 spelare har svarat" badge
   - Update real-time när någon låser

2. **Distraction-free efter submit**:
   - Hide phone UI, visa "Titta på TV:n!" message
   - Alternative: Mini-scoreboard preview

3. **Haptic feedback** (iOS vibration):
   - Brake accepted: Long vibration
   - Answer locked: Short tap
   - Timer warning (<5s): Pulse vibration

4. **Brake onboarding**:
   - Första gången: Tooltip "Bra jobbat! Du fick exklusiv tid."
   - Guide modal: Förklara brake-mekanik

**Priority**: High (activity indicators, haptics), Medium (distraction-free, onboarding)

---

### 5. Värd-kontroller (Host Controls)

**Current State**:
- iOS Host: Session creation (auto), lobby view, "Starta spelet"-knapp
- Pro-vy: Ser locked answers + rätt svar under game
- Saknas: Pause, skip clue, undo, kick player

**Issues**:
1. **Ingen pause-funktion** (om något händer IRL)
2. **Ingen skip clue** (om ledtråd är trasig/fel)
3. **Ingen kick player** (om troll/disconnected user)
4. **Ingen live score under game** (måste vänta till SCOREBOARD)

**Recommendations**:
1. **Pause/Resume**:
   - Knapp i iOS Host: "Pausa spel"
   - Broadcast GAME_PAUSED → alla klienter freezar
   - Resume när värd klickar igen

2. **Skip clue** (advanced):
   - Knapp i pro-vy: "Hoppa till nästa ledtråd"
   - Useful för debugging eller trasiga frågor

3. **Kick player** (advanced):
   - Lista med spelare i lobby/pro-vy
   - "Kick"-knapp (confirmation modal)

4. **Live score widget**:
   - Litet scoreboard i iOS Host (alltid synligt)
   - Update real-time från STATE_SNAPSHOT

**Priority**: High (pause), Medium (kick), Low (skip, live score)

---

### 6. tvOS Display (Main Screen)

**Current State**:
- LobbyView: QR-kod + spelare
- RoundIntroView: Destination intro (5s)
- TVClueView: Ledtråd text + poäng + låsta svar
- TVRevealView: Rätt svar + sources
- TVScoreboardView: Poäng + ranking

**Issues**:
1. **För lite visuell variation** (text-only)
2. **Inga animationer** (förutom confetti)
3. **Typografi är OK men "boring"**
4. **Ingen ambient mode i lobby** (bara QR + lista)

**Recommendations**:
1. **Animationer** (high priority):
   - Clue fade-in + scale
   - Locked answer pulse
   - Scoreboard rank animations

2. **Background visuals** (medium priority):
   - Lobby: Animated gradient (travel theme)
   - CLUE_LEVEL: Subtle map/globe rotation
   - FOLLOWUP: Quiz show spotlight

3. **Typography polish**:
   - Större poäng-siffror (more prominent)
   - Color-coded phases (blue=clue, orange=followup, green=reveal)

4. **Ambient lobby**:
   - Slow-motion travel footage loop (background)
   - Subtle music (optional, värd toggle)

**Priority**: Medium (animationer), Low (backgrounds, ambient)

---

### 7. Nödbroms (Brake) Mekanik

**Current State**:
- Spelare trycker brake → first wins
- 10s exclusive + 5s för alla
- Rate-limiting: 3s cooldown per player

**Issues**:
1. **Oklar för nya spelare** (ingen förklaring)
2. **Timing inte synlig** (10s/5s inte visat)
3. **Ingen penalty för fel-brake** (kan spamma)

**Recommendations**:
1. **Onboarding** (se ovan)
2. **Visual timer på tvOS**:
   - "Annas exklusiva tid: 8s kvar"
   - Sedan: "Alla kan svara: 3s kvar"
3. **Penalty för fel-brake** (optional):
   - Fel svar efter brake: -2p
   - Ger weight till beslut

**Current mekanik är bra** - behöver bara bättre kommunikation.

**Priority**: Medium (visual timer + onboarding), Low (penalty)

---

### 8. Följdfrågor (Followups)

**Current State**:
- 2-3 följdfrågor per destination
- 20s timer
- Multiple choice (4 alternativ)
- 2p per rätt svar (fast)

**Issues**:
1. **2p känns lågt** jämfört med destination (10p)
2. **Alla frågor samma poäng** = ingen variation
3. **20s är OK** men ingen visual urgency

**Recommendations**:
1. **Difficulty-based poäng**:
   - Easy: 1p, Medium: 2p, Hard: 3p
   - AI-content taggar frågor vid generation

2. **Timer visual**:
   - Progress bar (redan finns)
   - Red pulse när <5s kvar

3. **Question types** (advanced):
   - Multiple choice: 2p
   - True/False: 1p
   - Open text: 3p

**Priority**: Medium (difficulty-based), Low (question types)

---

### 9. Poängsystem (Scoring)

**Current State**:
- Clues: 10/8/6/4/2 poäng
- Followups: 2p per rätt
- Ingen penalty, ingen bonus
- Cumulative över destinations

**Issues**:
1. **10p för första ledtråd känns "free"** om ingen timer
2. **Ingen incentive att svara tidigt** om osäker
3. **2p followup är lågt** (10p destination dominerar)

**Recommendations**:
1. **Timer-bonus** (kräver timer):
   - Snabb gissning (första halvan av timer): +2p
   - Exempel: Ledtråd 1 (10p) + snabb = 12p

2. **Justera poäng-kurva**:
   - 15 / 10 / 6 / 3 / 1 (mer exponentiell)
   - Gör tidiga ledtrådar mer värda

3. **Penalty för fel** (mild):
   - Fel svar: -2p (inte -10)
   - Optional (toggle i settings)

**Recommendation**: Timer-bonus + justera kurva (utan penalty i v1)

**Priority**: High (efter timer implementation)

---

### 10. Slutspel (Finale)

**Current State**:
- FINAL_RESULTS: Winner announced + confetti (10-12s timeline)
- Top 3 highlight
- Full standings
- Ingen replay/rematch

**Issues**:
1. **Finale är bra** men kunde ha mer drama
2. **Ingen achievement display** (missed opportunity)
3. **Ingen "spela igen"-knapp**

**Recommendations**:
1. **Achievements** (nice-to-have):
   - Visa badges vid finale: "Broms-mästare", "Perfekt runda"
   - 2-3 badges max (inte överväldiga)

2. **Statistik slide** (after finale):
   - "Mest rätt: Anna (8/9)"
   - "Snabbast: Bob (avg 3s per svar)"
   - "Broms-kung: Charlie (5 brakes)"

3. **Rematch knapp**:
   - Efter FINAL_RESULTS → tillbaka till LOBBY
   - Behåll spelare, generera nya destinations
   - Host approve

**Priority**: Low (achievements + stats), Medium (rematch)

---

### 11. Audio & Feedback

**Current State**:
- TTS för ledtrådar (ElevenLabs)
- Music: travel loop + followup loop (ducking fungerar)
- SFX: brake, lock, reveal, finale (minimal)

**Issues**:
1. **För lite SFX** (saknar timer-tick, rätt/fel-svar sounds)
2. **Ingen haptic feedback** på mobil
3. **TTS-volym inte justerbar** per clip (fixed 1.0)

**Recommendations**:
1. **Lägg till SFX**:
   - Timer warning (<5s): Tick-tick-tick
   - Rätt svar reveal: Success chime
   - Fel svar reveal: Mild "aww" sound
   - Followup locked: Quick blip

2. **Haptic feedback** (web player):
   - Brake accepted: Long vibration
   - Answer locked: Short tap
   - Timer warning: Pulse

3. **TTS-volym** (already implemented):
   - `volume` field i AUDIO_PLAY (v1.3.3)
   - Host kan justera via iOS app

**Priority**: Medium (SFX), High (haptics), Low (TTS volume control i UI)

---

### 12. Accessibility

**Current State**:
- Text-only fallback (om TTS misslyckas)
- Standard font sizes
- Ingen explicit accessibility features

**Issues**:
1. **Ingen screen reader support** (web)
2. **Ingen färgblindhet-mode**
3. **Font size inte justerbar**

**Recommendations**:
1. **Screen reader** (WCAG compliance):
   - Lägg till ARIA labels på web player
   - Announce phase changes ("Ledtråd 2, 8 poäng")

2. **Färgblindhet mode**:
   - Toggle i settings (host eller player)
   - Use patterns + colors (striped vs solid)

3. **Font size toggle**:
   - Large text mode (1.5× default)
   - Accessible via settings

**Priority**: Low (post-MVP, men viktigt för launch)

---

### 13. Error States & Edge Cases

**Current State**:
- Audio fail → visa text direkt
- Reconnect → STATE_SNAPSHOT recovery
- No players → kan ej starta
- Minimal error messaging

**Issues**:
1. **Error messages är generiska** ("Ett fel uppstod")
2. **Ingen retry-knapp** vid fail
3. **Connection quality inte visat** (spelare vet inte om lag)

**Recommendations**:
1. **Bättre error messages**:
   - "AI-generering misslyckades. Försök igen eller importera manuell content."
   - "Anslutning bruten. Återansluter automatiskt..."

2. **Retry buttons**:
   - Vid AI fail: "Försök igen"-knapp
   - Vid connection fail: "Återanslut"-knapp (manual trigger)

3. **Connection quality indicator**:
   - Grön/gul/röd badge (ping-based)
   - Visa i connection-status

**Priority**: Medium (error messages), Low (retry, connection quality)

---

## Prioritized Roadmap

### Phase A: Critical Fixes (Sprint 3 - 1 vecka)

**Sprint 3.1: Timer System (2 dagar)**
- [ ] Backend: Implementera graduated timers per CLUE_LEVEL (14/12/10/8/5s)
- [ ] Backend: Auto-advance när timer går ut
- [ ] Contracts: Uppdatera state.schema.json med `clueLevelTimer`
- [ ] tvOS: Visa countdown visuellt (ring eller badge)
- [ ] Web: Visa timer badge i ClueDisplay
- [ ] Test: E2E timer flow (3 destinations)

**Sprint 3.2: Player Feedback (1 dag)**
- [ ] Backend: Broadcast locked answer count real-time
- [ ] tvOS: Animated badge "3 / 5 spelare har svarat"
- [ ] Web: Header badge med locked count
- [ ] Test: Verify UI updates on answer lock

**Sprint 3.3: Onboarding (2 dagar)**
- [ ] tvOS: Implementera Bonjour auto-discovery för sessions
- [ ] Web: "Hur spelar man?"-modal (lobby, localStorage flag)
- [ ] Web: Brake tooltip (första gången brake används)
- [ ] Test: Onboarding flow för nya spelare

---

### Phase B: UX Enhancements (Sprint 4 - 2 veckor)

**Sprint 4.1: Pacing Improvements (2 dagar)**
- [ ] Backend: Gör ROUND_INTRO optional (endast första destination)
- [ ] Backend: SCOREBOARD auto-advance efter 5s (med cancel-option)
- [ ] iOS Host: Cancel-knapp för auto-advance
- [ ] tvOS: Countdown badge på SCOREBOARD
- [ ] Test: Multi-destination pacing (känns det bättre?)

**Sprint 4.2: Scoring Rebalance (2 dagar)**
- [ ] Architect: Revidera scoring.md (timer-bonus + kurv-justering)
- [ ] Backend: Implementera timer-bonus (+2p för snabb gissning)
- [ ] Backend: Justera poäng-kurva (15/10/6/3/1 eller behåll 10/8/6/4/2)
- [ ] Contracts: Uppdatera scoring.md
- [ ] Test: Playtest ny balans (känns det mer rewarding?)

**Sprint 4.3: Brake UX (1 dag)**
- [ ] tvOS: Visa brake-timer ("Annas tid: 8s kvar" → "Alla: 3s kvar")
- [ ] Web: Brake tooltip med explanation
- [ ] Test: Nya spelare förstår brake-mekanik

**Sprint 4.4: tvOS Visual Polish (3 dagar)**
- [ ] tvOS: Clue fade-in + scale animation
- [ ] tvOS: Locked answer pulse effect
- [ ] tvOS: Scoreboard rank animations (podium highlight)
- [ ] tvOS: Timer urgency (red pulse <5s)
- [ ] Assets: Animated gradient backgrounds (lobby, clue)
- [ ] Test: Visual polish känns mer "TV-show"

---

### Phase C: Polish & Nice-to-haves (Sprint 5+ - löpande)

**Sprint 5.1: Haptic Feedback (1 dag)**
- [ ] Web: Implement vibration API (brake, lock, timer warning)
- [ ] Test: iOS haptics fungerar korrekt

**Sprint 5.2: Distraction-Free Mode (1 dag)**
- [ ] Web: "Titta på TV:n!"-screen efter submit
- [ ] Alternative: Mini-scoreboard preview under väntetid
- [ ] Test: Spelarna kollar mer på TV

**Sprint 5.3: Difficulty Settings (2 dagar)**
- [ ] iOS Host: Lobby settings toggle (Easy/Normal/Hard)
- [ ] AI-content: Difficulty tuning per mode
- [ ] Backend: Adjust timer/scoring based on difficulty
- [ ] Test: Playtest alla tre modes

**Sprint 5.4: SFX Expansion (1 dag)**
- [ ] Audio: Skapa timer-tick, rätt/fel-svar sounds
- [ ] Backend: SFX_PLAY för nya events
- [ ] tvOS: Implement nya SFX
- [ ] Test: Audio balans (inte för mycket)

**Sprint 5.5: Host Control Enhancements (2 dagar)**
- [ ] iOS Host: Pause/Resume game
- [ ] iOS Host: Kick player (lobby + pro-vy)
- [ ] iOS Host: Live scoreboard widget
- [ ] Backend: GAME_PAUSED event + state handling
- [ ] Test: Host kan kontrollera game smoothly

**Sprint 6+: Long-term Enhancements**
- [ ] Achievements/badges system
- [ ] Team mode (2-4 lag)
- [ ] Custom content packs (user-generated)
- [ ] Rematch/replay funktionalitet
- [ ] Advanced animations (confetti variations, screen effects)
- [ ] Accessibility features (screen reader, färgblindhet, font size)
- [ ] Connection quality indicator
- [ ] Error handling improvements

---

## Testing Recommendations

### High-Priority Tests (innan Phase A launch)

1. **Timer system stress test**:
   - 10 spelare, alla väntar till sista sekunden
   - Verify auto-advance fungerar
   - Check sync accuracy (±100ms tolerance)

2. **Player feedback visibility**:
   - 5 spelare, locked count updates real-time
   - Verify tvOS + web synkroniserad

3. **Onboarding usability test**:
   - 5 nya spelare (aldrig spelat)
   - Mät: Hur många förstår brake utan hjälp? (target: 80%+)
   - Förbättra guide baserat på feedback

### Medium-Priority Tests (Phase B)

4. **Pacing playtest**:
   - 3 destinations, mät total game time
   - Target: 7-10 minuter (med timers)
   - Survey: "Kändes tempot bra?" (target: 4/5 avg rating)

5. **Scoring balance playtest**:
   - Test nya poäng-kurvan (timer-bonus)
   - Verify: Spelare försöker svara snabbt (inte vänta på lätta ledtrådar)
   - Check: Känns det rewarding? (survey)

### Low-Priority Tests (Phase C+)

6. **Haptic feedback test**:
   - iOS devices (iPhone 8+)
   - Verify vibration API fungerar

7. **Accessibility audit**:
   - Screen reader (VoiceOver/TalkBack)
   - Färgblindhet simulator
   - Font size scaling

---

## Metrics to Track (post-launch)

1. **Engagement**:
   - Avg game length (target: 7-10 min)
   - Completion rate (target: >80%)
   - Replays per session (target: 2+)

2. **Player behavior**:
   - Brake usage per game (avg)
   - Timer expiry rate (how often do timers run out?)
   - Answer speed distribution (snabb vs vänta)

3. **Content**:
   - AI generation success rate (target: >95%)
   - TTS cache hit rate (target: >80%)
   - Error rate per phase

4. **Technical**:
   - Reconnect success rate (target: >90%)
   - Audio sync accuracy (target: ±100ms)
   - WebSocket latency (avg)

---

## Conclusion

Tripto har en exceptionell teknisk foundation men behöver **timing/pacing-justeringar** (timers, auto-advance) och **player feedback-förbättringar** (activity indicators, haptics) för att nå full "party game"-potential.

**Key Priorities**:
1. **Sprint 3**: Implementera graduated timers (Critical)
2. **Sprint 4**: Rebalansera scoring + visual polish (High)
3. **Sprint 5+**: Haptics, difficulty settings, achievements (Nice-to-have)

**Nuvarande state**: Tekniskt solid, spelbart, men känns "slow" utan timers. Med Phase A-fixar blir spelet dramatiskt bättre.

**Recommendation**: Kör Phase A omedelbart (1 vecka), playtest, sedan fortsätt till Phase B baserat på feedback.

---

**Review Compiled By**: CEO Agent
**Date**: 2026-02-08
**Next Review**: Efter Sprint 3 completion (timer system deployed)
