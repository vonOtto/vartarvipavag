# Agent Onboarding — Visual Content Designer

**Datum**: 2026-02-05
**CEO**: Rekryterade visual-content agent för visuellt innehåll
**Status**: Agent är nu aktiv och tillgänglig

---

## Rekryterad agent

### visual-content (Visual Content Designer / Motion Graphics Specialist)

**Expertis**: Visuellt innehåll (bilder, video-loopar, motion graphics), Gemini prompt engineering, asset optimization (tvOS 4K, web responsive), game-show + travel documentary estetik

**Äger**:
- `docs/visual-assets/` (asset-katalog, Gemini prompts, integration-guide, variation-strategi, naming-convention)
- `assets/images/` (alla bilder för game-phases)
- `assets/video/` (alla video-loopar)

**Task-serie**: 10xx (TASK-1001, TASK-1002, osv.)

**Första tasks**:
- **TASK-1001**: Asset catalog specification (vilka images/videos behövs per phase: lobby, clue, reveal, followup, finale)
- **TASK-1002**: Gemini prompt library (prompts för varje asset-typ + exempel + tekniska specs)
- **TASK-1003**: Integration guide (hur tvOS/web använder assets: AVPlayer, AsyncImage, lazy-loading, filformat)
- **TASK-1004**: Variation strategy (rotation av innehåll mellan sessioner för att undvika repetition)
- **TASK-1005**: Naming convention + asset organization (filnamn, mappar, versioning)

---

## Vad visual-content gör

### 1. Asset catalog (TASK-1001)

Identifierar ALLA visuella assets som behövs per game-phase:

**LOBBY**:
- `lobby_welcome_bg.jpg` (4K game-show teaser background)
- `lobby_ambiance_loop.mp4` (10s ambient motion graphics)

**CLUE_LEVEL**:
- `travel_motion_loop_01.mp4` till `05.mp4` (15s "resan"-videos: flygplan på karta, landmarks scrolling)
- `clue_bg_subtle.jpg` (fallback om video inte stöds)

**REVEAL_DESTINATION**:
- `reveal_showcase_[destination].jpg` (4K cinematic destination showcase, genereras dynamiskt per destination)
- `reveal_celebration_overlay.mp4` (3s confetti/sparkles)

**FOLLOWUP_QUESTION**:
- `followup_bg_01.jpg` till `03.jpg` (quiz backgrounds som roterar per fråga)

**FINAL_RESULTS**:
- `finale_celebration_bg.jpg` (podium, trophy, fireworks)
- `finale_confetti_loop.mp4` (10s looping confetti)

### 2. Gemini prompt library (TASK-1002)

Skapar prompts för Gemini AI-generering:

**Exempel-prompt** (travel_motion_loop_01.mp4):
```
Travel motion graphics: Cinematic, energetic
Subject: Animated world map with glowing travel route, airplane icon moving along route, landmarks appearing (Eiffel Tower, Big Ben, Statue of Liberty), subtle particle effects
Style: Cinematic travel documentary, smooth animations, blue/gold color palette
Technical: 1920×1080, 30fps, 15s duration, seamless loop, MP4/H.264
Avoid: Text, logos, jarring cuts, too fast motion
```

**Variation prompts**:
- Loop 02: Train journey (train on tracks, countryside scrolling)
- Loop 03: Road trip (car on winding road, mountains/forests)
- Loop 04: Ocean voyage (ship on ocean, waves, seagulls)
- Loop 05: Hot air balloon (balloon floating over landscapes, clouds)

### 3. Integration guide (TASK-1003)

Dokumenterar hur tvOS/web använder assets:

**tvOS**:
- Video: AVPlayer med `.repeat` loop mode, preload before phase, fade-in/fade-out 300ms
- Images: AsyncImage med placeholder, cache locally, fade-in 500ms
- Max video file size: 15MB (smooth playback på Apple TV HD)
- Max image file size: 2MB

**Web**:
- Video: `<video loop autoplay muted playsinline>`, lazy-load med Intersection Observer
- Images: `<img srcset="...">` för responsive loading (1920×1080, 1280×720, 854×480), lazy-load med `loading="lazy"`
- Max video file size: 10MB (mobile bandwidth)
- Max image file size: 1MB, WebP format om möjligt

### 4. Variation strategy (TASK-1004)

Skapar rotation-strategi för att undvika repetition:

- **Travel motion loops** (5 variations): Backend väljer slumpmässigt en av 01–05 per session
- **Followup backgrounds** (3 variations): Backend roterar bakgrund per fråga (Q1: bg_01, Q2: bg_02, Q3: bg_03)
- **Destination showcases** (dynamisk): ai-content genererar per destination, cached i CDN

### 5. Naming convention (TASK-1005)

Definierar filnamn-mönster och mappar:

**Pattern**: `[phase]_[type]_[variation].[ext]`

**Exempel**:
- `lobby_welcome_bg.jpg`
- `travel_motion_loop_01.mp4`
- `reveal_showcase_paris.jpg`
- `followup_bg_01.jpg`

**Directory structure**:
```
assets/
├── images/
│   ├── lobby/
│   ├── followup/
│   ├── finale/
│   └── destinations/
└── video/
    ├── travel/
    ├── reveal/
    └── finale/
```

---

## Samarbetar med

| Agent | Anledning |
|-------|-----------|
| **tvos-designer** | Synkar game-show estetik (färgpalett, typografi) så att assets matchar tvOS UI-design. visual-content läser docs/tvos-redesign-spec.md. |
| **web-designer** | Synkar design så att assets fungerar både på TV (4K) och mobile (responsive). visual-content läser docs/web-redesign-spec.md. |
| **tvos** | Implementerar asset-playback (AVPlayer, AsyncImage) enligt integration-guide. Ger feedback om performance (filstorlek, choppy playback). |
| **web** | Implementerar asset-loading (lazy-loading, responsive images). Ger feedback om bandwidth (filstorlek för stor för mobile). |
| **producer** | Samarbetar kring "feel": ska "resan"-video vara lugn eller high-energy? Ska reveal-graphics vara dramatisk eller clean? |
| **sound-designer** | Synkar audio/visual: om "resan"-video är high-energy bör music_travel_loop också vara det. Om celebration-graphics är explosivt bör SFX också vara det. |
| **ai-content** | visual-content skapar Gemini prompts för destination showcases → ai-content kör prompts när destination genereras → sparar i CDN. |

---

## Workflow

### Steg 1: visual-content skapar specs

```
Kör TASK-1001  # Asset catalog
Kör TASK-1002  # Gemini prompts
Kör TASK-1003  # Integration guide
Kör TASK-1004  # Variation strategy
Kör TASK-1005  # Naming convention
```

**Output**: `docs/visual-assets/` med 5 filer (asset-catalog.md, gemini-prompts.md, integration-guide.md, variation-strategy.md, naming-convention.md)

### Steg 2: Användaren genererar assets

Användaren öppnar Gemini och kör prompts från `docs/visual-assets/gemini-prompts.md`:

1. Kör prompt för `lobby_welcome_bg.jpg` → spara i `assets/images/lobby/`
2. Kör prompt för `travel_motion_loop_01.mp4` → spara i `assets/video/travel/`
3. Kör prompt för `followup_bg_01.jpg` → spara i `assets/images/followup/`
4. ... osv för alla assets i asset-katalog

### Steg 3: tvOS/web implementerar integration

**tvOS**:
- Läs `docs/visual-assets/integration-guide.md`
- Implementera AVPlayer för video-loopar (travel_motion_loop, finale_confetti_loop)
- Implementera AsyncImage för backgrounds (lobby_welcome_bg, followup_bg, finale_celebration_bg)
- Preload assets innan phase startar

**Web**:
- Läs `docs/visual-assets/integration-guide.md`
- Implementera `<video>` med lazy-loading för video-loopar
- Implementera `<img srcset>` för responsive images
- Lazy-load med Intersection Observer

### Steg 4: Feedback loop

- tvOS/web ger feedback: "travel_motion_loop_01.mp4 är 25MB, för stor för smooth playback"
- visual-content itererar prompt: "reduce detail, optimize for 15MB max file size"
- Användaren regenererar asset i Gemini
- tvOS/web verifierar: "nu funkar det, smooth playback"

---

## Uppdaterade filer

### CLAUDE.md

**Ändringar**:
1. **Agent Registry**: visual-content markerad som "✅ Aktiv"
2. **Ownership Map**: Lagt till:
   - `docs/visual-assets/` → visual-content
   - `assets/images/` → visual-content
   - `assets/video/` → visual-content
3. **TASK → Agent**: Lagt till task-serie 10xx (TASK-1001 till TASK-1005)
4. **Kör TASK-xxx — Routing Rule**: Lagt till routing för 10xx-serien
5. **Agent Selection Rule**: Lagt till rad för "Visuellt innehåll (bilder, video, motion graphics)"
6. **Handoff-protokoll**: Ny sektion för visual-content med när/hur/vad

---

## Nästa steg

### Rekommenderad första task

**TASK-1001** (visual-content): Asset catalog specification
- **Varför**: Vi behöver veta VILKA assets som ska genereras innan vi kan skapa Gemini prompts eller implementera asset-loading.
- **Input**: apps/tvos/, apps/web-player/, docs/tvos-redesign-spec.md, docs/web-redesign-spec.md, contracts/state.schema.json
- **Output**: docs/visual-assets/asset-catalog.md med full lista på assets per phase
- **Kommando**: "Kör TASK-1001"

### Efter TASK-1001

Kör tasks i sekvens:
1. TASK-1001 (asset-katalog) → vet vilka assets som behövs
2. TASK-1002 (Gemini prompts) → kan generera assets
3. TASK-1005 (naming convention) → vet var assets ska sparas
4. Användaren genererar första batch av assets (lobby_welcome_bg, travel_motion_loop_01, followup_bg_01)
5. TASK-1003 (integration-guide) → tvos/web kan börja implementera
6. TASK-1004 (variation-strategy) → backend kan implementera rotation

---

## Tekniska krav (sammanfattning)

### Gemini AI generation

- **Bilder**: 4K (3840×2160) för tvOS, JPG format, <2MB
- **Video**: 1920×1080, 30fps, MP4/H.264, seamless loop, <15MB (tvOS), <10MB (web)
- **Stil**: Game-show estetik + travel documentary vibes, synkad med tvOS/web design-system (blue/gold färgpalett)

### tvOS constraints

- Max video file size: 15MB (smooth AVPlayer playback på Apple TV HD)
- Max image file size: 2MB (fast AsyncImage loading)
- Preload next phase assets under current phase (predictive loading)

### Web constraints

- Max video file size: 10MB (mobile bandwidth)
- Max image file size: 1MB (fast loading)
- Responsive images (3 resolutions: 1920×1080, 1280×720, 854×480)
- Lazy-loading (Intersection Observer för videos, `loading="lazy"` för images)

---

## Sammanfattning

**visual-content** är nu **rekryterad och aktiv**. Agenten kan anropas med:
```
Kör TASK-10XX
```

CLAUDE.md är uppdaterad med:
- Agent Registry (status ✅ Aktiv)
- Ownership Map (docs/visual-assets/, assets/images/, assets/video/)
- TASK → Agent (10xx-serie)
- Routing Rule (10xx → visual-content)
- Agent Selection Rule (visuellt innehåll)
- Handoff-protokoll (när/hur/vad)

**Första rekommenderade task**: TASK-1001 (visual-content: Asset catalog specification).

---

**END OF DOCUMENT**
