# i18n Review -- Tripto

Granskning av alla user-facing strings i kodebasen.  Radnummer är verifierade mot
käll-filerna den 2026-02-05.

---

## Sammanfattning

| Client | Antal flaggar |
|--------|--------------|
| web-player | 55 |
| tvos | 25 |
| ios-host | 32 |
| backend | 22 |
| **Totalt** | **134** |

---

## Flaggar

| # | File | Line | Engelska text | Rekommenderad svenska | Kategori |
|---|------|------|---------------|----------------------|----------|
| 1 | `apps/web-player/src/components/AnswerForm.tsx` | 20 | You pulled the brake! | Du drog bromsen! | STATUS |
| 2 | `apps/web-player/src/components/AnswerForm.tsx` | 22 | What is the destination? | Vad är destinationen? | UI_LABEL |
| 3 | `apps/web-player/src/components/AnswerForm.tsx` | 34 | Submitting... | Skickar... | STATUS |
| 4 | `apps/web-player/src/components/AnswerForm.tsx` | 34 | Submit Answer | Skicka svar | BUTTON |
| 5 | `apps/web-player/src/components/BrakeButton.tsx` | 11 | BRAKE | BROMS | BUTTON |
| 6 | `apps/web-player/src/components/ClueDisplay.tsx` | 12 | {points} points | {points} poäng | UI_LABEL |
| 7 | `apps/web-player/src/components/PlayerList.tsx` | 16 | Players ({count}) | Spelare ({count}) | HEADING |
| 8 | `apps/web-player/src/components/PlayerList.tsx` | 22 | (connected) | (ansluten) | STATUS |
| 9 | `apps/web-player/src/components/PlayerList.tsx` | 22 | (disconnected) | (frånkopplad) | STATUS |
| 10 | `apps/web-player/src/components/Scoreboard.tsx` | 17 | Scoreboard | Poängtabell | HEADING |
| 11 | `apps/web-player/src/components/Scoreboard.tsx` | 22 | {score} points | {score} poäng | UI_LABEL |
| 12 | `apps/web-player/src/pages/LobbyPage.tsx` | 80 | Lobby | Lobbyn | HEADING |
| 13 | `apps/web-player/src/pages/LobbyPage.tsx` | 86 | Connected | Ansluten | STATUS |
| 14 | `apps/web-player/src/pages/LobbyPage.tsx` | 88 | Connecting... | Ansluter... | STATUS |
| 15 | `apps/web-player/src/pages/LobbyPage.tsx` | 94 | Join code: | Anslut-kod: | UI_LABEL |
| 16 | `apps/web-player/src/pages/LobbyPage.tsx` | 112 | Waiting for host to start game... | Väntar på att värd startar spelet... | STATUS |
| 17 | `apps/web-player/src/pages/LobbyPage.tsx` | 116 | Leave game | Lämna spelet | BUTTON |
| 18 | `apps/web-player/src/pages/GamePage.tsx` | 57 | Connected | Ansluten | STATUS |
| 19 | `apps/web-player/src/pages/GamePage.tsx` | 59 | Reconnecting... | Återansluter... | STATUS |
| 20 | `apps/web-player/src/pages/GamePage.tsx` | 125 | Waiting for next clue... | Väntar på nästa ledtråd... | STATUS |
| 21 | `apps/web-player/src/pages/GamePage.tsx` | 262 | Someone else was faster! | Någon annan var snabbaste! | TOAST |
| 22 | `apps/web-player/src/pages/GamePage.tsx` | 263 | Game is already paused. | Spelet är redan pausat. | TOAST |
| 23 | `apps/web-player/src/pages/GamePage.tsx` | 264 | Wait before trying again. | Vänta innan du försöker igen. | TOAST |
| 24 | `apps/web-player/src/pages/GamePage.tsx` | 265 | Cannot brake right now. | Kan inte bromsa just nu. | TOAST |
| 25 | `apps/web-player/src/pages/GamePage.tsx` | 267 | Brake rejected. | Broms avvisad. | TOAST |
| 26 | `apps/web-player/src/pages/GamePage.tsx` | 389 | Connected | Ansluten | STATUS |
| 27 | `apps/web-player/src/pages/GamePage.tsx` | 391 | Reconnecting... | Återansluter... | STATUS |
| 28 | `apps/web-player/src/pages/GamePage.tsx` | 398 | Waiting for next clue... | Väntar på nästa ledtråd... | STATUS |
| 29 | `apps/web-player/src/pages/GamePage.tsx` | 412 | Your answer is locked at {X} points | Ditt svar är låst på {X} poäng | STATUS |
| 30 | `apps/web-player/src/pages/GamePage.tsx` | 423 | Your answer is locked at {X} points | Ditt svar är låst på {X} poäng | STATUS |
| 31 | `apps/web-player/src/pages/GamePage.tsx` | 430 | {name} pulled the brake! | {name} drog bromsen! | STATUS |
| 32 | `apps/web-player/src/pages/GamePage.tsx` | 438 | {N} answer(s) locked this round | {N} svar låst i denna omgång | STATUS |
| 33 | `apps/web-player/src/pages/RevealPage.tsx` | 109 | Connected | Ansluten | STATUS |
| 34 | `apps/web-player/src/pages/RevealPage.tsx` | 111 | Reconnecting... | Återansluter... | STATUS |
| 35 | `apps/web-player/src/pages/RevealPage.tsx` | 117 | It was... | Det var... | HEADING |
| 36 | `apps/web-player/src/pages/RevealPage.tsx` | 122 | Revealing destination... | Avslöjar destinationen... | STATUS |
| 37 | `apps/web-player/src/pages/RevealPage.tsx` | 128 | Your answer: | Ditt svar: | UI_LABEL |
| 38 | `apps/web-player/src/pages/RevealPage.tsx` | 130 | Correct! | Rätt! | STATUS |
| 39 | `apps/web-player/src/pages/RevealPage.tsx` | 130 | Incorrect | Fel | STATUS |
| 40 | `apps/web-player/src/pages/RevealPage.tsx` | 130 | +{N} points (locked at {X}) | +{N} poäng (låst på {X}) | UI_LABEL |
| 41 | `apps/web-player/src/pages/RevealPage.tsx` | 141 | Game complete! | Spelet klart! | HEADING |
| 42 | `apps/web-player/src/App.tsx` | 64 | Leave game | Lämna spelet | BUTTON |
| 43 | `apps/web-player/src/App.tsx` | 69 | Restoring session... | Återställer session... | STATUS |
| 44 | `apps/web-player/src/App.tsx` | 69 | Reconnecting... | Återansluter... | STATUS |
| 45 | `apps/web-player/src/App.tsx` | 71 | Leave game | Lämna spelet | BUTTON |
| 46 | `apps/web-player/src/hooks/useWebSocket.ts` | 115 | Connection error occurred | Anslutningsfel uppkom | ERROR_MSG |
| 47 | `apps/web-player/src/hooks/useWebSocket.ts` | 132 | Invalid token. Please rejoin the game. | Ogiltigt token. Hoppa in i spelet igen. | ERROR_MSG |
| 48 | `apps/web-player/src/hooks/useWebSocket.ts` | 133 | Session token expired. Please rejoin the game. | Session-token förfallit. Hoppa in i spelet igen. | ERROR_MSG |
| 49 | `apps/web-player/src/hooks/useWebSocket.ts` | 134 | Session not found. Please rejoin the game. | Session hittades inte. Hoppa in i spelet igen. | ERROR_MSG |
| 50 | `apps/web-player/src/hooks/useWebSocket.ts` | 136 | Authentication error. | Autentiseringsfel. | ERROR_MSG |
| 51 | `apps/web-player/src/hooks/useWebSocket.ts` | 153 | Connection lost. Please refresh the page. | Anslutningen förlorad. Ladda om sidan. | ERROR_MSG |
| 52 | `apps/web-player/src/hooks/useWebSocket.ts` | 158 | Failed to connect to server | Misslyckades att ansluta till server | ERROR_MSG |
| 53 | `apps/web-player/src/services/api.ts` | 32 | Session not found. Please check the join code. | Session hittades inte. Kontolla anslut-koden. | ERROR_MSG |
| 54 | `apps/web-player/src/services/api.ts` | 34 | Failed to lookup session: {statusText} | Misslyckades att söka session: {statusText} | ERROR_MSG |
| 55 | `apps/web-player/src/services/api.ts` | 55 | Failed to join session | Misslyckades att hoppa in i session | ERROR_MSG |
| 56 | `apps/tvos/Sources/PaSparetTV/App.swift` | 102 | Starting… | Startar… | STATUS |
| 57 | `apps/tvos/Sources/PaSparetTV/App.swift` | 112 | Retry | Försök igen | BUTTON |
| 58 | `apps/tvos/Sources/PaSparetTV/App.swift` | 148 | Reconnecting… | Återansluter… | STATUS |
| 59 | `apps/tvos/Sources/PaSparetTV/App.swift` | 148 | Connecting… | Ansluter… | STATUS |
| 60 | `apps/tvos/Sources/PaSparetTV/App.swift` | 199 | Scan to join | Skanna för att hoppa in | UI_LABEL |
| 61 | `apps/tvos/Sources/PaSparetTV/App.swift` | 209 | Players | Spelare | HEADING |
| 62 | `apps/tvos/Sources/PaSparetTV/App.swift` | 223 | No players yet… | Inga spelare hittills… | STATUS |
| 63 | `apps/tvos/Sources/PaSparetTV/App.swift` | 235 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 64 | `apps/tvos/Sources/PaSparetTV/App.swift` | 287 | Phase: | Fas: | UI_LABEL |
| 65 | `apps/tvos/Sources/PaSparetTV/App.swift` | 298 | {N} pts | {N} p | UI_LABEL |
| 66 | `apps/tvos/Sources/PaSparetTV/App.swift` | 301 | Players: {names} | Spelare: {names} | UI_LABEL |
| 67 | `apps/tvos/Sources/PaSparetTV/App.swift` | 313 | ● Connected | ● Ansluten | STATUS |
| 68 | `apps/tvos/Sources/PaSparetTV/App.swift` | 313 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 69 | `apps/tvos/Sources/PaSparetTV/TVClueView.swift` | 78 | Waiting for clue… | Väntar på ledtråd… | STATUS |
| 70 | `apps/tvos/Sources/PaSparetTV/TVClueView.swift` | 99 | ● {name} pulled the brake! | ● {name} drog bromsen! | STATUS |
| 71 | `apps/tvos/Sources/PaSparetTV/TVClueView.swift` | 112 | {N} / {Y} players locked | {N} / {Y} spelare låsta | STATUS |
| 72 | `apps/tvos/Sources/PaSparetTV/TVClueView.swift` | 120 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 73 | `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` | 35 | Results | Resultat | HEADING |
| 74 | `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` | 40 | No results yet… | Inga resultat hittills… | STATUS |
| 75 | `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` | 59 | Scoreboard | Poängtabell | HEADING |
| 76 | `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` | 64 | No scores yet… | Inga poäng hittills… | STATUS |
| 77 | `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` | 81 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 78 | `apps/tvos/Sources/PaSparetTV/TVRevealView.swift` | 32 | The destination is… | Destinationen är… | HEADING |
| 79 | `apps/tvos/Sources/PaSparetTV/TVRevealView.swift` | 53 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 80 | `apps/tvos/Sources/PaSparetTV/TVFollowupView.swift` | 72 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 81 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 63 | Host | Värd | UI_LABEL |
| 82 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 67 | Create Game | Skapa spel | BUTTON |
| 83 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 117 | Connecting… | Ansluter… | STATUS |
| 84 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 117 | Reconnecting… | Återansluter… | STATUS |
| 85 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 146 | Scan to join | Skanna för att hoppa in | UI_LABEL |
| 86 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 155 | Players ({count}) | Spelare ({count}) | HEADING |
| 87 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 175 | Start Game | Starta spelet | BUTTON |
| 88 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 193 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 89 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 274 | {N} pts | {N} p | UI_LABEL |
| 90 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 284 | ● Connected | ● Ansluten | STATUS |
| 91 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 284 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 92 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 291 | DESTINATION (secret) | DESTINATION (hemligt) | UI_LABEL |
| 93 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 312 | Current clue | Nuvarande ledtråd | UI_LABEL |
| 94 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 326 | ● {name} pulled the brake | ● {name} drog bromsen | STATUS |
| 95 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 338 | Locked answers ({count}) | Låsta svar ({count}) | HEADING |
| 96 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 255 | Next Clue | Nästa ledtråd | BUTTON |
| 97 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 365 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 98 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 388 | Answer: {name} | Svar: {name} | UI_LABEL |
| 99 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 435 | Results | Resultat | HEADING |
| 100 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 439 | No results yet… | Inga resultat hittills… | STATUS |
| 101 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 471 | Scoreboard | Poängtabell | HEADING |
| 102 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 475 | No scores yet… | Inga poäng hittills… | STATUS |
| 103 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 510 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 104 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 591 | ● Connected | ● Ansluten | STATUS |
| 105 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 591 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 106 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 599 | RÄTT SVAR (secret) | RÄTT SVAR (hemligt) | UI_LABEL |
| 107 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 616 | Question | Fråga | UI_LABEL |
| 108 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 632 | Options | Alternativ | UI_LABEL |
| 109 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 652 | Timer | Timer | UI_LABEL |
| 110 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 696 | Answers ({count}) | Svar ({count}) | HEADING |
| 111 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 733 | Results | Resultat | HEADING |
| 112 | `apps/ios-host/Sources/PaSparetHost/App.swift` | 759 | ○ Reconnecting… | ○ Återansluter… | STATUS |
| 113 | `services/backend/src/routes/sessions.ts` | 59 | Internal server error | Internt serverfel | ERROR_MSG |
| 114 | `services/backend/src/routes/sessions.ts` | 60 | Failed to create session | Misslyckades att skapa session | ERROR_MSG |
| 115 | `services/backend/src/routes/sessions.ts` | 77 | Validation error | Valideringsfel | ERROR_MSG |
| 116 | `services/backend/src/routes/sessions.ts` | 78 | Player name is required and must be a non-empty string | Spelarnamn krävs och måste vara en icke-tomma string | ERROR_MSG |
| 117 | `services/backend/src/routes/sessions.ts` | 84 | Validation error | Valideringsfel | ERROR_MSG |
| 118 | `services/backend/src/routes/sessions.ts` | 85 | Player name must be 50 characters or less | Spelarnamn måste vara 50 tecken eller färre | ERROR_MSG |
| 119 | `services/backend/src/routes/sessions.ts` | 91 | Validation error | Valideringsfel | ERROR_MSG |
| 120 | `services/backend/src/routes/sessions.ts` | 92 | role must be "player" or "host" | roll måste vara "spelare" eller "värd" | ERROR_MSG |
| 121 | `services/backend/src/routes/sessions.ts` | 101 | Not found | Hittades inte | ERROR_MSG |
| 122 | `services/backend/src/routes/sessions.ts` | 102 | Session not found | Session hittades inte | ERROR_MSG |
| 123 | `services/backend/src/routes/sessions.ts` | 109 | Invalid phase | Ogiltigt fas | ERROR_MSG |
| 124 | `services/backend/src/routes/sessions.ts` | 110 | Cannot join session - game has already started | Kan inte hoppa in i session — spelet har redan börjat | ERROR_MSG |
| 125 | `services/backend/src/routes/sessions.ts` | 120 | Host already taken | Värd-plats redan tagen | ERROR_MSG |
| 126 | `services/backend/src/routes/sessions.ts` | 185 | Internal server error | Internt serverfel | ERROR_MSG |
| 127 | `services/backend/src/routes/sessions.ts` | 186 | Failed to join session | Misslyckades att hoppa in i session | ERROR_MSG |
| 128 | `services/backend/src/routes/sessions.ts` | 204 | Session not found | Session hittades inte | ERROR_MSG |
| 129 | `services/backend/src/routes/sessions.ts` | 229 | Internal server error | Internt serverfel | ERROR_MSG |
| 130 | `services/backend/src/routes/sessions.ts` | 230 | Failed to join session as TV | Misslyckades att hoppa in som TV | ERROR_MSG |
| 131 | `services/backend/src/routes/sessions.ts` | 246 | Session not found with that join code | Session hittades inte med den anslut-koden | ERROR_MSG |
| 132 | `services/backend/src/routes/sessions.ts` | 261 | Internal server error | Internt serverfel | ERROR_MSG |
| 133 | `services/backend/src/routes/sessions.ts` | 262 | Failed to retrieve session | Misslyckades att hämta session | ERROR_MSG |
| 134 | `services/backend/src/game/tts-prefetch.ts` | 157 | Alright, frågan blir: {q} | Hej, frågan blir: {q} | STATUS |

---

## Noter och kommentarar

### Speciell anmärkning: "Timer" (flag #109)

"Timer" är ett lån som allmänt accepteras i svenska gälla UI-sammanhang.  Flaggad för
konsistens men kan med god anledning behållas som-is.  Alternativ: "Nedräkning".

### Strings som är ALREADY svenska -- inte flaggade

Flertalet strings i appen är brukliga svenska och behöver inte ändras.  Urval:

- `JoinPage.tsx`: "Skriv in join-koden", "Skriv in ditt namn", "Hoppar in…", "Hoppa in!",
  "Vem är du?", "Gå med som spelare", "Gå med som värd", "Styrden spelets gång", "Join-kod",
  "Ditt namn", "Koden är 6 tecken", "Spel:", "Misslyckades att hoppa in" (rad 59, 93).
- `LobbyPage.tsx`: "Värd:", "Start spelet" (rad 108).
- `LandingPage.tsx`: Hela sidan är svenska.
- `GamePage.tsx` (HostGameView): "Fråga {N} / {Y}", "Rätt svar", "Låsta svar", "Broms",
  "Bromsat av:", "Ingen broms", "Inga svar låsta", "Nästa ledtråd", "Poäng",
  "Ingen poängtablell", "Skriv ditt svar…", "Skicka", "Svar inskickat", "Timen gick ut",
  "Rätt!", "Fel", "Rätt svar:" (alla svenska).
- `api.ts`: "En värd har redan hoppat in. Du kan hoppa in som spelare." (rad 22).
- `RoundIntroView.swift`: "Vart är vi på väg?" (svenska).
- `App.swift` (tvOS): "Värd: {host}", "Ny spel" (svenska).
- `App.swift` (iOS Host): "Tripto", "Fråga {N} / {Y}", "Rätt svar:" (rad 721), "Rätt svar"
  (rad 175 i TVFollowupView) -- svenska.
- `tts-prefetch.ts`: Alla banter-texten i BANTER_POOL, CLUE_ORDINALS och CLUE_VARIANT_B,
  plus varianter A–C i QUESTION_VARIANTS ("Frågan är:", "Nästa fråga:", "Lyssna på frågan:").

### Speciell anmärkning: tts-prefetch.ts rad 157 -- "Alright"

Variant D i QUESTION_VARIANTS (rad 157) är:

```
{ template: (q) => `Alright, frågan blir: ${q}`, slotSuffix: 1 }
```

"Alright" är engelska i ett annars svenska TTS-skript.  Texten talas högt via ElevenLabs
och når spelarna som audio.  Rekommenderad ersättning: "Hej, frågan blir: {q}" eller
"Okej, frågan blir: {q}".  (Flaggad som #134.)

### Speciell anmärkning: ios-host App.swift -- "secret" i etiketter

Två etiketter på host pro-vyn blandar svenska och engelska:

- Rad 291: `DESTINATION (secret)` -- "secret" är engelska.  Ersätt med "DESTINATION (hemligt)".
- Rad 599: `RÄTT SVAR (secret)` -- samma pattern.  Ersätt med "RÄTT SVAR (hemligt)".

Flaggade som #92 och #106.

### Speciell anmärkning: ios-host App.swift ConnectingView rad 117

Logiken är inverterad jämförelse med tvOS-varianten:

```swift
Text(state.isConnected ? "Connecting…" : "Reconnecting…")
```

När `isConnected` är `true` visas "Connecting…" och vice versa -- detta ser ut som
ett logiskt fel (jämför tvOS `App.swift` rad 148 som gör `hasEverConnected ?
"Reconnecting…" : "Connecting…"`).  Flaggad ändå för svenska (#83/#84) men notera att
logiken dessutom bör granskas.

### Strings som INTE flaggades (enligt regler)

- Alla event-type strings: `BRAKE_PULL`, `HOST_START_GAME`, `STATE_SNAPSHOT`, `LOBBY_UPDATED`,
  `CLUE_PRESENT`, `BRAKE_REJECTED`, `BRAKE_ACCEPTED`, `BRAKE_ANSWER_LOCKED`,
  `BRAKE_ANSWER_SUBMIT`, `DESTINATION_REVEAL`, `DESTINATION_RESULTS`, `SCOREBOARD_UPDATE`,
  `FOLLOWUP_ANSWER_SUBMIT`, `FOLLOWUP_RESULTS`, `HOST_NEXT_CLUE`, `WELCOME` m.m.
- Alla `console.log` / `logger.info` / `logger.warn` / `logger.error` meddelanden.
- HTTP Content-Type headers.
- Variabelnamn, funktionsnamn, CSS class-names.
- Alla kommentarer i kod.
- JSON-nycklar / fältnamn (sessionId, playerId, answerText, etc.).
- Fas-strings som är interna state-machine tokens: "LOBBY", "CLUE_LEVEL", "PAUSED_FOR_BRAKE",
  "FOLLOWUP_QUESTION", "REVEAL_DESTINATION", "SCOREBOARD", "ROUND_END", "FINAL_RESULTS",
  "PREPARING_ROUND", "ROUND_INTRO".
- `reason`-fält i BRAKE_REJECTED payload: `too_late`, `already_paused`, `rate_limited`,
  `invalid_phase` -- interna enum-värden (deras user-facing mappning är flaggad som #21–25).
