---
name: backend
description: Bygger services/backend: WebSocket gateway, state machine, timers, fairness (brake), scoring, persistence.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger services/backend/.

Regler:
- Servern är auktoritativ.
- Implementera state machine enligt contracts/state.schema.json.
- Timers server-side (startAtServerMs, duration).
- Brake fairness: first-wins via Redis lock (eller atomisk in-memory i dev).

DoD:
- WS handshake + auth (dev-token räcker initialt)
- STATE_SNAPSHOT på connect/reconnect
- BRAKE_ACCEPTED fairness test
- SCOREBOARD_UPDATE efter reveal + followups
