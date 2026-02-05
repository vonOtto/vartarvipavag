# Agent Recruiting — visual-content (Visual Content Designer / Motion Graphics Specialist)

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: apps/tvos/, apps/web-player/, docs/blueprint.md (game-show + travel vibes),
docs/design-decisions.md, Gemini (Google AI image/video generation)

---

## 1. Varfor en visual-content-agent

Idag har tvOS och web-player inga visuella assets: inga resebilder, inga
destination-showcase graphics, inga celebration effects, inga "resan"-videos som
ger känsla av att faktiskt resa. Game-show-estetiken och travel documentary
vibes finns enbart i UI-design (färger, typografi), men inte i själva innehållet.
En visual-content-agent gör att:

- Visuellt innehåll (bilder, videos) skapas systematiskt för varje game-phase.
- Assets är optimerade för tvOS (4K, performant filstorlekar) och web (responsive).
- Gemini prompt-bibliotek gör att assets kan genereras konsekvent och varieras
  mellan sessioner.
- tvOS/web-agenter får tydlig spec för asset-integration (filformat, naming,
  lazy-loading).

---

## 2. ROLL

**Namn**: visual-content

**Syftet**: Äga och design alla visuella assets (bilder, video-loopar) för
game-show-estetiken. Skapa Gemini prompt-bibliotek för AI-generering av assets.
Säkerställa att assets är tekniskt kompatibla (tvOS 4K, web responsive) och
integreras smidigt i apps.

---

## 3. KERNKOMPETENSER

- **Visual design**: Game-show estetik (bold colors, high-energy graphics,
  celebration effects), travel documentary vibes (cinematic landscapes,
  destination showcases, "on the road" motion graphics).
- **Motion graphics**: Looping video design (smooth loops, no jarring cuts),
  travel animations (flygplan på karta, landmarks scrolling), transitions
  (fade-in/fade-out, crossfade).
- **AI prompt engineering**: Gemini prompt-design för konsekvent stil (aspect
  ratio, color palette, mood), variation (olika destinationer, olika årstider),
  och tekniska specs (4K resolution, MP4/H.264 for video, PNG/JPG for images).
- **Asset optimization**: Förstår tvOS constraints (max filstorlek för smooth
  playback, AVPlayer performance), web constraints (lazy-loading, responsive
  images, bandwidth).
- **Documentation**: Skapar asset-katalog (vilka assets behövs per phase),
  prompt-bibliotek (hur man genererar varje asset-typ), integration-guide (hur
  tvOS/web använder assets).

---

## 4. SCOPE — vad visual-content äger

| Ansvar | Output |
|--------|--------|
| Asset-katalog spec | docs/visual-assets/asset-catalog.md (vilka bilder/videos behövs per game-phase) |
| Gemini prompt-bibliotek | docs/visual-assets/gemini-prompts.md (prompts för varje asset-typ + exempel) |
| Asset-integration guide | docs/visual-assets/integration-guide.md (hur tvOS/web använder assets: filformat, naming, lazy-loading) |
| Variation-strategi | docs/visual-assets/variation-strategy.md (hur vi roterar innehåll mellan sessioner för att undvika repetition) |
| Asset-organisation | docs/visual-assets/naming-convention.md (filnamn, mappar, versioning) |

visual-content äger BESLUTEN om vilka assets som behövs och hur de ska
genereras. tvOS/web implementerar asset-integration. Användaren genererar
faktiska assets i Gemini baserat på visual-contents prompts.

---

## 5. SAMARBETAR MED

| Agent | Anledning |
|-------|-----------|
| tvos-designer | Synkar game-show estetik (färgpalett, typografi) så att assets matchar tvOS UI-design. visual-content läser docs/tvos-redesign-spec.md för design-system. |
| web-designer | Synkar design så att assets fungerar både på TV (4K) och mobile (responsive). visual-content läser docs/web-redesign-spec.md. |
| tvos | Implementerar asset-playback (AVPlayer för video, AsyncImage för bilder) enligt integration-guide. tvos ger feedback om performance (filstorlek för stor? choppy playback?). |
| web | Implementerar asset-loading (lazy-loading, responsive images) enligt integration-guide. web ger feedback om bandwidth (filstorlek för stor för mobile?). |
| producer | Samarbetar kring "feel": ska "resan"-video vara lugn eller high-energy? Ska reveal-graphics vara dramatisk eller clean? producer äger timing, visual-content äger visuellt uttryck. |
| sound-designer | Synkar audio/visual: om "resan"-video är high-energy bör music_travel_loop också vara det. Om celebration-graphics är explosivt bör SFX också vara det. |
| ceo | Äger docs/. visual-content skapar docs/visual-assets/ där. |

---

## 6. FÖRSTA TASK — asset catalog + Gemini prompt library

### Input

1. **apps/tvos/Sources/PaSparetTV/** — tvOS app-struktur, vilka views behöver assets?
2. **apps/web-player/src/** — web-player app-struktur, vilka komponenter behöver assets?
3. **docs/tvos-redesign-spec.md** — tvOS design-system (färgpalett, typografi)
4. **docs/web-redesign-spec.md** — web design-system
5. **docs/design-decisions.md** — gemensamma design-beslut (game-show + travel vibes)
6. **docs/blueprint.md** — §8 (Visuell design), §9 (Tekniska plattformar)
7. **contracts/state.schema.json** — alla game-phases (LOBBY, CLUE_LEVEL, REVEAL_DESTINATION, FOLLOWUP_QUESTION, FINAL_RESULTS)

### Expected output

Levereras till: **docs/visual-assets/** (ny mapp)

Filstruktur:

```
docs/visual-assets/
├── asset-catalog.md          # Vilka assets behövs per phase
├── gemini-prompts.md         # Prompt-bibliotek för Gemini
├── integration-guide.md      # Hur tvOS/web använder assets
├── variation-strategy.md     # Rotation/variation mellan sessioner
└── naming-convention.md      # Filnamn, mappar, versioning
```

---

### Sektion 1: asset-catalog.md

Innehåll:

#### Phase: LOBBY (Waiting for players)

**Assets needed:**
- **lobby_welcome_bg.jpg** (4K, 3840×2160, JPG)
  - Game-show teaser graphic med bold colors
  - Text overlay area (center 50% reserved for lobby UI)
  - Mood: Inviting, high-energy, "get ready to play"
- **lobby_ambiance_loop.mp4** (1920×1080, 30fps, H.264, <10MB)
  - Subtle motion graphics (particles, light leaks, soft animations)
  - Loop: 10s, seamless loop
  - Mood: Ambient, not distracting

#### Phase: CLUE_LEVEL (Clue display + discussion)

**Assets needed:**
- **travel_motion_loop_01.mp4** to **travel_motion_loop_05.mp4** (1920×1080, 30fps, H.264, <15MB each)
  - "Resan"-video: ger känsla av att resa (flygplan på karta, landmarks scrolling, world map with travel route)
  - Loop: 15s, seamless loop
  - Mood: Cinematic travel, energetic but not overwhelming
  - Variation: 5 different loops så att varje session känns unik
- **clue_bg_subtle.jpg** (4K, 3840×2160, JPG, optional fallback if video not supported)
  - Static travel-themed background (map, compass, vintage travel poster vibes)

#### Phase: REVEAL_DESTINATION (Reveal ceremony)

**Assets needed:**
- **reveal_showcase_[destination].jpg** (4K, 3840×2160, JPG)
  - Cinematic destination showcase (t.ex. Paris: Eiffel Tower at sunset, Stockholm: Old Town aerial view)
  - High-quality, hero shot
  - Mood: "Wow, we made it!"
  - Note: Generated per destination by ai-content (using Gemini prompt from visual-content)
- **reveal_celebration_overlay.mp4** (1920×1080, 30fps, H.264, <5MB, alpha channel if possible)
  - Celebration effects (confetti, sparkles, light burst)
  - Duration: 3s, plays once (no loop)
  - Mood: Celebratory, not too intense (classy game-show celebration)

#### Phase: FOLLOWUP_QUESTION (Quiz questions)

**Assets needed:**
- **followup_bg_01.jpg** to **followup_bg_03.jpg** (4K, 3840×2160, JPG)
  - Quiz/trivia background (clean, not distracting, game-show vibes)
  - Color: Matches tvOS color palette (secondary blue, accent gold)
  - Text overlay area (center 60% reserved for question text)
  - Variation: 3 backgrounds that rotate per followup question

#### Phase: FINAL_RESULTS (Scoreboard + finale)

**Assets needed:**
- **finale_celebration_bg.jpg** (4K, 3840×2160, JPG)
  - Celebration graphic (podium, trophy, fireworks)
  - Mood: "Game over, here's the winner!"
- **finale_confetti_loop.mp4** (1920×1080, 30fps, H.264, <10MB)
  - Confetti falling (looping, 10s)
  - Mood: Festive, celebratory

---

### Sektion 2: gemini-prompts.md

Innehåll:

#### Prompt Template Structure

All prompts följer denna struktur:

```
[Asset type]: [Mood/Style]
Subject: [What to show]
Style: [Visual style keywords]
Technical: [Resolution, aspect ratio, format]
Avoid: [What NOT to include]
```

---

#### Prompt: lobby_welcome_bg.jpg

```
Game-show teaser background: High-energy, inviting
Subject: Bold geometric shapes, vibrant gradients (blue to gold), game-show stage vibes
Style: Modern, clean, minimalist, high contrast, cinematic lighting
Technical: 3840×2160 (4K), 16:9 aspect ratio, JPG format
Avoid: Text, logos, people, clutter
```

**Exempel-output**: (användaren genererar i Gemini och sparar som lobby_welcome_bg.jpg)

---

#### Prompt: travel_motion_loop_01.mp4

```
Travel motion graphics: Cinematic, energetic
Subject: Animated world map with glowing travel route, airplane icon moving along route, landmarks appearing (Eiffel Tower, Big Ben, Statue of Liberty), subtle particle effects
Style: Cinematic travel documentary, smooth animations, blue/gold color palette
Technical: 1920×1080, 30fps, 15s duration, seamless loop, MP4/H.264
Avoid: Text, logos, jarring cuts, too fast motion
```

**Variation prompts** (travel_motion_loop_02 to 05):
- Loop 02: Focus on train journey (train on tracks, countryside scrolling)
- Loop 03: Focus on road trip (car on winding road, mountains/forests scrolling)
- Loop 04: Focus on ocean voyage (ship on ocean, waves, seagulls)
- Loop 05: Focus on hot air balloon (balloon floating over landscapes, clouds)

---

#### Prompt: reveal_showcase_[destination].jpg

```
Destination showcase: Cinematic hero shot
Subject: [DESTINATION_NAME] — iconic landmark at golden hour
Style: Travel photography, cinematic, vibrant colors, high detail, professional
Technical: 3840×2160 (4K), 16:9 aspect ratio, JPG format
Avoid: People, text, logos, overprocessed HDR
```

**Example for Paris**:
```
Subject: Eiffel Tower at sunset, viewed from Trocadéro Gardens, golden light, clear sky
```

**Example for Stockholm**:
```
Subject: Stockholm Old Town (Gamla Stan) aerial view, colorful buildings, waterfront, blue sky
```

**Note**: Denna prompt körs dynamiskt av ai-content när destination genereras.

---

#### Prompt: reveal_celebration_overlay.mp4

```
Celebration overlay: Festive, classy
Subject: Confetti and sparkles falling from top of frame, light burst in center
Style: Game-show celebration, not too intense, elegant
Technical: 1920×1080, 30fps, 3s duration, alpha channel (transparent background), MP4
Avoid: Cheesy effects, too much motion blur, distracting
```

---

#### Prompt: followup_bg_01.jpg

```
Quiz background: Clean, game-show vibes
Subject: Geometric pattern (hexagons or diagonal stripes), gradient from deep blue to gold, subtle texture
Style: Modern game-show, minimalist, high contrast
Technical: 3840×2160 (4K), 16:9 aspect ratio, JPG format
Avoid: Text, logos, people, busy patterns that distract from question text
```

**Variation prompts**:
- followup_bg_02: Circle pattern, purple to teal gradient
- followup_bg_03: Wave pattern, blue to orange gradient

---

#### Prompt: finale_celebration_bg.jpg

```
Finale celebration: Victory, festive
Subject: Podium with spotlight, trophy silhouette, fireworks in background
Style: Game-show finale, dramatic, cinematic, bold colors (gold, blue, white)
Technical: 3840×2160 (4K), 16:9 aspect ratio, JPG format
Avoid: Text, logos, people, cluttered
```

---

#### Prompt: finale_confetti_loop.mp4

```
Confetti loop: Festive, continuous
Subject: Colorful confetti (gold, blue, white) falling from top, soft motion, looping seamlessly
Style: Game-show celebration, festive but not overwhelming
Technical: 1920×1080, 30fps, 10s duration, seamless loop, MP4/H.264
Avoid: Too dense confetti (should not obscure scoreboard), jarring loop point
```

---

### Sektion 3: integration-guide.md

Innehåll:

#### tvOS Integration

**Video playback (AVPlayer)**:
- **Loopar** (travel_motion_loop, finale_confetti_loop):
  - Load via AVPlayer with `.repeat` loop mode
  - Preload before phase starts to avoid stutter
  - Fade-in (300ms) when video starts, fade-out (300ms) when stopping
- **One-shot videos** (reveal_celebration_overlay):
  - Play once, no loop
  - Auto-remove from view when finished

**Image loading (AsyncImage)**:
- **Backgrounds** (lobby_welcome_bg, followup_bg, finale_celebration_bg):
  - Load via AsyncImage with placeholder (loading spinner or blur)
  - Cache images locally after first load (tvOS persistent cache)
- **Destination showcases** (reveal_showcase_[destination]):
  - Fetch URL from backend (part of destination data)
  - Load with fade-in animation (500ms)

**File paths**:
- Local assets: `Bundle.main.url(forResource: "travel_motion_loop_01", withExtension: "mp4")`
- Remote assets: Fetch URL from backend (`destination.showcaseImageUrl`)

**Performance**:
- Max video file size: 15MB (for smooth AVPlayer playback on Apple TV HD)
- Max image file size: 2MB (for fast AsyncImage loading)
- Preload next phase assets during current phase (predictive loading)

---

#### Web Integration

**Video playback (HTML5 `<video>`)**:
- **Loopar**:
  - `<video loop autoplay muted playsinline>`
  - Lazy-load with Intersection Observer (load when phase becomes visible)
- **One-shot videos**:
  - `<video autoplay muted playsinline>` (no loop)
  - Auto-hide when ended (`onended` event)

**Image loading (responsive `<img>` with srcset)**:
- **Backgrounds**:
  - Serve multiple resolutions (1920×1080 for desktop, 1280×720 for tablet, 854×480 for mobile)
  - Use `<img srcset="...">` for responsive loading
  - Lazy-load with `loading="lazy"`
- **Destination showcases**:
  - Same as backgrounds, fetch URL from backend

**File paths**:
- Local assets: `/assets/video/travel_motion_loop_01.mp4`
- Remote assets: Fetch URL from backend (`destination.showcaseImageUrl`)

**Performance**:
- Max video file size: 10MB (for mobile bandwidth)
- Max image file size: 1MB
- Use WebP format for images if supported (fallback to JPG)

---

### Sektion 4: variation-strategy.md

Innehåll:

#### Problem: Repetition fatigue

Om varje session använder samma assets (samma travel_motion_loop, samma
followup_bg) känns spelet repetitivt efter 2–3 sessioner.

#### Solution: Asset rotation

**Travel motion loops** (5 variations):
- Backend väljer slumpmässigt en av travel_motion_loop_01 till 05 per session
- Stored in session state: `visualAssets.travelLoopId: "travel_motion_loop_03"`
- tvOS/web loads correct loop based on session state

**Followup backgrounds** (3 variations):
- Backend roterar bakgrund per followup-fråga:
  - Followup 1: followup_bg_01
  - Followup 2: followup_bg_02
  - Followup 3: followup_bg_03
- Stored in followup question data: `question.backgroundId: "followup_bg_02"`

**Destination showcases** (dynamisk generering):
- ai-content genererar reveal_showcase_[destination].jpg per destination
- Cached i CDN/Redis så samma destination alltid får samma bild (konsekvens)
- Variation kommer naturligt eftersom varje destination är unik

**Lobby ambiance loop** (1 variation för v1, kan utökas senare):
- v1: En loop (lobby_ambiance_loop.mp4)
- v2 (future): Rotera mellan 3 loopar (morning vibes, evening vibes, night vibes)

---

### Sektion 5: naming-convention.md

Innehåll:

#### File naming pattern

```
[phase]_[type]_[variation].[ext]

phase: lobby | travel | reveal | followup | finale
type: bg | loop | overlay | showcase
variation: 01, 02, 03, ... (or descriptive name)
ext: jpg | mp4
```

**Examples**:
- `lobby_welcome_bg.jpg`
- `travel_motion_loop_01.mp4`
- `reveal_celebration_overlay.mp4`
- `reveal_showcase_paris.jpg`
- `followup_bg_01.jpg`
- `finale_celebration_bg.jpg`

#### Directory structure

```
assets/
├── images/
│   ├── lobby/
│   │   └── lobby_welcome_bg.jpg
│   ├── followup/
│   │   ├── followup_bg_01.jpg
│   │   ├── followup_bg_02.jpg
│   │   └── followup_bg_03.jpg
│   ├── finale/
│   │   └── finale_celebration_bg.jpg
│   └── destinations/
│       ├── reveal_showcase_paris.jpg
│       ├── reveal_showcase_stockholm.jpg
│       └── ... (generated dynamically)
└── video/
    ├── travel/
    │   ├── travel_motion_loop_01.mp4
    │   ├── travel_motion_loop_02.mp4
    │   ├── travel_motion_loop_03.mp4
    │   ├── travel_motion_loop_04.mp4
    │   └── travel_motion_loop_05.mp4
    ├── reveal/
    │   └── reveal_celebration_overlay.mp4
    └── finale/
        └── finale_confetti_loop.mp4
```

**Note**: Denna struktur gäller både lokala assets (bundled i tvOS/web) och
remote assets (CDN för dynamiska destination showcases).

#### Versioning

Om ett asset uppdateras (t.ex. travel_motion_loop_01 behöver omgenereras):
- Gamla versionen: `travel_motion_loop_01_v1.mp4`
- Nya versionen: `travel_motion_loop_01.mp4`
- Backend kan referera till specifik version om backward-compatibility behövs

---

## 7. Konkreta uppgifter (första iteration)

1. Läs apps/tvos/ och apps/web-player/ för att förstå vilka views/komponenter behöver assets.
2. Läs docs/tvos-redesign-spec.md och docs/web-redesign-spec.md för design-system (färgpalett).
3. Läs contracts/state.schema.json för alla game-phases.
4. Skapa docs/visual-assets/ med alla 5 filerna:
   - asset-catalog.md (vilka assets per phase)
   - gemini-prompts.md (prompt-bibliotek)
   - integration-guide.md (hur tvOS/web använder assets)
   - variation-strategy.md (rotation mellan sessioner)
   - naming-convention.md (filnamn, mappar)
5. Dokumentera första batch av assets att generera (lobby_welcome_bg, travel_motion_loop_01, followup_bg_01).

---

## 8. REKRYTERING — formellt

### visual-content
ROLL: Visual Content Designer / Motion Graphics Specialist
SYFTE: Äga och design alla visuella assets (bilder, video-loopar) för game-show
+ travel estetik. Skapa Gemini prompt-bibliotek för AI-generering. Säkerställa
teknisk kompatibilitet (tvOS 4K, web responsive) och smidig integration.
KERNKOMPETENSER: Visual design (game-show + travel vibes), motion graphics
(looping video, smooth transitions), AI prompt engineering (Gemini), asset
optimization (tvOS/web constraints), documentation (asset-katalog, integration-
guide).
SAMARBETAR MED: tvos-designer, web-designer (synka design), tvos, web (asset-
integration), producer (timing + feel), sound-designer (audio/visual synk),
ceo (äger docs/).
PRIORITET: Medium. Visuellt innehåll är inte blocker för MVP men är critical för
game-show feel och travel vibes. Utan visual-content känns appen "tom" och
mindre professionell.

---

## 9. Collaboration Map

```
docs/tvos-redesign-spec.md + docs/web-redesign-spec.md (design-system)
        |
        v
   visual-content (asset-katalog + Gemini prompts)
        |
        +-------> docs/visual-assets/ (5 filer)
        |                |
        |                v
        |         Användaren (genererar assets i Gemini)
        |                |
        |                v
        |         assets/ (images/, video/)
        |                |
        |                v
        |         tvos + web (implementera asset-integration)
        |                |
        |                v
        |         Feedback (performance, filstorlek, feel)
        |                |
        |                v
        |         visual-content (iterera prompts/specs)
        |
        +-------> producer (samarbete: feel, timing)
        +-------> sound-designer (samarbete: audio/visual synk)
```

Flödet:
1. visual-content läser design-specs → skapar asset-katalog + Gemini prompts.
2. Användaren kör Gemini-prompts → genererar assets → sparar i assets/.
3. tvos/web implementerar asset-integration (AVPlayer, AsyncImage, lazy-loading).
4. tvos/web ger feedback (filstorlek, performance, feel) → visual-content itererar.
5. producer/sound-designer samarbetar för att synka timing/feel med audio.

---

## 10. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| apps/tvos/Sources/PaSparetTV/ | visual-content (läser), tvos (implementerar asset-integration) | Vilka views behöver assets? |
| apps/web-player/src/ | visual-content (läser), web (implementerar asset-integration) | Vilka komponenter behöver assets? |
| docs/tvos-redesign-spec.md | visual-content (läser) | Färgpalett, typografi, design-system |
| docs/web-redesign-spec.md | visual-content (läser) | Design-system för web |
| docs/design-decisions.md | visual-content (läser) | Gemensamma design-beslut |
| contracts/state.schema.json | visual-content (läser) | Alla game-phases |
| docs/visual-assets/asset-catalog.md | visual-content (skapar) | Asset-spec per phase |
| docs/visual-assets/gemini-prompts.md | visual-content (skapar) | Prompt-bibliotek |
| docs/visual-assets/integration-guide.md | visual-content (skapar) | Integration-spec för tvOS/web |
| docs/visual-assets/variation-strategy.md | visual-content (skapar) | Rotation-strategi |
| docs/visual-assets/naming-convention.md | visual-content (skapar) | Filnamn, mappar, versioning |

---

**END OF DOCUMENT**
