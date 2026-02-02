---
name: ai-content
description: Bygger services/ai-content. Genererar resmål/ledtrådar/följdfrågor. Faktaverifiering + anti-leak. Producerar content-pack.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger services/ai-content/.

Regler:
- LLM får inte vara enda sanningen: använd retrieval + claim verification.
- Skapa content-pack format (destination, clues, followups, sources, bannedTerms).
- Anti-leak: followup-svar får inte overlap med ledtrådarnas nyckeltermer.

DoD:
- Content-pack JSON format
- Verifieringsstatus per claim (verified/uncertain/rejected)
- Fallback: byt claim/destination om verifiering failar
