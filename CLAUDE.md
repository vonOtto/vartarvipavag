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
