# Grace Period Reconnect - Test Guide

## Implementation Summary

Grace period reconnect har implementerats för att hantera tillfälliga disconnect/reconnect scenarion (t.ex. sidladdning i web-appen). När en spelare disconnectar behålls de i sessionen i 60 sekunder och kan återansluta under denna tid.

### Implementation Details

1. **Player Interface** (`src/types/state.ts`)
   - Lagt till `disconnectedAt?: number` för att spåra när en spelare disconnectade

2. **Session Store** (`src/store/session-store.ts`)
   - Lagt till `_disconnectTimers` map för att hantera cleanup timers

3. **Disconnect Handler** (`src/server.ts`)
   - Vid disconnect i active gameplay (ej LOBBY):
     - Sätter `player.disconnectedAt` till nuvarande server tid
     - Startar 60-sekunders grace period timer
     - Broadcastar PLAYER_LEFT med reason 'disconnect'
   - Vid LOBBY disconnect: tar fortfarande bort spelare direkt (befintligt beteende)
   - Vid grace period expiry: tar bort spelare och broadcastar PLAYER_LEFT med reason 'timeout'

4. **RESUME_SESSION Handler** (`src/server.ts`)
   - Kollar om spelaren har `disconnectedAt` (betyder att de disconnectade inom grace period)
   - Avbryter cleanup timer
   - Rensar `disconnectedAt` timestamp
   - Broadcastar STATE_SNAPSHOT till alla ANDRA klienter (reconnecting player får redan snapshot från connection handler)

5. **State Projection** (`src/utils/state-projection.ts`)
   - Filtrerar bort `disconnectedAt` för alla roller (internal field)

## Test Scenarios

### Scenario 1: Basic Reconnect (Web Player Reload)

**Setup:**
1. Starta backend: `npm run dev` (i services/backend)
2. Öppna två browser tabs med web-player
3. Join samma session med båda
4. Starta spelet (via host)

**Test:**
1. I Tab 1: Ladda om sidan (Cmd+R eller F5)
2. Förväntat resultat:
   - Tab 2 ska se PLAYER_LEFT event (disconnect)
   - Tab 1 ska automatiskt reconnecta efter reload
   - Tab 2 ska se uppdaterad STATE_SNAPSHOT med Tab 1 reconnected (isConnected: true)
   - Tab 1 ska få STATE_SNAPSHOT med korrekt game state

**Verifiering:**
- [ ] Player försvinner INTE från sessionen
- [ ] isConnected blir false → true efter reconnect
- [ ] Spelaren kan fortsätta spela normalt efter reconnect

### Scenario 2: Grace Period Expiry

**Setup:**
1. Samma som Scenario 1

**Test:**
1. I Tab 1: Stäng tab (eller disconnect WebSocket genom devtools)
2. Vänta 65 sekunder
3. Förväntat resultat:
   - Efter ~60 sekunder ska Tab 2 se PLAYER_LEFT event med reason 'timeout'
   - Spelaren ska vara helt borttagen från sessionen

**Verifiering:**
- [ ] Player försvinner från session efter 60s
- [ ] PLAYER_LEFT har reason: 'timeout'
- [ ] Player kan inte reconnecta efter expiry (måste join igen)

### Scenario 3: Reconnect Within Grace Period

**Setup:**
1. Samma som Scenario 1

**Test:**
1. I Tab 1: Disconnect WebSocket (devtools)
2. Vänta 10 sekunder
3. I Tab 1: Öppna ny WebSocket connection med samma JWT token
4. Skicka RESUME_SESSION med playerId
5. Förväntat resultat:
   - Tab 1 får STATE_SNAPSHOT med full state
   - Tab 2 får STATE_SNAPSHOT med Tab 1 reconnected
   - Grace period timer avbryts

**Verifiering:**
- [ ] Player reconnectar framgångsrikt
- [ ] Cleanup timer avbryts
- [ ] disconnectedAt timestamp rensas
- [ ] Alla klienter ser uppdaterad connection status

### Scenario 4: LOBBY Phase Behavior (No Change)

**Setup:**
1. Starta backend
2. Join med web-player
3. Stanna i LOBBY (start inte spelet)

**Test:**
1. Disconnect (stäng tab)
2. Förväntat resultat:
   - Spelaren tas bort DIREKT (inget grace period i LOBBY)
   - LOBBY_UPDATED broadcastas
   - Player måste join igen för att komma tillbaka

**Verifiering:**
- [ ] Player tas bort direkt från LOBBY
- [ ] Inget grace period i LOBBY phase
- [ ] Befintligt beteende bevaras

### Scenario 5: Multiple Reconnects

**Setup:**
1. Samma som Scenario 1

**Test:**
1. Disconnect → Reconnect inom 10s
2. Disconnect igen → Reconnect inom 10s
3. Disconnect igen → Reconnect inom 10s
4. Förväntat resultat:
   - Varje reconnect lyckas
   - Gamla timers avbryts när nya startas

**Verifiering:**
- [ ] Flera reconnects fungerar
- [ ] Inga timer-läckor
- [ ] State förblir konsistent

## Server Logs

För att följa reconnect flow, kolla efter dessa log messages:

```
WebSocket connection closed { sessionId, playerId, role, code, reason }
Player marked as disconnected with grace period { sessionId, playerId, gracePeriodMs: 60000 }
RESUME_SESSION: Player reconnecting within grace period { sessionId, playerId, elapsedMs }
RESUME_SESSION: Cancelled grace period timer { sessionId, playerId }
RESUME_SESSION: Player successfully reconnected { sessionId, playerId, playerName }
```

Vid grace period expiry:
```
Player removed after grace period expired { sessionId, playerId, gracePeriodMs: 60000 }
```

## Known Limitations

1. **Grace period är 60 sekunder**
   - Kan justeras genom att ändra `GRACE_PERIOD_MS` konstanten i server.ts

2. **LOBBY phase har inget grace period**
   - Spelaren tas bort direkt vid disconnect i LOBBY
   - Detta är by design för att hålla lobby-listan ren

3. **Host och TV roles**
   - Host och TV får också grace period under gameplay
   - De tas aldrig bort automatiskt (måste hanteras manuellt vid behov)

4. **Session cleanup**
   - Om hela sessionen tas bort innan grace period expires, rensas timers inte explicit
   - Detta är OK eftersom session tas bort från memory

## Next Steps

Efter verifiering:
1. Testa i web-player för att säkerställa att UI hanterar reconnect korrekt
2. Testa i tvOS app för att säkerställa att tvOS hanterar player reconnects
3. Överväg att lägga till reconnect metrics/monitoring
4. Överväg att göra grace period konfigurerbar via environment variable
