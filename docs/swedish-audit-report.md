# Svenska-granskning — Audit Report

**Skapad av:** CEO-agent
**Datum:** 2026-02-05
**Status:** Flaggade fel — awaiting fix per agent

---

## Del A — TTS-text och banter (swedish-script-agent scope)

Källa: `services/backend/src/game/tts-prefetch.ts` och `contracts/banter.md`

### A1 — banter.md rad 187: Variант D blandar svenska och engelska

| Fil | Plats | Fel | Förslag |
|-----|-------|-----|---------|
| `contracts/banter.md` | Rad 187, variant D | `Alright, frågan blir: {questionText}` — "Alright" är engelska | Bytt till `Okej, frågan blir: {questionText}` |

Kommentar: Alla andra varianter i same tabell (A/B/C) är hel svenska. "Alright" sticker ut och är inkonsistent med tonen i resten av banter.md.

### A2 — tts-prefetch.ts rad 157: Inkonsistenst mot banter.md variant D

| Fil | Plats | Fel | Förslag |
|-----|-------|-----|---------|
| `services/backend/src/game/tts-prefetch.ts` | Rad 157, variant D | `Okej, frågan blir: ${q}` — kodversionen sayer "Okej" men banter.md sayer "Alright" | Synca med banter.md eftter att A1 är fixat (banter.md -> "Okej"), eller vice versa. Ägare: architect (contracts) och backend (kod). |

Kommentar: Kodversionen i tts-prefetch.ts sayer "Okej" men banter.md sayer "Alright". De ska vara identiska. Eftersom "Alright" är fel (A1), ska banter.md fixas till "Okej" och kodversionen är correct.

### A3 — Banter.md rad 165: "Femte och sista ledtråd" men tts-prefetch.ts variant A sayer bara "Femte"

| Fil | Plats | Fel | Förslag |
|-----|-------|-----|---------|
| `contracts/banter.md` | Rad 165 | Template: `Femte och sista ledtråd: {clueText}` | Kodversionen i tts-prefetch.ts rad 71 sayer bara `'Femte'` som prefix, och rad 105 bygger `${prefix} ledtråd: ${clueText}` -> "Femte ledtråd: ..." |
| `services/backend/src/game/tts-prefetch.ts` | Rad 71 | `CLUE_ORDINALS[2] = 'Femte'` | Bytt till `'Femte och sista'` for att matcha banter.md |

### A4 — Alla TTS-texterna i tts-prefetch.ts — gramatisk kontroll

Genomgång av alla textar i BANTER_POOL och QUESTION_VARIANTS (rader 17-50, 153-158):

| Rad | Text | Status |
|-----|------|--------|
| 18 | "Var tror ni vi ska? Beredda på resan?" | OK |
| 19 | "En ny resa väntar. Vart är vi på väg?" | OK |
| 20 | "Dags att ge er en ledtråd. Vart är vi på väg?" | OK |
| 21 | "Härbärbär… Vilken resa blir det här?" | OK (stilistiskt OK — komisch interjection) |
| 24 | "Dar bromsar vi! Låt se vad ni kommit fram till." | OK |
| 25 | "Och dar fick vi broms! Vad säger ni?" | OK |
| 26 | "Stopp dar! Någon har en teori." | OK |
| 27 | "Tåget stannar! Har ni knäckt det?" | OK |
| 30 | "Nu ska vi se om ni har rätt…" | OK |
| 31 | "Spänning! Är det här svaret?" | OK |
| 32 | "Dags för avslöjandet…" | OK |
| 33 | "Låt oss kolla om ni är på rätt spår!" | OK |
| 36 | "Helt rätt! Bra jobbat!" | OK |
| 37 | "Precis! Det var ju utmärkt." | OK |
| 38 | "Ja, självklart! Ni är på gång." | OK |
| 41 | "Tyvärr inte det vi letade efter." | OK |
| 42 | "Aj da, det var inte rätt den här gången." | OK |
| 43 | "Nej, men det var ett tappert försök!" | OK |
| 46 | "Nu närmar vi oss målstationen. Vem vinner kvällens resa?" | OK |
| 47 | "Dags att räkna poängen! Vem tar hem segern ikväll?" | OK |
| 48 | "Slutstationen är här. Nu ska vi se vem som vunnit!" | OK |
| 154 | "Frågan är: {q}" | OK |
| 155 | "Nästa fråga: {q}" | OK |
| 156 | "Lyssna på frågan: {q}" | OK |
| 157 | "Okej, frågan blir: {q}" | OK (men synca mot banter.md — see A2) |
| 229 | "Nu ska vi se vad ni kan om {destinationName}" | OK |

---

## Del B — UI-text i klienter (i18n-reviewer-agent scope)

### B1 — Web: ClueDisplay.tsx rad 12 — engelska "points"

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/web-player/src/components/ClueDisplay.tsx` | 12 | `{points} points` — engelska | `{points} poäng` |

### B2 — Web: GamePage.tsx rad 465 — engelska "answers locked"

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/web-player/src/pages/GamePage.tsx` | 465 | `{lockedCount} answer{lockedCount !== 1 ? 's' : ''} locked this round` — hel engelska | `{lockedCount} svar låst den här omgången` |

### B3 — Web: LandingPage.tsx rad 16 — "byggfrågor" borde vara "frågor"

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/web-player/src/pages/LandingPage.tsx` | 16 | `Mellan rundorna väntar planeta på er med byggfrågor.` — "byggfrågor" är ovanligt ord, borde vara "frågor" | `Mellan rundorna väntar er frågor om destinationerna.` |

### B4 — Web: JoinPage.tsx rad 127 — "Styrden spelets gång" typo

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/web-player/src/pages/JoinPage.tsx` | 127 | `Styrden spelets gång` — "Styrden" är inte ett ord | `Styr spelets gång` |

### B5 — iOS Host: App.swift rad 291 — engelska "DESTINATION (hemligt)"

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/ios-host/Sources/PaSparetHost/App.swift` | 291 | `DESTINATION (hemligt)` — "DESTINATION" är engelska | `DESTINATION (hemligt)` -> `Destination (hemligt)` eller `Destinationen (hemligt)` |

Kommentar: Raden sayer `.textCase(.uppercase)` sa hela stringen visas i versaler. Frågan är om "DESTINATION" ska vara svenska. Förslag: bytt till `Destinationen (hemligt)` (uppercase-transformationen gör resten).

### B6 — iOS Host: App.swift rad 396 — "Connection lost" engelska

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/ios-host/Sources/PaSparetHost/HostState.swift` | 300 | `"Connection lost — restart the app."` — hel engelska | `"Anslutningen förlorad — starta appen igen."` |

### B7 — tvOS: AppState.swift rad 396 — "Connection lost" engelska

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/tvos/Sources/PaSparetTV/AppState.swift` | 396 | `"Connection lost — restart the app."` — hel engelska | `"Anslutningen förlorad — starta appen igen."` |

### B8 — Web: GamePage.tsx rad 558 — "Timen gick ut"

| Fil | Rad | Fel | Förslag |
|-----|-----|-----|---------|
| `apps/web-player/src/pages/GamePage.tsx` | 558 | `Timen gick ut` | OK gramatiskt, men inkonsistenst: resten av appen sayer "Timer" inte "Timen". Förslag: `Timen gick ut` ar fine (timen = definit form av tid). Behåll. |

### Sammanfattning av fel per agent

| Agent | Antal fel | Flaggade rader |
|-------|-----------|----------------|
| backend | 2 | A2 (tts-prefetch.ts:157 synca), A3 (tts-prefetch.ts:71 prefix) |
| architect | 1 | A1 (banter.md:187 "Alright") |
| web | 4 | B1, B2, B3, B4 |
| ios-host | 2 | B5, B6 |
| tvos | 1 | B7 |

---

**END OF AUDIT REPORT**
