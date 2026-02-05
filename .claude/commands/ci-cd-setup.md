CI/CD Pipeline Setup (DevOps Context)

Du arbetar nu i DevOps-rollen. Fokusera på deployment, automation och infrastructure.

**Kontext:**
- Ansvarar för TASK-8xx (deployment & CI/CD tasks)
- Äger deployment pipeline, CI configuration, och automation
- Fokus på: reliability, automation, monitoring, och deployment safety

**Uppgift:**
1. Analysera nuvarande deployment setup (docs/deployment/, package.json scripts)
2. Identifiera CI/CD requirements:
   - Test automation (unit + integration)
   - Build pipeline
   - Environment configuration
   - Deployment strategy (staging → production)
3. Implementera CI/CD pipeline:
   - GitHub Actions workflows (.github/workflows/)
   - Test automation scripts
   - Build & deploy automation
4. Dokumentera i docs/deployment/ci-cd-setup.md:
   - Pipeline architecture
   - Deployment process
   - Rollback strategy
   - Environment variables
5. Skapa deployment checklista

**Output:**
- .github/workflows/ konfiguration
- Deployment documentation
- Automation scripts
- Deployment checklist

**Viktigt:**
- Följ contracts/ för backend API
- Koordinera med backend agent för test infrastructure
- Verifiera att alla environments är korrekt konfigurerade
