# Delegation: Web Player UI/UX Redesign — Game Show Experience

**Date:** 2026-02-05
**From:** CEO agent
**To:** Web-designer agent (subagent_type: web)
**Context:** Nuvarande web-player är funktionell men känns inte som en professionell game show. Vi vill ha mer animationer, bättre färger, bättre typografi och levande scoreboard.

---

## Scope

Web-designer ska göra en STOR redesign av `/Users/oskar/pa-sparet-party/apps/web-player/` för att skapa en game-show-känsla:

### Mål

1. **Mer animationer:** Transitions, fade-ins, pulse på viktiga element (brake-button, scoreboard updates)
2. **Bättre färgpalette:** Mer kontrast, mer "TV-show", tydligare hierarki mellan viktiga/oviktiga element
3. **Bättre typografi:** Game-show-font (bold, punchy), tydlig hierarki (headings vs body vs labels)
4. **Levande scoreboard:** Highlight på vinnarposition, animationer vid rank-change, pulse på egen rad
5. **Brake-button prominence:** Pulsande animation, "HIT ME"-känsla, visuellt dominant när aktiv

### Deliverables

1. **Design spec:** `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md` — dokumentera alla design-beslut (färger, typografi, animations, transitions)
2. **Implementation:** Uppdatera web-player CSS/JSX för att implementera redesignen
3. **Sync med tvOS:** Uppdatera `/Users/oskar/pa-sparet-party/docs/design-decisions.md` med alla nya design-tokens (färger, typografi, animations) så tvOS-designer kan synka

---

## Input Material

Web-designer ska läsa följande filer INNAN redesign:

1. **Current design decisions:** `/Users/oskar/pa-sparet-party/docs/design-decisions.md` — befintliga design-tokens och beslut
2. **Web player source:** `/Users/oskar/pa-sparet-party/apps/web-player/src/` — current implementation (App.tsx, GamePage.tsx, RevealPage.tsx, styles.css)
3. **Blueprint:** `/Users/oskar/pa-sparet-party/docs/blueprint.md` — game flow och UX-principer
4. **Contracts:** `/Users/oskar/pa-sparet-party/contracts/events.schema.json` och `/Users/oskar/pa-sparet-party/contracts/projections.md` — event/state shapes som UI renderar

---

## Design Principles (Game Show Style)

### 1. Animationer

**Nuvarande:** Minimal transitions, mest instant state-changes
**Mål:** Smooth transitions mellan states, levande UI som reagerar på events

**Konkreta förbättringar:**

- **Fade-in transitions:** När nya clues visas, när scoreboard uppdateras, när reveal händer
- **Pulse/glow animations:** Brake-button när aktiv, egen scoreboard-rad när poäng ändras
- **Slide/scale transitions:** När nya frågor presenteras, när resultat visas
- **Confetti/particles:** Vid correct answer (kan vara enkel CSS animation eller canvas-based)

**CSS exempel (referens):**

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.brake-button-active {
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 69, 58, 0.6);
}

.clue-text {
  animation: fadeIn 0.6s ease-out;
}
```

### 2. Färgpalette (Game Show Vibes)

**Nuvarande:** Dark blue/purple (#12121e, #646cff), functional but not punchy
**Mål:** Mer kontrast, mer energy, tydligare accent-färger

**Föreslagna förbättringar:**

- **Primary accent:** Behåll #646cff men använd den MER (headings, highlights, active states)
- **Success green:** #4ade80 är bra, men lägg till glow/shadow för mer pop
- **Error red:** #f87171 är bra, samma treatment
- **Background gradient:** Istället för flat #12121e, använd subtle gradient (mörkblå -> svart) för djup
- **Brake-button:** Ljusare röd (#ff453a) med glow, inte flat färg

**Exempel palette:**

```css
:root {
  /* Backgrounds */
  --bg-primary: linear-gradient(135deg, #0a0a14 0%, #12121e 100%);
  --bg-card: rgba(30, 30, 46, 0.9);

  /* Accents */
  --accent-blue: #646cff;
  --accent-blue-glow: 0 0 20px rgba(100, 108, 255, 0.4);

  /* States */
  --success-green: #4ade80;
  --success-glow: 0 0 15px rgba(74, 222, 128, 0.5);
  --error-red: #ff453a;
  --error-glow: 0 0 15px rgba(255, 69, 58, 0.5);

  /* Brake button */
  --brake-active: #ff453a;
  --brake-glow: 0 0 30px rgba(255, 69, 58, 0.7);
}
```

### 3. Typografi (Bold & Punchy)

**Nuvarande:** System font, functional but not exciting
**Mål:** Game-show-font med tydlig hierarki

**Föreslagna förbättringar:**

- **Headings:** Stort, bold, kontrastig font (t.ex. "Montserrat ExtraBold" eller "Oswald Bold")
- **Body text:** Lättläst sans-serif (t.ex. "Inter" eller "Open Sans")
- **Labels/metadata:** Mindre, lighter weight (t.ex. "Inter Light")
- **Clue text:** Stor, bold, center-aligned för drama
- **Scoreboard:** Monospace för poäng (tabular-nums), bold för names

**Exempel typografi-stack:**

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@300;400;600&display=swap');

:root {
  --font-heading: 'Montserrat', sans-serif;
  --font-body: 'Inter', sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: 900;
  letter-spacing: -0.02em;
}

body, p, span {
  font-family: var(--font-body);
  font-weight: 400;
}

.clue-text {
  font-family: var(--font-heading);
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
}

.scoreboard-points {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
```

### 4. Levande Scoreboard

**Nuvarande:** Static list, minimal highlighting för egen spelare
**Mål:** Animated rank-changes, highlight på top position, pulse på updates

**Konkreta förbättringar:**

- **Rank-change animation:** När spelare flyttas upp/ner, använd slide/reorder transition (CSS grid/flexbox med transition: all 0.3s)
- **Top position highlight:** #1 spelare får guld-border eller gradient-background
- **Own player highlight:** Redan bra med border-left, men lägg till subtle pulse när poäng ändras
- **Points update animation:** När poäng ändras, visa +X animation (fade-in number som försvinner efter 1s)

**Exempel scoreboard animation:**

```css
.scoreboard-row {
  transition: all 0.4s ease-out;
}

.scoreboard-row.rank-1 {
  background: linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(100,108,255,0.1) 100%);
  border-left: 4px solid gold;
}

.scoreboard-row.my-entry {
  border-left: 3px solid var(--accent-blue);
  background: rgba(100,108,255,0.15);
}

.scoreboard-row.my-entry.updated {
  animation: pulse 0.8s ease-out;
}

.points-delta {
  position: absolute;
  right: 10px;
  top: -20px;
  color: var(--success-green);
  font-weight: 700;
  animation: fadeOutUp 1.2s ease-out forwards;
}

@keyframes fadeOutUp {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
}
```

### 5. Brake-Button Prominence

**Nuvarande:** Functional button, röd färg, men inte super dominant
**Mål:** PULSANDE, GLOWING, "HIT ME"-känsla när aktiv

**Konkreta förbättringar:**

- **Större size:** När aktiv, ska den ta upp minst 30-40% av viewport (mobilskärm)
- **Pulsande animation:** Continuous pulse (scale + glow) när aktiv
- **Glow effect:** Box-shadow med röd glow (0 0 30px rgba(255, 69, 58, 0.7))
- **Tactile feel:** Active state (on press) ska ha haptic-like visual feedback (scale down 0.95)
- **Disabled state:** När inte aktiv, subtle grey med no glow

**Exempel brake-button:**

```css
.brake-button {
  width: 80%;
  max-width: 400px;
  height: 120px;
  font-size: 2rem;
  font-weight: 900;
  border-radius: 16px;
  border: 4px solid transparent;
  transition: all 0.2s ease-out;
}

.brake-button.active {
  background: var(--brake-active);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: var(--brake-glow);
  animation: pulse 1.5s ease-in-out infinite;
}

.brake-button.active:active {
  transform: scale(0.95);
  box-shadow: 0 0 40px rgba(255, 69, 58, 0.9);
}

.brake-button.disabled {
  background: rgba(100, 100, 120, 0.3);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
}
```

---

## Output Format

### 1. Design Spec: `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md`

```markdown
# Web Player Redesign Spec

## Färgpalette

| Token | Value | Usage |
|-------|-------|-------|
| --bg-primary | ... | Main background |
| --accent-blue | ... | Headings, highlights |
| ... | ... | ... |

## Typografi

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Heading 1 | Montserrat | 2.5rem | 900 | Page titles |
| ... | ... | ... | ... | ... |

## Animationer

| Element | Animation | Duration | Easing | Trigger |
|---------|-----------|----------|--------|---------|
| Clue text | fadeIn | 0.6s | ease-out | CLUE_PRESENT |
| ... | ... | ... | ... | ... |

## Components

### Brake Button
[Beskrivning av brake-button design + kod-exempel]

### Scoreboard
[Beskrivning av scoreboard design + kod-exempel]

### Reveal Overlay
[Beskrivning av reveal-overlay design + kod-exempel]
```

### 2. Implementation

Uppdatera följande filer i `/Users/oskar/pa-sparet-party/apps/web-player/src/`:

- **styles.css** — alla nya CSS tokens, animations, component styles
- **App.tsx** — uppdatera className-användning om behövs
- **GamePage.tsx** — brake-button animations, clue fade-ins
- **RevealPage.tsx** — scoreboard animations, reveal transitions

### 3. Sync med tvOS: `/Users/oskar/pa-sparet-party/docs/design-decisions.md`

Lägg till alla nya design-tokens i design-decisions.md så tvOS-designer kan synka:

```markdown
## Web Redesign (2026-02-05)

### Färgpalette v2

| Token | Value | Usage |
|-------|-------|-------|
| --bg-primary | linear-gradient(...) | Main background |
| --accent-blue | #646cff | Headings, highlights |
| ... | ... | ... |

### Typografi v2

| Role | Font | Size | Weight |
|------|------|------|--------|
| Heading 1 | Montserrat | 2.5rem | 900 |
| ... | ... | ... | ... |

### Animationer

| Name | CSS | Duration | Easing |
|------|-----|----------|--------|
| pulse | @keyframes pulse { ... } | 1.5s | ease-in-out |
| ... | ... | ... | ... |
```

---

## Acceptance Criteria

Redesignen är klar när:

1. **Design spec skriven:** `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md` finns och dokumenterar alla design-beslut
2. **Implementation klar:** Alla CSS/JSX ändringar implementerade i web-player
3. **Animationer funkar:** Fade-ins, pulse, transitions känns smooth och naturliga
4. **Färgpalette uppdaterad:** Mer kontrast, mer game-show-vibes
5. **Typografi uppdaterad:** Bold headings, tydlig hierarki
6. **Brake-button prominent:** Pulsande, glowing, dominant när aktiv
7. **Scoreboard levande:** Rank-change animations, top-position highlight, own-player pulse
8. **Synkad med tvOS:** design-decisions.md uppdaterad med alla nya tokens så tvOS-designer kan matcha

---

## Delegations-Instruktioner

**Till:** Web-designer agent (subagent_type: web)

**Kontext:** Du är UI/UX designer för Tripto web player. Nuvarande design är funktionell men känns inte som en professionell game show. Din uppgift är att redesigna hela web-playern för att skapa en game-show-känsla med mer animationer, bättre färger, bättre typografi och levande scoreboard.

**Uppgift:**

1. Läs input-filerna (design-decisions.md, web-player source, blueprint.md, contracts)
2. Designa ny färgpalette, typografi, animationer enligt principerna ovan
3. Implementera redesignen i web-player CSS/JSX
4. Skriv design spec `docs/web-redesign-spec.md`
5. Uppdatera `docs/design-decisions.md` med alla nya design-tokens för tvOS-sync

**Output:**

- `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md` (ny fil)
- Uppdaterade filer i `/Users/oskar/pa-sparet-party/apps/web-player/src/`
- Uppdaterad `/Users/oskar/pa-sparet-party/docs/design-decisions.md`

**Viktigt:**

- Fokusera på GAME SHOW VIBES — bold, punchy, animated, energetic
- Använd MER animationer än mindre — men håll dem smooth och naturliga (ingen jank)
- Brake-button ska kännas TACTILE och URGENT när aktiv
- Scoreboard ska kännas LEVANDE — rank-changes ska animeras, top position ska highlightas
- Synka ALLTID med tvOS via design-decisions.md — alla färger, fonts, animations ska dokumenteras

---

**END OF DOCUMENT**
