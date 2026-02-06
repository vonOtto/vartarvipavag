# Delegation: tvOS App UI/UX Redesign — Big Screen Game Show Experience

**Date:** 2026-02-05
**From:** CEO agent
**To:** tvOS-designer agent (subagent_type: tvos)
**Context:** Nuvarande tvOS-app är funktionell men känns inte som en professionell TV game show. Vi vill ha mer animationer, bättre färger, bättre typografi och levande scoreboard — synkat med web-player redesign.

---

## Scope

tvOS-designer ska göra en STOR redesign av `/Users/oskar/pa-sparet-party/apps/tvos/` för att skapa en storbild TV game-show-känsla:

### Mål

1. **Mer animationer:** Transitions, fade-ins, clue-reveal animations (fade-in, not instant pop)
2. **Bättre färgpalette:** Mer kontrast, mer "TV-show", tydligare hierarki (synkat med web)
3. **Bättre typografi:** Game-show-font (bold, punchy), TV-specific scaling (större text, mer luft, mer kontrast för 3-4 meters avstånd)
4. **Levande scoreboard:** Rank-change animations, highlight på vinnarposition, smooth transitions
5. **Clue-reveal animations:** Fade-in när nya ledtrådar presenteras (inte instant pop)
6. **TV-specific:** Större text, mer luft, mer kontrast (läsbarhet på 3-4 meters avstånd)

### Deliverables

1. **Design spec:** `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md` — dokumentera alla design-beslut (färger, typografi, animations, TV-specific deviations från web)
2. **Implementation:** Uppdatera tvOS SwiftUI views för att implementera redesignen
3. **Sync med web:** Läs `/Users/oskar/pa-sparet-party/docs/design-decisions.md` (uppdaterad av web-designer) och matcha färger/typografi/animations

---

## Input Material

tvOS-designer ska läsa följande filer INNAN redesign:

1. **Web redesign spec:** `/Users/oskar/pa-sparet-party/docs/web-redesign-spec.md` — web-designers nya design (färger, typografi, animations) som tvOS ska matcha
2. **Design decisions:** `/Users/oskar/pa-sparet-party/docs/design-decisions.md` — shared design-tokens mellan web och tvOS
3. **tvOS source:** `/Users/oskar/pa-sparet-party/apps/tvos/PaSparet/` — current implementation (ContentView.swift, GameView.swift, etc.)
4. **Blueprint:** `/Users/oskar/pa-sparet-party/docs/blueprint.md` — game flow och TV-specific requirements (12.1-12.5)
5. **Contracts:** `/Users/oskar/pa-sparet-party/contracts/events.schema.json` och `/Users/oskar/pa-sparet-party/contracts/projections.md` — event/state shapes som UI renderar

---

## Design Principles (TV Game Show Style)

### 1. Animationer (TV-Specific)

**Nuvarande:** Minimal transitions, instant state-changes
**Mål:** Smooth transitions mellan states, levande UI som reagerar på events — MEN långsammare än web (TV-viewers behöver mer tid att processa)

**Konkreta förbättringar:**

- **Clue fade-in:** När nya clues visas, använd fade-in animation (0.8-1.0s, långsammare än web 0.6s)
- **Scoreboard transitions:** När poäng uppdateras, använd smooth slide/reorder animation (0.5-0.6s)
- **Reveal animation:** När destination revealed, fade-in destination name + country (1.0s)
- **Confetti/particles:** Vid FINAL_RESULTS (UI_EFFECT_TRIGGER confetti), använd SKEmitterNode eller Lottie

**SwiftUI exempel (referens):**

```swift
// Clue fade-in
.opacity(clueText.isEmpty ? 0 : 1)
.animation(.easeOut(duration: 0.8), value: clueText)

// Scoreboard reorder
.animation(.easeInOut(duration: 0.5), value: scoreboard)

// Confetti trigger
if showConfetti {
    ConfettiView()
        .transition(.opacity)
        .animation(.easeIn(duration: 0.3))
}
```

### 2. Färgpalette (Synkat med Web)

**Nuvarande:** Dark blue/purple, functional but not punchy
**Mål:** Matcha web-redesign färger MEN med högre kontrast för TV-läsbarhet

**Synk-regel:** Läs web-redesign-spec.md för färgpalette, använd SAMMA färger men:

- **Högre kontrast:** Text ska vara minst 7:1 contrast ratio mot bakgrund (WCAG AAA)
- **Större glow:** Box-shadows ska vara större på TV (viewers sitter längre bort)
- **Gradient backgrounds:** Använd samma gradient som web men gör den mer synlig (högre opacity)

**Exempel palette (synkat med web):**

```swift
extension Color {
    // Backgrounds (from web redesign)
    static let bgPrimary = Color(red: 10/255, green: 10/255, blue: 20/255)
    static let bgCard = Color(red: 30/255, green: 30/255, blue: 46/255).opacity(0.9)

    // Accents (from web redesign)
    static let accentBlue = Color(red: 100/255, green: 108/255, blue: 255/255)
    static let successGreen = Color(red: 74/255, green: 222/255, blue: 128/255)
    static let errorRed = Color(red: 255/255, green: 69/255, blue: 58/255)

    // TV-specific: higher contrast variants
    static let accentBlueBright = Color(red: 120/255, green: 128/255, blue: 255/255)
    static let successGreenBright = Color(red: 94/255, green: 242/255, blue: 148/255)
}
```

### 3. Typografi (TV-Specific Scaling)

**Nuvarande:** System font, functional but not exciting
**Mål:** Game-show-font med TV-specific scaling — större text, mer luft, mer kontrast

**Synk-regel:** Läs web-redesign-spec.md för typografi-stack (t.ex. Montserrat + Inter), använd SAMMA fonts men:

- **36 pt per rem:** Web rem values mappas till tvOS point sizes vid ~36 pt per rem
- **Större headings:** Web 2.5rem -> tvOS 90 pt (för 1920x1080 TV)
- **Mer luft:** Line-height ska vara minst 1.4 (web kan vara 1.2)
- **Bold weights:** Använd .bold eller .heavy för all viktig text (viewers sitter långt bort)

**Exempel typografi-stack (synkat med web):**

```swift
extension Font {
    // Montserrat-inspired (system heavy/black weights)
    static let gameShowHeading = Font.system(size: 90, weight: .black, design: .rounded)
    static let gameShowSubheading = Font.system(size: 64, weight: .heavy, design: .rounded)

    // Inter-inspired (system regular/semibold)
    static let gameShowBody = Font.system(size: 32, weight: .regular, design: .default)
    static let gameShowLabel = Font.system(size: 26, weight: .light, design: .default)

    // Clue text (large, bold, center-aligned)
    static let clueText = Font.system(size: 72, weight: .bold, design: .rounded)

    // Scoreboard
    static let scoreboardName = Font.system(size: 38, weight: .semibold, design: .default)
    static let scoreboardPoints = Font.system(size: 38, weight: .bold, design: .monospaced)
}
```

**Viktigt:** Om web-designer använder Google Fonts (Montserrat, Inter), matcha INTE exakt — använd system fonts med liknande weight/design. tvOS system fonts är optimerade för TV-rendering.

### 4. Levande Scoreboard (TV-Specific)

**Nuvarande:** Static list, minimal highlighting
**Mål:** Animated rank-changes, highlight på top position, smooth transitions — MEN långsammare än web

**Konkreta förbättringar:**

- **Rank-change animation:** När spelare flyttas upp/ner, använd slide/reorder transition (0.5-0.6s, långsammare än web)
- **Top position highlight:** #1 spelare får guld-border eller gradient-background (synkat med web)
- **Points update animation:** När poäng ändras, visa +X animation (fade-in number som försvinner efter 1.5s, längre än web 1.2s)
- **Larger rows:** Scoreboard rows ska vara minst 60-80 pt tall (web är ~40-50 px)

**SwiftUI exempel:**

```swift
ForEach(scoreboard.sorted(by: { $0.points > $1.points })) { entry in
    HStack {
        Text(entry.name)
            .font(.scoreboardName)
        Spacer()
        Text("\(entry.points)")
            .font(.scoreboardPoints)
    }
    .padding()
    .frame(height: 80)
    .background(entry.rank == 1 ? Color.accentBlueBright.opacity(0.2) : Color.clear)
    .overlay(
        Rectangle()
            .fill(entry.rank == 1 ? Color.yellow : Color.clear)
            .frame(width: 6),
        alignment: .leading
    )
    .animation(.easeInOut(duration: 0.5), value: scoreboard)
}
```

### 5. Clue-Reveal Animations

**Nuvarande:** Clue text appears instantly
**Mål:** Fade-in animation när nya ledtrådar presenteras (0.8-1.0s)

**Konkreta förbättringar:**

- **Text fade-in:** När CLUE_PRESENT event arrives, fade-in clue text (0.8s)
- **Background dim:** Fade-in dark background (0.6s) före text
- **Level badge:** Fade-in level badge (10/8/6/4/2 poäng) samtidigt med text

**SwiftUI exempel:**

```swift
VStack {
    // Level badge
    Text("\(levelPoints) poäng")
        .font(.gameShowLabel)
        .foregroundColor(.accentBlueBright)
        .opacity(clueText.isEmpty ? 0 : 1)
        .animation(.easeOut(duration: 0.8), value: clueText)

    // Clue text
    Text(clueText)
        .font(.clueText)
        .multilineTextAlignment(.center)
        .padding()
        .opacity(clueText.isEmpty ? 0 : 1)
        .animation(.easeOut(duration: 0.8).delay(0.2), value: clueText)
}
.frame(maxWidth: .infinity, maxHeight: .infinity)
.background(
    Color.bgCard
        .opacity(clueText.isEmpty ? 0 : 1)
        .animation(.easeOut(duration: 0.6), value: clueText)
)
```

### 6. TV-Specific Deviations from Web

**Viktigt:** Vissa web-design-beslut fungerar INTE på TV. Dokumentera alla deviations i tvos-redesign-spec.md:

1. **Smaller glow/shadow:** Web box-shadows (0 0 20px) kan vara för subtila på TV — öka till 0 0 40px
2. **No hover states:** TV har ingen mouse, skip all hover-based animations
3. **Larger touch targets:** Om tvOS-appen har Siri Remote navigation, alla interactive elements ska vara minst 80x80 pt
4. **Higher contrast text:** Web kan använda rgba(255,255,255,0.8) för secondary text, TV behöver minst 0.9 opacity
5. **Slower animations:** TV-viewers behöver mer tid att processa — add +0.2-0.3s till alla web animation durations

---

## Output Format

### 1. Design Spec: `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md`

```markdown
# tvOS App Redesign Spec

## Färgpalette (Synkat med Web)

| Token | Value | Usage | Deviation from Web |
|-------|-------|-------|--------------------|
| bgPrimary | Color(10,10,20) | Main background | Same as web |
| accentBlueBright | Color(120,128,255) | Headings, highlights | 20% brighter than web for contrast |
| ... | ... | ... | ... |

## Typografi (TV-Specific Scaling)

| Role | Font | Size | Weight | Web Equivalent |
|------|------|------|--------|----------------|
| Heading 1 | system heavy | 90 pt | black | 2.5rem Montserrat 900 |
| ... | ... | ... | ... | ... |

## Animationer

| Element | Animation | Duration | Easing | Web Equivalent |
|---------|-----------|----------|--------|----------------|
| Clue text | fade-in | 0.8s | easeOut | 0.6s fadeIn |
| ... | ... | ... | ... | ... |

## TV-Specific Deviations

1. **Glow size:** Web 20px -> TV 40px
2. **Animation speed:** Web +0.2-0.3s for TV processing time
3. ...
```

### 2. Implementation

Uppdatera följande filer i `/Users/oskar/pa-sparet-party/apps/tvos/PaSparet/`:

- **Views/** — alla SwiftUI views (ContentView.swift, GameView.swift, ScoreboardView.swift, etc.)
- **Design/Colors.swift** (ny fil om behövs) — alla color tokens
- **Design/Fonts.swift** (ny fil om behövs) — alla font definitions
- **Design/Animations.swift** (ny fil om behövs) — shared animation configs

### 3. Sync med Web: `/Users/oskar/pa-sparet-party/docs/design-decisions.md`

Lägg till tvOS-specific deviations i design-decisions.md (under existing "tvOS deviations" section):

```markdown
## tvOS Redesign Deviations (2026-02-05)

1. **Typography scaling:** Web rem values mapped to tvOS pt at ~36 pt/rem (web 2.5rem -> tvOS 90 pt)
2. **Animation timing:** All web animations +0.2-0.3s for TV processing time
3. **Glow size:** Web box-shadow 20px -> tvOS 40px for visibility at 3-4m distance
4. ...
```

---

## Acceptance Criteria

Redesignen är klar när:

1. **Design spec skriven:** `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md` finns och dokumenterar alla design-beslut + TV-specific deviations
2. **Implementation klar:** Alla SwiftUI views uppdaterade för redesign
3. **Animationer funkar:** Clue fade-in, scoreboard transitions, reveal animations känns smooth och TV-appropriate
4. **Färgpalette synkad:** Matchar web redesign MEN med högre kontrast för TV
5. **Typografi synkad:** Matchar web redesign MEN med TV-specific scaling (36 pt/rem)
6. **Clue-reveal animated:** Fade-in animation (0.8s) när nya ledtrådar presenteras
7. **Scoreboard levande:** Rank-change animations, top-position highlight, smooth transitions
8. **TV-specific deviations dokumenterade:** design-decisions.md uppdaterad med alla deviations från web

---

## Delegations-Instruktioner

**Till:** tvOS-designer agent (subagent_type: tvos)

**Kontext:** Du är UI/UX designer för Tripto tvOS app. Nuvarande design är funktionell men känns inte som en professionell TV game show. Din uppgift är att redesigna hela tvOS-appen för att skapa en storbild TV game-show-känsla med mer animationer, bättre färger, bättre typografi och levande scoreboard — SYNKAT med web-player redesign.

**Uppgift:**

1. Läs input-filerna (web-redesign-spec.md, design-decisions.md, tvOS source, blueprint.md, contracts)
2. Matcha web-redesign färger, typografi, animationer MEN med TV-specific deviations (högre kontrast, större text, långsammare animations)
3. Implementera redesignen i tvOS SwiftUI views
4. Skriv design spec `docs/tvos-redesign-spec.md` med alla TV-specific deviations
5. Uppdatera `docs/design-decisions.md` med tvOS deviations

**Output:**

- `/Users/oskar/pa-sparet-party/docs/tvos-redesign-spec.md` (ny fil)
- Uppdaterade filer i `/Users/oskar/pa-sparet-party/apps/tvos/PaSparet/`
- Uppdaterad `/Users/oskar/pa-sparet-party/docs/design-decisions.md`

**Viktigt:**

- Fokusera på TV GAME SHOW VIBES — bold, punchy, animated, energetic — MEN läsbart på 3-4 meters avstånd
- SYNKA med web redesign — använd SAMMA färger, typografi, animationer MEN med TV-specific scaling
- Clue-reveal ska animeras (fade-in 0.8s) — inte instant pop
- Scoreboard ska kännas LEVANDE — rank-changes ska animeras, top position ska highlightas
- Dokumentera ALLA deviations från web i tvos-redesign-spec.md och design-decisions.md

---

**END OF DOCUMENT**
