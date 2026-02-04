# Follow-up question flow

## Where it fits in the game

```
REVEAL_DESTINATION
        │
        ▼
  FOLLOWUP_QUESTION  ←─── repeated for each question (0 … totalQuestions-1)
        │                  └─ timer counts down server-side
        │                  └─ players submit via FOLLOWUP_ANSWER_SUBMIT
        │                  └─ timer fires → FOLLOWUP_ANSWERS_LOCKED
        │                  └─ server scores  → FOLLOWUP_RESULTS
        ▼
  SCOREBOARD  (includes +2 per correct followup)
```

Two or three follow-up questions per destination (decided by
`ai-content` or the hardcoded fallback).  Each question is independent:
timer resets, answers reset.

---

## Event sequence (single question)

```
Server                          Host            TV              Alice / Bob
──────                          ────            ──              ───────────
phase → FOLLOWUP_QUESTION
  ──── FOLLOWUP_QUESTION_PRESENT ────────────────────────────────────────►
       (correctAnswer visible                   (correctAnswer
        in HOST copy only)                       omitted)

                                                                Alice taps answer
  ◄──────────────────────────────────────────────── FOLLOWUP_ANSWER_SUBMIT ──

  [timer fires at serverTimeMs + timerDurationMs]

  ──── FOLLOWUP_ANSWERS_LOCKED ──────────────────────────────────────────►
       (answersByPlayer visible                 (answersByPlayer
        in HOST copy only)                       omitted;
                                                 lockedPlayerCount visible)

  [server scores: +2 per correct, per scoring.md]

  ──── FOLLOWUP_RESULTS ─────────────────────────────────────────────────►
       (correctAnswer + results[].answerText now public to all roles)

  if nextQuestionIndex != null → repeat from FOLLOWUP_QUESTION_PRESENT
  else                         → phase → SCOREBOARD
```

---

## Projection summary

| Secret | Before FOLLOWUP_RESULTS | After FOLLOWUP_RESULTS |
|--------|------------------------|------------------------|
| `correctAnswer` | HOST only | all roles |
| `answersByPlayer` / `results[].answerText` | HOST only | all roles (via results) |
| `lockedPlayerCount` | all roles | — |
| `answeredByMe` (STATE_SNAPSHOT) | PLAYER only | — |

---

## Example payloads

### FOLLOWUP_QUESTION_PRESENT — HOST projection

```json
{
  "type": "FOLLOWUP_QUESTION_PRESENT",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205000000,
  "payload": {
    "questionText": "In which borough of Tokyo is the Imperial Palace located?",
    "options": ["Chiyoda", "Shinjuku", "Shibuya", "Minato"],
    "currentQuestionIndex": 0,
    "totalQuestions": 2,
    "timerDurationMs": 15000,
    "correctAnswer": "Chiyoda"
  }
}
```

### FOLLOWUP_QUESTION_PRESENT — TV / PLAYER projection

```json
{
  "type": "FOLLOWUP_QUESTION_PRESENT",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205000000,
  "payload": {
    "questionText": "In which borough of Tokyo is the Imperial Palace located?",
    "options": ["Chiyoda", "Shinjuku", "Shibuya", "Minato"],
    "currentQuestionIndex": 0,
    "totalQuestions": 2,
    "timerDurationMs": 15000
  }
}
```

### FOLLOWUP_ANSWER_SUBMIT (Alice → Server)

```json
{
  "type": "FOLLOWUP_ANSWER_SUBMIT",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205008400,
  "payload": {
    "playerId": "652aad12-490f-4631-baee-a4a1da7b4f4b",
    "answerText": "Chiyoda"
  }
}
```

### FOLLOWUP_ANSWERS_LOCKED — HOST projection

```json
{
  "type": "FOLLOWUP_ANSWERS_LOCKED",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205015000,
  "payload": {
    "currentQuestionIndex": 0,
    "lockedPlayerCount": 2,
    "answersByPlayer": [
      { "playerId": "652aad12-…", "playerName": "Alice", "answerText": "Chiyoda" },
      { "playerId": "c62599c1-…", "playerName": "Bob",   "answerText": "Shinjuku" }
    ]
  }
}
```

### FOLLOWUP_ANSWERS_LOCKED — TV / PLAYER projection

```json
{
  "type": "FOLLOWUP_ANSWERS_LOCKED",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205015000,
  "payload": {
    "currentQuestionIndex": 0,
    "lockedPlayerCount": 2
  }
}
```

### FOLLOWUP_RESULTS (all roles — identical)

```json
{
  "type": "FOLLOWUP_RESULTS",
  "sessionId": "d9f977de-98bf-467e-8798-7fc5ad108061",
  "serverTimeMs": 1770205015200,
  "payload": {
    "currentQuestionIndex": 0,
    "correctAnswer": "Chiyoda",
    "results": [
      { "playerId": "652aad12-…", "playerName": "Alice",   "answerText": "Chiyoda",  "isCorrect": true,  "pointsAwarded": 2 },
      { "playerId": "c62599c1-…", "playerName": "Bob",     "answerText": "Shinjuku", "isCorrect": false, "pointsAwarded": 0 }
    ],
    "nextQuestionIndex": 1
  }
}
```

### STATE_SNAPSHOT `followupQuestion` — PLAYER (Alice, already answered)

```json
{
  "followupQuestion": {
    "questionText": "In which borough of Tokyo is the Imperial Palace located?",
    "options": ["Chiyoda", "Shinjuku", "Shibuya", "Minato"],
    "currentQuestionIndex": 0,
    "totalQuestions": 2,
    "correctAnswer": null,
    "answersByPlayer": [],
    "timer": {
      "timerId": "fq-0-d9f977de",
      "startAtServerMs": 1770205000000,
      "durationMs": 15000
    },
    "answeredByMe": true
  }
}
```

---

## Timer & late-submit policy

- Timer is owned by the server.  `startAtServerMs` is included in
  `FOLLOWUP_QUESTION_PRESENT` so clients can render a countdown without
  polling.
- Any `FOLLOWUP_ANSWER_SUBMIT` received **after**
  `startAtServerMs + timerDurationMs` is silently dropped (no error
  event; the player simply does not appear in results with a correct
  answer).
- A player who does not submit before timeout appears in results with
  `answerText: ""`, `isCorrect: false`, `pointsAwarded: 0`.

---

## Open-text vs multiple-choice

`options` is nullable.  When `null`, players type a free-text answer
and the server performs case-insensitive / whitespace-normalised
matching against `correctAnswer` (and any aliases provided by
`ai-content`).  When an array, only exact option-text matches count.
