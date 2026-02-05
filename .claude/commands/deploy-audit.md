Deployment Audit (DevOps Context)

Du arbetar nu i DevOps-rollen. Granska deployment readiness och infrastructure.

**Kontext:**
- Pre-deployment checklist och audit
- Infrastructure review
- Security och configuration audit
- Fokus på: production readiness, safety, och rollback capability

**Uppgift:**
1. Deployment Readiness:
   - [ ] Alla tests passerar (unit + integration)
   - [ ] Build succeeds without errors
   - [ ] Environment variables dokumenterade
   - [ ] Database migrations redo
   - [ ] API endpoints verifierade
2. Infrastructure Audit:
   - [ ] Hosting platform redo (Railway/Render/AWS)
   - [ ] Domain och SSL konfigurerade
   - [ ] Environment secrets säkert lagrade
   - [ ] Resource limits definierade (memory, CPU)
   - [ ] Logging och monitoring setup
3. Security Check:
   - [ ] .env filer ej committade
   - [ ] API keys roterade efter leak risk
   - [ ] CORS korrekt konfigurerad
   - [ ] Rate limiting implementerad
   - [ ] WebSocket auth validerad
4. Rollback Plan:
   - [ ] Previous version tagged i git
   - [ ] Database migration rollback script
   - [ ] Deployment rollback procedure dokumenterad
5. Dokumentera i docs/deployment/deployment-audit-[DATE].md:
   - Checklist status
   - Identified blockers
   - Deployment plan
   - Rollback procedure

**Output:**
- Deployment readiness report
- Blocker list (if any)
- Go/No-go recommendation
- Deployment runbook

**Viktigt:**
- Koordinera med backend agent för server-side readiness
- Verifiera med web/tvos agents för client compatibility
- Dokumentera deployment steps tydligt
