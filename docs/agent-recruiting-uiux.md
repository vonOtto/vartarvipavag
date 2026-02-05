# Agent Recruiting — UI/UX Designers (web-designer / tvos-designer)

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: CLAUDE.md ownership map, docs/agent-recruiting.md (precedent),
apps/web-player/src/, apps/tvos/Sources/, contracts/events.schema.json,
docs/sprint-1_2.md

---

## 1. web-designer

### ROLL
UX-specialist och design-ägare for web-player (apps/web-player/).
Ansvar for att alla spelare-facing skärmar (join, lobby, spel, brake,
followup, reveal) är funktionellt riktiga och upplevs sammanhängande.

### SYFTE
Web-player är den primära spelare-ytan — alla deltagare spelar via PWA.
Nuvarande UI är funktionellt men saknar polish: layouten på followup-resultat
visas inte alls (fqResult overlay försvinner direkt när nästa fråga startar),
brake-feedback är minimal, och det saknas design-guidelines som kan delas
med tvos-designer. web-designer äger det faktiska CSS + komponent-arbetet
och producerar en kondenserad design-spec som tvos-designer synkar mot.

### KERNKOMPETENSER
- React / TailwindCSS (eller befintlig CSS-structure i web-player).
- Mobile-first responsive design (PWA på telefon).
- Upplevd spelflow: vet hur timing + feedback gör eller bryter immersion.
- Kommunikation: kan skriva kondenserad design-spec (not wireframes) som
  en annan agent kan konsumera.

### SAMARBETAR MED
- tvos-designer — delar design-decisions via docs/design-decisions.md
  (skapad av web-designer). Alla visuella beslut (farger, typografi-
  hierarki, resultat-layout) måste vara konsistenta mellan web och TV.
- web (web-agent) — agar apps/web-player/. web-designer skriver CSS +
  komponent-ändring; web-agent reviewar och mergar.
- backend — konsumerar event-payload som-is; web-designer ändrar INTE
  contracts/ eller event-shape.

### PRIORITET
Medium. Blockar inte spelläget men blockar polish-sprint och P3-overlay
på web-sidan.

### Scope
1. Designa och implementera followup-result-overlay på web (P3, web-sidan).
2. Designa destination-reveal + scoreboard-paus-skärm (P2, web-sidan).
3. Produceera docs/design-decisions.md med kondenserad design-spec.

### Input
- apps/web-player/src/pages/GamePage.tsx — befintlig followup + brake UI.
- apps/web-player/src/pages/RevealPage.tsx — befintlig reveal-skärm.
- docs/followup-flow.md — flödes-spec.
- contracts/events.schema.json — event-payload (läser, ändrar inte).

### Output
- Ändring i apps/web-player/src/ (CSS + komponent-logik for overlay +
  paus-skärm).
- docs/design-decisions.md — design-spec som tvos-designer synkar mot.

### Första konkreta uppgift
1. Las GamePage.tsx och RevealPage.tsx.
2. Identifiera var fqResult-overlay försvinner och varfor (timing vs
   event-order).
3. Skapa docs/design-decisions.md med:
   - Overlay-duration (föreslå 3-4 s).
   - Layout: rätt svar + per-spelare rad (matcha TVFollowupView.swift
     ResultsOverlay-structuren).
   - Destination-reveal paus-skärm: vad som visas, i vilken order.
4. Implementera overlay-CSS + conditional render i GamePage.tsx.

---

## 2. tvos-designer

### ROLL
UX-specialist och design-ägare for tvOS-appen (apps/tvos/).
Ansvar for att TV-skärman (storbild, 1080p+) visar rätt information vid
rätt tillfälle med rätt visuell hierarki.

### SYFTE
TV-skärman är den gemensamma referenspunkten for alla spelare i rummet.
Nuvarande tvOS-UI fungerar men har brister:
- Followup-resultat (ResultsOverlay) visas men försvinner direkt när
  nästa FOLLOWUP_QUESTION_PRESENT anländer — ingen paus.
- Det saknas en destination-reveal + scoreboard-paus-skärm innan
  followup-sekvensen börjar.
- Visuell hierarki på resultat-skärmar kan stärkas (TV-avstånd).
tvos-designer synkar sina beslut mot docs/design-decisions.md som
web-designer producerar.

### SYFTE
Säkerställa att TV-upplevelsen matchar web-besluten och att all
information är läsbar på TV-avstånd (3-4 meters).

### KERNKOMPETENSER
- SwiftUI, tvOS-specifikt (remote-navigation, fokus-model, stora text).
- TV-distance design: hierarki, kontrast, fontstorlekar.
- Timing och animation på TV (subtlare, längre, than mobil).
- Konsumera design-spec från en annan agent och implementera.

### SAMARBETAR MED
- web-designer — konsumerar docs/design-decisions.md. Alla visuella
  beslut synkas.
- tvos (tvos-agent) — agar apps/tvos/. tvos-designer skriver SwiftUI;
  tvos-agent reviewar och mergar.
- backend — konsumerar event-payload som-is; tvos-designer ändrar INTE
  contracts/.

### PRIORITET
Medium. Blockar inte spelläget men blockar polish-sprint och P2/P3
TV-sidan.

### Scope
1. Implementera followup-result-paus på TV (P3, tvOS-sidan): visa
   ResultsOverlay i X sekunder innan nästa fråga visas.
2. Implementera destination-reveal + scoreboard-paus-skärm (P2, tvOS-sidan):
   ny vy som visas mellan level-2-reveal och första followup.
3. Verifierar mot docs/design-decisions.md att layout och timing matchar web.

### Input
- apps/tvos/Sources/PaSparetTV/TVFollowupView.swift — befintlig
  ResultsOverlay.
- apps/tvos/Sources/PaSparetTV/TVRevealView.swift — befintlig reveal-vy.
- apps/tvos/Sources/PaSparetTV/AppState.swift — state-container.
- docs/design-decisions.md — design-spec (producerad av web-designer).
- contracts/events.schema.json — event-payload (läser, ändrar inte).

### Output
- Ändring i apps/tvos/Sources/ (SwiftUI-vyer for paus-overlay +
  destination-reveal-paus).
- Kommentar i docs/design-decisions.md med eventuella TV-specifiska
  avvikar (t.ex. längre paus-duration for TV-avstånd).

### Första konkreta uppgift
1. Las docs/design-decisions.md (vänta på web-designer eller arbeta
   parallellt med preliminär spec).
2. Las TVFollowupView.swift och identifiera at ResultsOverlay försvinner
   direkt vid nästa FOLLOWUP_QUESTION_PRESENT.
3. Implementera timed-overlay: visa ResultsOverlay i (design-decisions.md
   specificerad) sekunder innan phase skippar till nästa fråga.
4. Skapa placeholder-vy for destination-reveal-paus (redo for P2-backend-
   integration).

---

## 3. Collaboration Map

```
docs/design-decisions.md
        ^                \
        |                 v
web-designer          tvos-designer
(apps/web-player/)    (apps/tvos/)
        |                 |
        v                 v
   web-agent          tvos-agent
   (reviewer)         (reviewer)
        |                 |
        v                 v
   apps/web-player/   apps/tvos/
   (merged code)      (merged code)
```

Flödet:
1. web-designer skapar docs/design-decisions.md med kondenserad spec.
2. tvos-designer läser spec och implementera TV-equivalent.
3. Vid visuella beslut som inte matchar (t.ex. paus-duration) skriver
   tvos-designer kommentar i design-decisions.md — web-designer
   reviewar och godkänner.
4. Varken designer ändrar contracts/ eller event-shape unilateralt.

---

## 4. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| apps/web-player/src/pages/GamePage.tsx | web-designer | Followup-overlay + destination-paus |
| apps/web-player/src/pages/RevealPage.tsx | web-designer | Destination-reveal-paus-skärm |
| apps/tvos/Sources/PaSparetTV/TVFollowupView.swift | tvos-designer | ResultsOverlay-timing |
| apps/tvos/Sources/PaSparetTV/TVRevealView.swift | tvos-designer | Destination-reveal-paus-vy |
| apps/tvos/Sources/PaSparetTV/AppState.swift | tvos-designer (läser) | State-container for phase-transitions |
| docs/design-decisions.md | web-designer (skapar), tvos-designer (konsumerar + kommenterar) | Shared design-spec |

---

## 5. Rekrytering — formellt

### web-designer
ROLL: UX-specialist och design-ägare for web-player (apps/web-player/).
SYFTE: Leverera polish på spelare-facing skärmar och producera kondenserad
design-spec som tvos-designer synkar mot.
KERNKOMPETENSER: React, mobile-first CSS, spelflow-timing, design-kommunikation.
SAMARBETAR MED: tvos-designer (design-spec), web-agent (reviewer), backend (läser events).
PRIORITET: Medium.

### tvos-designer
ROLL: UX-specialist och design-ägare for tvOS (apps/tvos/).
SYFTE: Säkerställa att TV-upplevelsen matchar web-besluten och är läsbar
på TV-avstånd.
KERNKOMPETENSER: SwiftUI, tvOS-remote-navigation, TV-distance design, design-spec-konsumering.
SAMARBETAR MED: web-designer (design-spec), tvos-agent (reviewer), backend (läser events).
PRIORITET: Medium.

---

**END OF DOCUMENT**
