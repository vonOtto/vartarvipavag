# TEST: tvOS Join Fix

## Problem
tvOS-appen skapade en egen session istället för att joina iOS Host:s session.
Detta resulterade i att iOS och tvOS hade olika join-koder och separata lobbies.

## Fix
tvOS visar nu en join-kod input och joinrar existerande sessioner via:
1. Lookup: `GET /v1/sessions/by-code/:code`
2. Join: `POST /v1/sessions/:id/tv`

## Test Scenarios

### Scenario 1: iOS startar först
1. Starta backend: `cd services/backend && npm run dev`
2. Starta iOS Host app
3. Skapa session (tryck "Starta spel")
4. Notera join-koden (t.ex. "ABC123")
5. Starta tvOS app (Xcode simulator eller Apple TV)
6. Mata in join-koden från iOS Host
7. Tryck "Hoppa in!"

**EXPECTED:**
- tvOS visar samma lobby som iOS
- Samma join-kod visas på både iOS och tvOS
- QR-kod på tvOS matchar iOS:s session
- När spelare joinrar via web så syns de i BÅDA klienterna

### Scenario 2: tvOS startar först
1. Starta backend: `cd services/backend && npm run dev`
2. Starta tvOS app
3. Försök mata in en kod → ska ge fel (session finns inte än)
4. Starta iOS Host app
5. Skapa session → notera join-koden (t.ex. "XYZ789")
6. Gå tillbaka till tvOS och mata in koden
7. Tryck "Hoppa in!"

**EXPECTED:**
- tvOS visar samma lobby som iOS
- Samma join-kod visas på både iOS och tvOS
- När spelare joinrar via web så syns de i BÅDA klienterna

### Scenario 3: Web player joins both
1. Följ Scenario 1 (iOS först, sedan tvOS)
2. På mobil/desktop: öppna `http://localhost:3000`
3. Mata in samma join-kod som visas på iOS/tvOS
4. Ange namn och hoppa in som spelare

**EXPECTED:**
- Spelaren syns i iOS Host:s lobby
- Spelaren syns i tvOS:s lobby
- Spelaren syns i web player:s lobby
- ALLA tre klienter visar samma spelare-lista

### Scenario 4: "Nytt spel" button on tvOS
1. Efter att ha joinrat och spelat (eller bara väntat i lobby)
2. Tryck "Nytt spel"-knappen (bottom-right på tvOS)

**EXPECTED:**
- tvOS återgår till join-kod input-skärmen
- iOS Host fortsätter visa sin lobby (påverkas inte)
- tvOS måste mata in join-kod igen för att återansluta

## Verification Checklist
- [ ] iOS Host och tvOS visar SAMMA join-kod
- [ ] iOS Host och tvOS visar SAMMA spelare-lista
- [ ] Web players som joinrar syns i BÅDA klienterna
- [ ] tvOS kan INTE skapa nya sessioner (bara joina)
- [ ] tvOS visar felmeddelande om ogiltig join-kod matas in
- [ ] "Nytt spel"-knappen på tvOS återgår till join-skärmen

## Rollback Plan
Om något går fel kan den gamla auto-create-logiken återställas:
```bash
git revert HEAD
```
