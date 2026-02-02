#!/usr/bin/env bash
set -euo pipefail

# --- folders ---
mkdir -p contracts apps/tvos apps/ios-host apps/web-player services/backend services/ai-content docs
mkdir -p .claude/agents .claude/skills
mkdir -p .claude/skills/start .claude/skills/recruit .claude/skills/team .claude/skills/contracts-check .claude/skills/github-flow

# --- CLAUDE.md ---
cat > CLAUDE.md <<'MD'
# På Spåret – Party Edition (TV + mobil)

## Målet
Bygg en spelplattform:
- tvOS-app visar spelet på Apple TV (storbild + audio mix).
- iOS/iPadOS Host-app skapar session, styr spelet och har pro-vy.
- Spelare joinar utan app via Web/PWA (QR-kod) och spelar där.
- Spelet: 5 ledtrådsnivåer (10/8/6/4/2), nödbroms, låsta svar, reveal, poäng.
- Följdfrågor med timer (2–3 per destination).
- AI genererar destinationer/ledtrådar/följdfrågor med faktaverifiering + anti-leak.
- ElevenLabs TTS (pregen + cache), bakgrundsmusik (resa/följdfråga) + ducking, finale med konfetti/SFX.

## Absoluta arkitekturregler (MÅSTE)
1) `contracts/` är enda källan för event/state/scoring/audio-timeline.
2) Inga breaking changes i `contracts/` utan att uppdatera ALLA clients.
3) Servern är auktoritativ: state machine, timers, poäng, fairness.
4) TV/Player får aldrig se hemligheter (rätt svar/källor) innan reveal.
5) Allt som kan desync:a (timers, brake fairness) måste styras av servern.
6) API-nycklar i `.env` och får aldrig committas.

## Repo-struktur
- contracts/ -> schema och regler (Architect äger)
- apps/tvos/ -> Apple TV klient (tvos-agent)
- apps/ios-host/ -> värdklient (ios-host-agent)
- apps/web-player/ -> spelarklient (web-agent)
- services/backend/ -> WS + state engine + DB/Redis (backend-agent)
- services/ai-content/ -> AI pipeline + verifiering + TTS jobs (ai-content-agent)

## Definition of Done (DoD)
En feature är klar när:
- contracts uppdaterade + validerade
- backend implementerad
- tvOS + web + host fungerar med eventen
- reconnect funkar (STATE_SNAPSHOT)
- enkel test/checklista i docs finns
MD

# --- blueprint placeholder ---
cat > docs/blueprint.md <<'MD'
# Blueprint
Klistra in den fulla blueprinten här (från vårt canvas-dokument).
Tips: håll denna fil som "produkt-spec", medan contracts/ är "tekniska kontrakt".
MD

# --- contracts ---
cat > contracts/events.schema.json <<'JSON'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WS Event Envelope",
  "type": "object",
  "required": ["type", "sessionId", "serverTimeMs", "payload"],
  "properties": {
    "type": { "type": "string" },
    "sessionId": { "type": "string" },
    "serverTimeMs": { "type": "integer" },
    "payload": { "type": "object" }
  },
  "additionalProperties": false
}
JSON

cat > contracts/state.schema.json <<'JSON'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GameState",
  "type": "object",
  "required": ["phase", "version"],
  "properties": {
    "version": { "type": "integer" },
    "phase": {
      "type": "string",
      "enum": [
        "LOBBY",
        "PREPARING_ROUND",
        "ROUND_INTRO",
        "CLUE_LEVEL",
        "PAUSED_FOR_BRAKE",
        "REVEAL_DESTINATION",
        "FOLLOWUP_QUESTION",
        "SCOREBOARD",
        "FINAL_RESULTS",
        "ROUND_END"
      ]
    },
    "roundIndex": { "type": "integer" },
    "clueLevelPoints": { "type": "integer", "enum": [10, 8, 6, 4, 2] },
    "brakeOwnerPlayerId": { "type": ["string", "null"] },
    "timer": {
      "type": ["object", "null"],
      "properties": {
        "timerId": { "type": "string" },
        "startAtServerMs": { "type": "integer" },
        "durationMs": { "type": "integer" }
      },
      "required": ["timerId", "startAtServerMs", "durationMs"],
      "additionalProperties": false
    }
  },
  "additionalProperties": true
}
JSON

cat > contracts/scoring.md <<'MD'
# Scoring v1

## Destination
- Spelare får låsa 1 svar per destination.
- Låst på nivå X (10/8/6/4/2):
  - Rätt: +X poäng
  - Fel: 0 poäng (ingen minus i v1)

## Followups
- Varje följdfråga: +2 poäng vid rätt svar (v1).
- Alla får svara inom timerfönstret.
- Svar låses vid timeout av servern.

## Ties
- Vid lika totalpoäng i v1: delad vinst (FINAL_RESULTS visar flera vinnare).
MD

cat > contracts/audio_timeline.md <<'MD'
# Audio & TV Effects v1

## Ljudlager (TV)
1) Music bed (loop):
   - music_travel_loop under CLUE_LEVEL
   - music_followup_loop under FOLLOWUP_QUESTION
2) Voice (TTS) via AUDIO_PLAY
3) SFX via SFX_PLAY

## Ducking
- När voice spelar: sänk music -10dB (justerbart)
- Attack 150ms, release 900ms (default)

## Events (TV)
- MUSIC_SET { trackId, mode:"loop", startAtServerMs, gainDb? }
- MUSIC_STOP { fadeOutMs }
- MUSIC_GAIN_SET { gainDb }
- AUDIO_PLAY { clipId, startAtServerMs }  (voice)
- SFX_PLAY { sfxId, startAtServerMs }
- UI_EFFECT_TRIGGER { effectId:"confetti|flash|spotlight", intensity:"low|med|high", durationMs }

## FINAL_RESULTS (10–12s)
- t0: MUSIC_STOP(600ms), SFX sting_build
- t0+0.8: SFX drumroll
- t0+3.2: reveal + winner_fanfare + confetti(2500ms)
- t0+7.0: full scoreboard + “Tack för ikväll”
- t0+10.5: ROUND_END
MD

# --- agents ---
cat > .claude/agents/ceo.md <<'MD'
---
name: ceo
description: Projektledare. Skapar backlog, sprintplan, definierar milstolpar och delegerar till rätt agent.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du är CEO/PM för projektet.

Arbetsregler:
- Läs CLAUDE.md och docs/blueprint.md.
- Bryt ner till Sprint-planer med tydliga deliverables.
- Allt går via contracts/ först (Architect äger).
- Du skapar tasks per agent och säkerställer att de inte krockar.
- Du kräver att varje task har: Scope, Acceptance Criteria, Files/Paths, Test/Check.

REKRYTERINGSORDER (om teamet saknar roll):
ROLL:
SYFTE:
KÄRNKOMPETENSER:
SAMARBETAR MED:
PRIORITET:
MD

cat > .claude/agents/hr.md <<'MD'
---
name: hr
description: Agent-arkitekt. Skapar 3 kandidat-agenter per roll (A Specialist / B Generalist / C Innovator).
tools: Read, Glob, Grep, Write, Edit
model: sonnet
---

Du är HR. När du får en REKRYTERINGSORDER:
1) Skapa 3 kandidater (A/B/C) med olika approach.
2) Varje kandidat ska ha:
   - Ansvar
   - Triggers (när den ska användas)
   - Mappar den får ändra
   - DoD och testkrav
3) Spara kandidater som .claude/agents/candidates/<roll>-A.md osv.
MD

cat > .claude/agents/architect.md <<'MD'
---
name: architect
description: Äger contracts/. Definierar event/state/scoring/audio. Förhindrar breaking changes och drift mellan klienter.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---

Du äger contracts/.

Ansvar:
- Definiera event-namn + payloads, state machine, scoring och audio-timeline.
- Håll bakåtkompatibilitet när möjligt.
- När någon vill ändra ett event/state: uppdatera contracts först.
- Kräv att backend + clients uppdateras när contracts ändras.

Output-format när du godkänner en change:
- Change summary
- Updated files
- Migration notes (om breaking)
- Checklist för backend/tvos/ios/web
MD

cat > .claude/agents/backend.md <<'MD'
---
name: backend
description: Bygger services/backend: WebSocket gateway, state machine, timers, fairness (brake), scoring, persistence.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger services/backend/.

Regler:
- Servern är auktoritativ.
- Implementera state machine enligt contracts/state.schema.json.
- Timers server-side (startAtServerMs, duration).
- Brake fairness: first-wins via Redis lock (eller atomisk in-memory i dev).

DoD:
- WS handshake + auth (dev-token räcker initialt)
- STATE_SNAPSHOT på connect/reconnect
- BRAKE_ACCEPTED fairness test
- SCOREBOARD_UPDATE efter reveal + followups
MD

cat > .claude/agents/tvos.md <<'MD'
---
name: tvos
description: Bygger apps/tvos. Renderar state, visar QR/lobby/clues/followups/scoreboard/finale. Audio mix: music+tts+sfx+ducking.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger apps/tvos/.

Regler:
- Inga hemligheter (rätt svar/källor) får visas innan reveal.
- TV spelar all audio (TTS + music loops + SFX).
- Ducking enligt contracts/audio_timeline.md.

DoD:
- Lobby view (QR + players)
- Clue screen (level + text + progress)
- Followup screen + timer
- Final results: confetti + fanfare timeline
MD

cat > .claude/agents/ios-host.md <<'MD'
---
name: ios-host
description: Bygger apps/ios-host. Skapa session, host controls, pro-vy med extra info, musiknivå och admin actions.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger apps/ios-host/.

Regler:
- Host får se pro-data men ska aldrig läcka den.
- Host kan: start/pause/skip/force reveal, music gain.

DoD:
- Create session UI
- Lobby admin (se spelare)
- Live control panel (play/pause/skip + music)
MD

cat > .claude/agents/web.md <<'MD'
---
name: web
description: Bygger apps/web-player (PWA). Join via QR, lobby, brake button, answer dialogs, followups, my score.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger apps/web-player/.

Regler:
- Minimal friktion: join i browser, ingen installation krävs.
- Spelar inget ljud (för att undvika eko).
- Renderar state från backend.

DoD:
- Join screen (name)
- Lobby screen
- Brake + answer lock dialog
- Followup answer + timer UI
MD

cat > .claude/agents/ai-content.md <<'MD'
---
name: ai-content
description: Bygger services/ai-content. Genererar resmål/ledtrådar/följdfrågor. Faktaverifiering + anti-leak. Producerar content-pack.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger services/ai-content/.

Regler:
- LLM får inte vara enda sanningen: använd retrieval + claim verification.
- Skapa content-pack format (destination, clues, followups, sources, bannedTerms).
- Anti-leak: followup-svar får inte overlap med ledtrådarnas nyckeltermer.

DoD:
- Content-pack JSON format
- Verifieringsstatus per claim (verified/uncertain/rejected)
- Fallback: byt claim/destination om verifiering failar
MD

cat > .claude/agents/audio.md <<'MD'
---
name: audio
description: Äger TTS/music/sfx pipeline. ElevenLabs pregen + caching + loudness + clip manifest. Synk mot TV timeline.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger audio-aspekterna tvärs över backend+tvOS+ai-content.

Regler:
- TTS pregenereras och cacheas (inte live mitt i rundan).
- Clips har id/ref_key och duration_ms.
- TV får AUDIO_PLAY/MUSIC_SET/SFX_PLAY/UI_EFFECT_TRIGGER.

DoD:
- Clip manifest/metadata klar per round
- Ducking och gain policy dokumenterad
- Fallback om TTS misslyckas (text-only på TV)
MD

# --- skills ---
cat > .claude/skills/start/SKILL.md <<'MD'
---
name: start
description: Kickoff. Skapar Sprint 1 backlog, kontrollerar contracts och delar ut tasks till agents.
---

1) Be ceo-agenten:
   - Läs CLAUDE.md och docs/blueprint.md
   - Skapa Sprint 1 backlog (minsta end-to-end loop)
   - Skriv output i docs/sprint-1.md

2) Be architect-agenten:
   - Validera att contracts/ täcker Sprint 1 events + state
   - Föreslå nödvändiga contracts-ändringar (minimalt)
   - Skriv output i docs/contracts-changes.md

3) Be ceo-agenten skapa arbetsordning:
   - Backend först (WS + snapshot)
   - Web join + lobby
   - TV lobby + QR
   - Clue loop + brake
   - Reveal + scoreboard
MD

cat > .claude/skills/recruit/SKILL.md <<'MD'
---
name: recruit
description: HR skapar 3 kandidat-agenter baserat på senaste REKRYTERINGSORDER.
---

1) Leta efter senaste REKRYTERINGSORDER i chatten.
2) Kör hr-agenten: skapa 3 kandidater (A/B/C) och spara i .claude/agents/candidates/
3) Presentera kandidaternas skillnader och rekommendera en.
MD

cat > .claude/skills/team/SKILL.md <<'MD'
---
name: team
description: Visar nuvarande teamroller och vilka mappar de äger.
---

Sammanfatta:
- Alla agents i .claude/agents/
- Vilka mappar de äger
- Vilken ordning de bör köras i för nuvarande sprint
MD

cat > .claude/skills/contracts-check/SKILL.md <<'MD'
---
name: contracts-check
description: Kontrollerar att events/state i kod matchar contracts och listar mismatchar.
---

1) Läs contracts/*.json och contracts/*.md
2) Sök i repo efter eventnamn (type: \"...\") och state phase enums.
3) Lista mismatchar och föreslå fixar per app/service.
MD

cat > .claude/skills/github-flow/SKILL.md <<'MD'
---
name: github-flow
description: Standardiserar branch/PR-flöde: small PRs, naming, templates, checklists.
---

Skapa/uppdatera:
- docs/branching.md (branch naming + small PR policy)
- docs/pr-checklist.md (DoD checklist)
Rekommendation:
- feature/<area>-<short-desc>
- PR <= 400 rader när möjligt
- 1 PR = 1 feature
MD

# --- gitignore (valfritt men smart) ---
cat > .gitignore <<'TXT'
.env
.DS_Store
node_modules/
.build/
DerivedData/
TXT

echo
echo "✅ Setup klart. Struktur:"
find . -maxdepth 3 -type f | sed 's|^\./||' | sort
echo
echo "Nästa steg:"
echo "1) Kör: chmod +x setup_claude_team.sh && ./setup_claude_team.sh  (om du inte redan körde scriptet)"
echo "2) Starta Claude Code i repo-roten: claude"
echo "3) Kör i Claude Code: /agents  och sen  /start"
