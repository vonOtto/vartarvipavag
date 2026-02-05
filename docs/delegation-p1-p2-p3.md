# Delegation — P1 / P2 / P3

CEO rapport. Datum 2026-02-05.

---

## Status: vad som ar klart nu

Forsta fas har executarts och ar landat i working tree (inte yet committat).
Nedanfor listas exakt vad som ar klart och vad som aterstar.

### Klart (working tree, inte committat)

| Problem | Andring | Fil | Rad |
|---------|---------|-----|-----|
| P1 | "Alright" -> "Okej" i variant D | `contracts/banter.md` | 187 |
| P1 | "points" -> "poang" | `apps/web-player/src/components/ClueDisplay.tsx` | 12 |
| P1 | "answers locked this round" -> svenska | `apps/web-player/src/pages/GamePage.tsx` | 465 |
| P1 | "byggfragor" -> "fragar om destinationerna" | `apps/web-player/src/pages/LandingPage.tsx` | 16 |
| P1 | "Styrden" -> "Styr" | `apps/web-player/src/pages/JoinPage.tsx` | 127 |
| P1 | "DESTINATION (hemligt)" -> "Destinationen (hemligt)" | `apps/ios-host/Sources/PaSparetHost/App.swift` | 291 |
| P1 | "Connection lost" -> svenska | `apps/ios-host/Sources/PaSparetHost/HostState.swift` | 300 |
| P1 | "Connection lost" -> svenska | `apps/tvos/Sources/PaSparetTV/AppState.swift` | 396 |
| P2 | CLUE_ORDINALS removed; variant A = "Ledtraden -- N pong: {text}" | `services/backend/src/game/tts-prefetch.ts` | 62-102 |
| P2 | variant A templates updated for all 5 levels | `contracts/banter.md` | 134-166 |
| P3a | textRevealAfterMs added to CLUE_PRESENT schema | `contracts/events.schema.json` | 238 |
| P3b-sig | buildCluePresentEvent accepts textRevealAfterMs param | `services/backend/src/utils/event-builder.ts` | 106-119 |

### Aterstar (delegeras nedan)

| Problem | Vad | Agent | Task-label |
|---------|-----|-------|------------|
| P3b | Fyll textRevealAfterMs vid 3 call-sites i server.ts | backend | TASK-P3b |
| P3c | Fordroj text-visning i tvOS AppState | tvos | TASK-P3c |
| P3d | Fordroj text-visning i iOS Host HostState | ios-host | TASK-P3d |
| P3e | Fordroj text-visning i web GamePage | web | TASK-P3e |

---

## Beslut: P3 approach -- Option B (textRevealAfterMs)

Tre alternativ analyserades:

| Kriterie | A: ny event CLUE_TEXT_REVEAL | B: falt i CLUE_PRESENT | C: client derives from AUDIO_PLAY |
|---|---|---|---|
| CLAUDE.md regel 5 (server ager timers) | Ja | Ja -- vardet kommar fran server | Nej -- client beraknar delay sjalv |
| Kontraktsandring | Ny event, alla klienter | +1 optionellt falt | Ingen |
| Reconnect | Komplicerad: server maste spara emit-tid | Enkel: vid reconnect visa text direkt | Komplicerad: AUDIO_PLAY kansk missats |
| Kodandring per klient | Stor: nytt event i alla dispatch-handlers | Minimal: if-check i befintlig handler | Liten men fragil: timing-race |

Beslut: Option B.

Rationale: Vardet (durationMs) ar tillhands pa servern precis dar generateClueVoice
anropas -- det ar return-vardet fran funktionen. Falt ar optionellt sa alder clients
som inte vet om det fallback:ar till 0 (visa direkt). Reconnect-regeln ar enkel:
STATE_SNAPSHOT visar text direkt, TTS replays inte. Regel 5 uppfylls: delay-vardet
ar server-provided, inte client-beraknat.

---

## TASK-P3b -- Backend: fyll textRevealAfterMs vid de 3 call-sites

### Scope

Tre platser i `services/backend/src/server.ts` anropar `buildCluePresentEvent`.
Vid varje plats anropas `generateClueVoice` strax dessofore men return-vardet
kastar se. Andringen: fanga return-vardet och skicka dess `durationMs` som
sjatte argument till `buildCluePresentEvent`.

`buildCluePresentEvent` har already uppdaterats i `event-builder.ts` (sjatte
param `textRevealAfterMs: number = 0`). Inga andra andring behövs i event-builder.

### Acceptance Criteria

**Call-site 1 -- rad 500 + 515 (eftar ROUND_INTRO, forsta ledtrad):**

Rad 500 andras fran:
```typescript
await generateClueVoice(sess, gameData.clueLevelPoints, gameData.clueText);
```
Till:
```typescript
const clueClip = await generateClueVoice(sess, gameData.clueLevelPoints, gameData.clueText);
```

Rad 515-521 andras fran:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  gameData.clueText,
  gameData.clueLevelPoints,
  sess.state.roundIndex || 0,
  gameData.clueIndex
);
```
Till:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  gameData.clueText,
  gameData.clueLevelPoints,
  sess.state.roundIndex || 0,
  gameData.clueIndex,
  clueClip?.durationMs ?? 0
);
```

**Call-site 2 -- rad 750 + 756 (handleHostNextClue, manuell advance):**

Rad 750 andras fran:
```typescript
await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);
```
Till:
```typescript
const clueClip = await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);
```

Rad 756-762 andras fran:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  result.clueText!,
  result.clueLevelPoints!,
  session.state.roundIndex || 0,
  result.clueIndex!
);
```
Till:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  result.clueText!,
  result.clueLevelPoints!,
  session.state.roundIndex || 0,
  result.clueIndex!,
  clueClip?.durationMs ?? 0
);
```

**Call-site 3 -- rad 1371 + 1377 (autoAdvanceClue):**

Rad 1371 andras fran:
```typescript
await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);
```
Till:
```typescript
const clueClip = await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);
```

Rad 1377-1383 andras fran:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  result.clueText!,
  result.clueLevelPoints!,
  session.state.roundIndex || 0,
  result.clueIndex!
);
```
Till:
```typescript
const clueEvent = buildCluePresentEvent(
  sessionId,
  result.clueText!,
  result.clueLevelPoints!,
  session.state.roundIndex || 0,
  result.clueIndex!,
  clueClip?.durationMs ?? 0
);
```

### Files/Paths

- `services/backend/src/server.ts` -- rader 500, 515-521, 750, 756-762, 1371, 1377-1383

### Test/Check

- Skicka HOST_NEXT_CLUE, fanga CLUE_PRESENT via WebSocket.
- `payload.textRevealAfterMs` ska vara ett positivt integer (typiskt 2000-5000)
  nar TTS genererads OK.
- Om TTS-generering failar (generateClueVoice returnerar null):
  `textRevealAfterMs` ska vara 0 eller absent i payloaden.

### Handoff-paket

- **Contract:** `contracts/events.schema.json` CLUE_PRESENT -- falt `textRevealAfterMs`
  optionellt, integer >= 0. Already added.
- **Input:** `generateClueVoice` returnerar `TtsManifestEntry | null`.
  `TtsManifestEntry` har falt `durationMs: number` (millisekunder).
- **Output:** CLUE_PRESENT payload med `textRevealAfterMs` falt.
- **Referens:** `contracts/audio_timeline.md`, `services/backend/src/utils/event-builder.ts`.

---

## TASK-P3c -- tvOS: fordrog text-visning

### Scope

I `AppState.swift`, CLUE_PRESENT-handler: nar `textRevealAfterMs > 0` ska
`clueText` inte sattas direkt. Istallet: spara texten temporart, satt `clueText = nil`
(sa TVClueView visar "Vanter pa ledtrad..."), starta Task.sleep, satt sedan clueText.
Pa reconnect (STATE_SNAPSHOT / applyState): satt direkt -- TTS replays inte.

### Acceptance Criteria

1. I `AppState.swift`, CLUE_PRESENT handler (rader 134-139):
   - Lasa `textRevealAfterMs` fran payload: `let delayMs = payload["textRevealAfterMs"] as? Int ?? 0`
   - Om `delayMs > 0`:
     ```swift
     let pendingText = payload["clueText"] as? String
     clueText = nil
     levelPoints = payload["clueLevelPoints"] as? Int
     phase = "CLUE_LEVEL"
     brakeOwnerName = nil
     Task { [self] in
         try? await Task.sleep(nanoseconds: UInt64(delayMs) * 1_000_000)
         await MainActor.run { self.clueText = pendingText }
     }
     ```
   - Om `delayMs == 0`: behaller nuvaande beteende (satt clueText direkt).

2. I `applyState` (rad 364): `clueText = state.clueText` behaller nuvarande
   beteende -- ingen delay vid reconnect.

3. `TVClueView.swift` behaller sin logik oandrad. Visar `appState.clueText`
   nar non-nil, annars "Vanter pa ledtrad...". Ingen andring behövs.

### Files/Paths

- `apps/tvos/Sources/PaSparetTV/AppState.swift` -- CLUE_PRESENT handler (rader 134-139)

### Test/Check

- Med TTS tillgangligt: eftar CLUE_PRESENT ska TV-skarman visa "Vanter pa ledtrad..."
  under ca `textRevealAfterMs` ms, sedan ledtrad-texten.
- Pa reconnect (kills WebSocket + reconnects): ledtrad-texten visas direkt.
- Om TTS saknar clip (delayMs == 0 eller absent): text visas direkt som idag.

### Handoff-paket

- **Contract:** CLUE_PRESENT payload har optionellt `textRevealAfterMs: integer`.
  Absent eller 0 = visa direkt.
- **Input:** WebSocket event `CLUE_PRESENT` med payload falt `textRevealAfterMs`.
- **Output:** UI -- TVClueView visar "Vanter pa ledtrad..." under delay, sedan texten.
- **Referens:** AppState.swift rad 264-278 (AUDIO_PLAY handler) -- visar precedent
  for Task.sleep + MainActor.run pattern som ska anvandas.

---

## TASK-P3d -- iOS Host: fordrog text-visning

### Scope

Identisk logik som TASK-P3c, men i HostState.swift. Sama reconnect-regel.

### Acceptance Criteria

1. I `HostState.swift`, CLUE_PRESENT handler (rader 106-111):
   - Lasa `delayMs` fran payload (default 0).
   - Om > 0: spara text temporart, satt `clueText = nil`, Task.sleep, satt sedan.
   - Om 0: satt direkt (nuvarande beteende).

2. I `applyState` (rad 283): `clueText = state.clueText` behaller nuvarande
   beteende -- ingen delay vid reconnect.

### Files/Paths

- `apps/ios-host/Sources/PaSparetHost/HostState.swift` -- CLUE_PRESENT handler (rader 106-111)

### Test/Check

- Identiskt med TASK-P3c men verifiera i host-appen.

### Handoff-paket

- **Contract:** identiskt med TASK-P3c.
- **Referens:** AppState.swift (tvOS) som referensimplementation -- sama pattern.

---

## TASK-P3e -- Web: fordrog text-visning

### Scope

I `GamePage.tsx`, `currentClue` memo (rader 322-331): nar `lastEvent` ar
`CLUE_PRESENT` och `textRevealAfterMs > 0` ska `currentClue` inte sattas
direkt. Istallet: setTimeout + state-update eftar delay. Reconnect-fallback
(gameState-grenan rader 327-329) visas direkt.

### Acceptance Criteria

1. Lagg en ny state-variable och ref for timeout:
   ```typescript
   const [delayedClue, setDelayedClue] = useState<{ points: ClueLevelPoints; text: string } | null>(null);
   const clueRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```

2. Andras `currentClue` memo (rader 322-331) till:
   - Om `lastEvent?.type === 'CLUE_PRESENT'`:
     - Lasa `textRevealAfterMs` fran payload (default 0).
     - Om > 0: returnera `delayedClue` (satts av effekten nedan).
     - Om 0: returnera direkt { points, text } som idag.
   - Reconnect-fallback (gameState-grenan, rader 327-329): returnera direkt som idag.

3. Lagg useEffect som hanter delay:
   ```typescript
   useEffect(() => {
     if (lastEvent?.type !== 'CLUE_PRESENT') return;
     const payload = lastEvent.payload as CluePresentPayload;
     const delayMs = (payload as any).textRevealAfterMs ?? 0;
     if (delayMs > 0) {
       setDelayedClue(null);
       if (clueRevealTimeoutRef.current) clearTimeout(clueRevealTimeoutRef.current);
       clueRevealTimeoutRef.current = setTimeout(() => {
         setDelayedClue({ points: payload.clueLevelPoints, text: payload.clueText });
       }, delayMs);
     }
     return () => {
       if (clueRevealTimeoutRef.current) clearTimeout(clueRevealTimeoutRef.current);
     };
   }, [lastEvent]);
   ```

4. Cleanup: eftersatt komponent unmounts ska timeout cancelas (hanteras av
   cleanup-funktionen i effekten ovan).

### Files/Paths

- `apps/web-player/src/pages/GamePage.tsx` -- rader 322-331, nytt useEffect

### Test/Check

- Med TTS: eftar CLUE_PRESENT ska "Vanter pa nasta ledtrad..." visas under ca
  `textRevealAfterMs` ms, sedan ledtrad-texten.
- Pa page-reload (reconnect): ledtrad-texten visas direkt.
- Om textRevealAfterMs == 0 eller absent: text visas direkt som idag.

### Handoff-paket

- **Contract:** identiskt med TASK-P3c.
- **Input:** `lastEvent.payload.textRevealAfterMs` (optional number).
- **Output:** UI -- ClueDisplay visas eftar delay.
- **Referens:** GamePage.tsx rad 291-305 (followup timer useEffect) som
  precedent for server-driven timer + client-side render pattern.

---

## Beroeseordning

```
TASK-P3b (backend: 3 call-sites)       -- inga beroende, kan kora nu
TASK-P3c (tvos: delay)                 -- beroende: TASK-P3b
TASK-P3d (ios-host: delay)             -- beroende: TASK-P3b
TASK-P3e (web: delay)                  -- beroende: TASK-P3b
```

P3c, P3d, P3e kan kora parallel med varandra men alla behover TASK-P3b klart forst
(annars ar textRevealAfterMs alltid 0 och delay-logiken ej testbar end-to-end).

---

## Agentsammanfattning

| Agent | Task | Fas | Status |
|-------|------|-----|--------|
| backend | TASK-P3b | Nu | Delegerat |
| tvos | TASK-P3c | Eftar P3b | Delegerat |
| ios-host | TASK-P3d | Eftar P3b | Delegerat |
| web | TASK-P3e | Eftar P3b | Delegerat |

---

**END**
