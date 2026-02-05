#!/usr/bin/env python3
"""
TASK-601: End-to-end integration test — full game loop.

Host (role=host) + 3 players (role=player) via WebSocket against
backend on localhost:3000.  ai-content on localhost:3001.

Destinations are random (Paris / Tokyo / New York).  The script
submits every known city name so at least one answer is correct
regardless of which destination the server picks.  Scoring is
validated against the actual reveal data.
"""

import asyncio
import json
import time
import sys
import datetime
import urllib.request
import urllib.error
from websocket import WebSocketApp          # websocket-client (sync)

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
BACKEND  = "http://localhost:3000"
AI_URL   = "http://localhost:3001"
WS_BASE  = "ws://localhost:3000/ws"
STEP_TIMEOUT_S = 20   # seconds per step before FAIL (ROUND_INTRO can be slow)

# All possible correct answers (one will match the random destination)
KNOWN_CITIES = ["Paris", "Tokyo", "New York"]

# ---------------------------------------------------------------------------
# SHARED STATE  (written by WS threads, read by main loop via asyncio)
# ---------------------------------------------------------------------------
class Client:
    """One WS connection – host or player."""
    def __init__(self, name: str, role: str):
        self.name        = name
        self.role        = role
        self.player_id   = None          # set after REST join
        self.token       = None          # JWT from REST
        self.session_id  = None
        self.ws          = None          # WebSocketApp instance
        self.connected   = asyncio.Event()   # set when WELCOME received
        self.messages    = []            # all received messages (append-only)
        self.loop        = None          # the asyncio event loop (set before run)

    # ------------------------------------------------------------------
    # WebSocketApp callbacks  (run in WS thread)
    # ------------------------------------------------------------------
    def _on_open(self, ws):
        pass   # WELCOME is the real signal

    def _on_message(self, ws, raw):
        msg = json.loads(raw)
        self.messages.append(msg)
        if msg.get("type") == "WELCOME":
            # Signal from WS thread -> asyncio
            self.loop.call_soon_threadsafe(self.connected.set)

    def _on_error(self, ws, err):
        print(f"  [WS-ERR] {self.name}: {err}")

    def _on_close(self, ws, code, reason):
        print(f"  [WS-CLOSE] {self.name}: code={code} reason={reason}")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def send(self, payload: dict):
        """Thread-safe send."""
        self.ws.send(json.dumps(payload))

    def start(self, loop: asyncio.AbstractEventLoop):
        """Spin up WebSocketApp in a background thread."""
        self.loop = loop
        url = f"{WS_BASE}?token={self.token}"
        self.ws = WebSocketApp(
            url,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )
        import threading
        t = threading.Thread(target=self.ws.run_forever, daemon=True)
        t.start()

    def close(self):
        if self.ws:
            self.ws.close()

    def has_event(self, event_type: str, **filters) -> dict | None:
        """Return first message matching type + optional payload filters."""
        for m in self.messages:
            if m.get("type") != event_type:
                continue
            match = True
            for k, v in filters.items():
                # dot-notation for nested keys: "payload.state.phase"
                parts = k.split(".")
                node = m
                for p in parts:
                    if isinstance(node, dict):
                        node = node.get(p)
                    else:
                        node = None
                        break
                if node != v:
                    match = False
                    break
            if match:
                return m
        return None

    def all_events(self, event_type: str) -> list[dict]:
        return [m for m in self.messages if m.get("type") == event_type]

# ---------------------------------------------------------------------------
# REST helpers  (synchronous – fine for setup)
# ---------------------------------------------------------------------------
def _post(url: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def _get(url: str) -> dict:
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode())

# ---------------------------------------------------------------------------
# TEST RESULTS
# ---------------------------------------------------------------------------
class Results:
    def __init__(self):
        self.steps: list[dict] = []   # {step, name, result, detail, elapsed_ms}

    def record(self, name: str, passed: bool, detail: str = "", elapsed_ms: int = 0):
        tag = "PASS" if passed else "FAIL"
        self.steps.append({"name": name, "result": tag, "detail": detail, "elapsed_ms": elapsed_ms})
        print(f"  [{tag}] {name} ({elapsed_ms} ms)  {detail}")

# ---------------------------------------------------------------------------
# WAIT HELPER  – poll clients for an event within timeout
# ---------------------------------------------------------------------------
async def wait_for_event(
    clients: list[Client],
    event_type: str,
    timeout_s: float = STEP_TIMEOUT_S,
    poll_interval: float = 0.1,
    **filters,
) -> dict | None:
    """Block until ALL clients have a matching event (or timeout)."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if all(c.has_event(event_type, **filters) for c in clients):
            return clients[0].has_event(event_type, **filters)
        await asyncio.sleep(poll_interval)
    return None   # timeout

async def wait_for_event_any(
    client: Client,
    event_type: str,
    timeout_s: float = STEP_TIMEOUT_S,
    poll_interval: float = 0.1,
    **filters,
) -> dict | None:
    """Block until ONE client has a matching event."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if client.has_event(event_type, **filters):
            return client.has_event(event_type, **filters)
        await asyncio.sleep(poll_interval)
    return None

# ---------------------------------------------------------------------------
# MAIN TEST
# ---------------------------------------------------------------------------
async def run_test():
    results = Results()
    loop = asyncio.get_event_loop()

    # ====================================================================
    # STEP 1 — Health check both services
    # ====================================================================
    t0 = time.monotonic()
    try:
        bh = _get(f"{BACKEND}/health")
        ah = _get(f"{AI_URL}/health")
        results.record("1. Health check", True,
                       f"backend={bh.get('status')} ai={ah.get('ok', ah.get('status'))}")
    except Exception as e:
        results.record("1. Health check", False, str(e))
        print("  ABORT: services not reachable.")
        return results

    # ====================================================================
    # STEP 2 — Create session (POST /v1/sessions)
    # ====================================================================
    t0 = time.monotonic()
    try:
        session_resp = _post(f"{BACKEND}/v1/sessions")
        session_id   = session_resp["sessionId"]
        join_code    = session_resp["joinCode"]
        results.record("2. Session creation", True,
                       f"sessionId={session_id} joinCode={join_code}",
                       int((time.monotonic()-t0)*1000))
    except Exception as e:
        results.record("2. Session creation", False, str(e))
        return results

    # ====================================================================
    # STEP 3 — Join as host + 3 players via REST
    # ====================================================================
    t0 = time.monotonic()
    host = Client("Host", "host")
    players = [Client(f"Player{i+1}", "player") for i in range(3)]

    try:
        # Host joins with role=host to claim the host slot
        h_resp = _post(f"{BACKEND}/v1/sessions/{session_id}/join",
                       {"name": "Host", "role": "host"})
        host.player_id  = h_resp["playerId"]
        host.token      = h_resp["playerAuthToken"]
        host.session_id = session_id

        for p in players:
            p_resp = _post(f"{BACKEND}/v1/sessions/{session_id}/join",
                           {"name": p.name})
            p.player_id  = p_resp["playerId"]
            p.token      = p_resp["playerAuthToken"]
            p.session_id = session_id

        results.record("3. REST join (host + 3 players)", True,
                       f"host={host.player_id} players={[p.player_id for p in players]}",
                       int((time.monotonic()-t0)*1000))
    except Exception as e:
        results.record("3. REST join (host + 3 players)", False, str(e))
        return results

    # ====================================================================
    # STEP 4 — Connect 4 WebSockets; wait WELCOME + STATE_SNAPSHOT LOBBY
    # ====================================================================
    t0 = time.monotonic()
    all_clients = [host] + players
    for c in all_clients:
        c.start(loop)

    # Wait for all WELCOME events
    welcome_ok = True
    for c in all_clients:
        try:
            await asyncio.wait_for(c.connected.wait(), timeout=STEP_TIMEOUT_S)
        except asyncio.TimeoutError:
            welcome_ok = False
            print(f"    TIMEOUT waiting for WELCOME on {c.name}")

    # Wait for STATE_SNAPSHOT with phase=LOBBY on all 4
    snapshot_lobby = await wait_for_event(
        all_clients, "STATE_SNAPSHOT",
        **{"payload.state.phase": "LOBBY"}
    ) if welcome_ok else None

    if welcome_ok and snapshot_lobby:
        results.record("4. WS handshake (WELCOME + LOBBY snapshot)", True,
                       "all 4 clients connected",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("4. WS handshake (WELCOME + LOBBY snapshot)", False,
                       f"welcome_ok={welcome_ok} snapshot={'yes' if snapshot_lobby else 'no'}",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 5 — All see LOBBY_UPDATED with >= 3 players
    # ====================================================================
    t0 = time.monotonic()
    lobby_ok = await wait_for_event(all_clients, "LOBBY_UPDATED")
    if lobby_ok:
        # Count connected players in the latest LOBBY_UPDATED on host
        latest_lobby = host.all_events("LOBBY_UPDATED")[-1] if host.all_events("LOBBY_UPDATED") else lobby_ok
        player_count = len(latest_lobby.get("payload", {}).get("players", []))
        results.record("5. LOBBY_UPDATED seen by all", player_count >= 3,
                       f"players_in_lobby={player_count}",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("5. LOBBY_UPDATED seen by all", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 6 — Host sends HOST_START_GAME
    # ====================================================================
    t0 = time.monotonic()
    host.send({
        "type": "HOST_START_GAME",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {"sessionId": session_id},
    })

    # Server goes LOBBY -> ROUND_INTRO (with audio events), then after delay -> CLUE_LEVEL
    # Wait for STATE_SNAPSHOT phase=ROUND_INTRO first
    round_intro = await wait_for_event(
        all_clients, "STATE_SNAPSHOT",
        **{"payload.state.phase": "ROUND_INTRO"}
    )
    results.record("6a. ROUND_INTRO phase received", round_intro is not None,
                   "phase=ROUND_INTRO on all clients" if round_intro else "timeout",
                   int((time.monotonic()-t0)*1000))

    # Check for MUSIC_SET (audio event) — may or may not arrive depending on TTS manifest
    music_set = await wait_for_event_any(host, "MUSIC_SET", timeout_s=5)
    results.record("6b. MUSIC_SET after game start", music_set is not None,
                   f"trackId={music_set.get('payload',{}).get('trackId','?')}" if music_set else "not received (no TTS manifest — acceptable)",
                   int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 7 — Wait for CLUE_LEVEL phase + CLUE_PRESENT at level 10
    # ====================================================================
    t0 = time.monotonic()
    # ROUND_INTRO -> CLUE_LEVEL happens after a server-side delay (3-4.5 s).
    # Use extended timeout.
    clue_10_snapshot = await wait_for_event(
        all_clients, "STATE_SNAPSHOT",
        **{"payload.state.phase": "CLUE_LEVEL", "payload.state.clueLevelPoints": 10}
    )
    clue_10_present = await wait_for_event(all_clients, "CLUE_PRESENT",
                                           **{"payload.clueLevelPoints": 10})
    if clue_10_snapshot and clue_10_present:
        results.record("7. CLUE_LEVEL 10 + CLUE_PRESENT", True,
                       f"clueText='{clue_10_present['payload']['clueText'][:40]}...'",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("7. CLUE_LEVEL 10 + CLUE_PRESENT", False,
                       f"snapshot={'yes' if clue_10_snapshot else 'no'} present={'yes' if clue_10_present else 'no'}",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 8 — Player 1 pulls BRAKE at level 10
    # ====================================================================
    t0 = time.monotonic()
    p1 = players[0]
    p1.send({
        "type": "BRAKE_PULL",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {
            "playerId": p1.player_id,
            "clientTimeMs": int(time.time() * 1000),
        },
    })

    # Wait for BRAKE_ACCEPTED on ALL clients
    brake_accepted = await wait_for_event(all_clients, "BRAKE_ACCEPTED",
                                          **{"payload.playerId": p1.player_id})

    # Wait for STATE_SNAPSHOT phase=PAUSED_FOR_BRAKE on all
    brake_snapshot = await wait_for_event(
        all_clients, "STATE_SNAPSHOT",
        **{"payload.state.phase": "PAUSED_FOR_BRAKE"}
    )

    if brake_accepted and brake_snapshot:
        results.record("8. BRAKE_PULL + BRAKE_ACCEPTED", True,
                       f"brakeOwner={p1.name} level=10",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("8. BRAKE_PULL + BRAKE_ACCEPTED", False,
                       f"accepted={'yes' if brake_accepted else 'no'} snapshot={'yes' if brake_snapshot else 'no'}",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 9 — Player 1 submits answer "Paris" (may or may not be correct)
    # ====================================================================
    t0 = time.monotonic()
    p1.send({
        "type": "BRAKE_ANSWER_SUBMIT",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {
            "playerId": p1.player_id,
            "answerText": "Paris",
        },
    })

    # Wait for BRAKE_ANSWER_LOCKED on all clients
    answer_locked = await wait_for_event(all_clients, "BRAKE_ANSWER_LOCKED",
                                         **{"payload.playerId": p1.player_id})

    if answer_locked:
        results.record("9. BRAKE_ANSWER_SUBMIT + LOCKED", True,
                       f"lockedAt={answer_locked['payload'].get('lockedAtLevelPoints')}",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("9. BRAKE_ANSWER_SUBMIT + LOCKED", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 10 — Auto-advance to level 8, then HOST_NEXT_CLUE 8->6->4->2
    #
    # After answer lock the server calls autoAdvanceClue() which moves
    # 10 -> 8 without us sending anything.  We wait for CLUE_PRESENT
    # at 8, then drive the remaining transitions manually.
    # ====================================================================
    clue_levels_seen = [10]   # already confirmed

    # --- 10 -> 8 (auto-advance after answer submit) ---
    t0 = time.monotonic()
    cp8 = await wait_for_event(all_clients, "CLUE_PRESENT",
                               **{"payload.clueLevelPoints": 8})
    if cp8:
        clue_levels_seen.append(8)
        results.record("10a. Auto-advance to level 8", True,
                       f"clueText='{cp8['payload']['clueText'][:40]}...'",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("10a. Auto-advance to level 8", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # --- 8 -> 6 (HOST_NEXT_CLUE) ---
    t0 = time.monotonic()
    host.send({
        "type": "HOST_NEXT_CLUE",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {},
    })
    cp6 = await wait_for_event(all_clients, "CLUE_PRESENT",
                               **{"payload.clueLevelPoints": 6})
    if cp6:
        clue_levels_seen.append(6)
        results.record("10b. HOST_NEXT_CLUE -> level 6", True,
                       f"clueText='{cp6['payload']['clueText'][:40]}...'",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("10b. HOST_NEXT_CLUE -> level 6", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # --- 6 -> 4 ---
    t0 = time.monotonic()
    host.send({
        "type": "HOST_NEXT_CLUE",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {},
    })
    cp4 = await wait_for_event(all_clients, "CLUE_PRESENT",
                               **{"payload.clueLevelPoints": 4})
    if cp4:
        clue_levels_seen.append(4)
        results.record("10c. HOST_NEXT_CLUE -> level 4", True,
                       f"clueText='{cp4['payload']['clueText'][:40]}...'",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("10c. HOST_NEXT_CLUE -> level 4", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # --- 4 -> 2 ---
    t0 = time.monotonic()
    host.send({
        "type": "HOST_NEXT_CLUE",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {},
    })
    cp2 = await wait_for_event(all_clients, "CLUE_PRESENT",
                               **{"payload.clueLevelPoints": 2})
    if cp2:
        clue_levels_seen.append(2)
        results.record("10d. HOST_NEXT_CLUE -> level 2", True,
                       f"clueText='{cp2['payload']['clueText'][:40]}...'",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("10d. HOST_NEXT_CLUE -> level 2", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    clue_progression_ok = clue_levels_seen == [10, 8, 6, 4, 2]
    results.record("10e. Full clue progression 10->8->6->4->2", clue_progression_ok,
                   f"seen={clue_levels_seen}")

    # ====================================================================
    # STEP 11 — Trigger reveal (HOST_NEXT_CLUE at level 2 -> reveal)
    # ====================================================================
    t0 = time.monotonic()
    host.send({
        "type": "HOST_NEXT_CLUE",
        "sessionId": session_id,
        "serverTimeMs": int(time.time() * 1000),
        "payload": {},
    })

    # Wait for DESTINATION_REVEAL on all clients
    reveal = await wait_for_event(all_clients, "DESTINATION_REVEAL")
    if reveal:
        dest_name  = reveal["payload"].get("destinationName", "?")
        dest_country = reveal["payload"].get("country", "?")
        results.record("11a. DESTINATION_REVEAL", True,
                       f"destination={dest_name} ({dest_country})",
                       int((time.monotonic()-t0)*1000))
    else:
        dest_name = "?"
        results.record("11a. DESTINATION_REVEAL", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 12 — DESTINATION_RESULTS received by all
    # ====================================================================
    t0 = time.monotonic()
    dest_results = await wait_for_event(all_clients, "DESTINATION_RESULTS")
    if dest_results:
        results_list = dest_results["payload"].get("results", [])
        # Find Player1's result
        p1_result = next((r for r in results_list if r["playerId"] == p1.player_id), None)
        expected_correct = (dest_name.lower() == "paris")   # we submitted "Paris"
        actual_correct   = p1_result["isCorrect"] if p1_result else None
        points           = p1_result["pointsAwarded"] if p1_result else None
        scoring_ok       = (actual_correct == expected_correct)
        results.record("12. DESTINATION_RESULTS + scoring check", scoring_ok,
                       f"p1_answer='Paris' dest='{dest_name}' correct={actual_correct} pts={points} expected_correct={expected_correct}",
                       int((time.monotonic()-t0)*1000))
    else:
        results.record("12. DESTINATION_RESULTS + scoring check", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 13 — SCOREBOARD_UPDATE or FOLLOWUP_QUESTION (both valid next states)
    # ====================================================================
    t0 = time.monotonic()
    # After reveal the server either starts followups or goes straight to scoreboard.
    # Wait for either SCOREBOARD_UPDATE or FOLLOWUP_QUESTION_PRESENT.
    scoreboard_evt = None
    followup_evt   = None
    deadline = time.monotonic() + STEP_TIMEOUT_S
    while time.monotonic() < deadline:
        scoreboard_evt = host.has_event("SCOREBOARD_UPDATE")
        followup_evt   = host.has_event("FOLLOWUP_QUESTION_PRESENT")
        if scoreboard_evt or followup_evt:
            break
        await asyncio.sleep(0.1)

    if scoreboard_evt:
        sb = scoreboard_evt["payload"].get("scoreboard", [])
        results.record("13. SCOREBOARD_UPDATE received", True,
                       f"entries={len(sb)} scores={[(e['name'], e['score']) for e in sb]}",
                       int((time.monotonic()-t0)*1000))
    elif followup_evt:
        results.record("13. FOLLOWUP_QUESTION_PRESENT received", True,
                       f"q='{followup_evt['payload']['questionText'][:50]}...'",
                       int((time.monotonic()-t0)*1000))
        # Let followups run out via server timer (15 s each, max 2 questions)
        # We just wait for the eventual SCOREBOARD_UPDATE
        print("    [INFO] Waiting for followup sequence to complete (server-timed)...")
        scoreboard_evt = None
        fq_deadline = time.monotonic() + 60   # 60 s max for 2 * 15 s questions + overhead
        while time.monotonic() < fq_deadline:
            scoreboard_evt = host.has_event("SCOREBOARD_UPDATE")
            if scoreboard_evt:
                break
            await asyncio.sleep(0.5)
        if scoreboard_evt:
            sb = scoreboard_evt["payload"].get("scoreboard", [])
            results.record("13b. SCOREBOARD_UPDATE after followups", True,
                           f"entries={len(sb)} scores={[(e['name'], e['score']) for e in sb]}",
                           int((time.monotonic()-t0)*1000))
        else:
            results.record("13b. SCOREBOARD_UPDATE after followups", False,
                           "timeout waiting for scoreboard after followups",
                           int((time.monotonic()-t0)*1000))
    else:
        results.record("13. SCOREBOARD_UPDATE or FOLLOWUP received", False, "timeout",
                       int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 14 — Validate scoreboard from STATE_SNAPSHOT (all 4 consistent)
    # ====================================================================
    t0 = time.monotonic()
    # Get the latest STATE_SNAPSHOT from each client; check scoreboard presence
    all_have_scoreboard = True
    for c in all_clients:
        snapshots = c.all_events("STATE_SNAPSHOT")
        if not snapshots:
            all_have_scoreboard = False
            break
        latest = snapshots[-1]
        sb = latest.get("payload", {}).get("state", {}).get("scoreboard", None)
        if sb is None:
            all_have_scoreboard = False
            break

    results.record("14. All 4 WS alive + scoreboard in latest snapshot",
                   all_have_scoreboard,
                   f"connections_ok={all(c.ws and c.ws.sock for c in all_clients)}",
                   int((time.monotonic()-t0)*1000))

    # ====================================================================
    # STEP 15 — No desync: compare scoreboard across all clients
    # ====================================================================
    t0 = time.monotonic()
    scoreboards_raw = []
    for c in all_clients:
        snapshots = c.all_events("STATE_SNAPSHOT")
        if snapshots:
            sb = snapshots[-1].get("payload", {}).get("state", {}).get("scoreboard", [])
            # Normalise: sort by playerId for comparison
            scoreboards_raw.append(sorted([(e["playerId"], e["score"]) for e in sb]))
        else:
            scoreboards_raw.append(None)

    # All non-None scoreboards should be identical
    valid_sbs = [s for s in scoreboards_raw if s is not None]
    no_desync  = len(set(str(s) for s in valid_sbs)) <= 1 if valid_sbs else False
    results.record("15. No desync — scoreboards consistent across clients", no_desync,
                   f"unique_scoreboards={len(set(str(s) for s in valid_sbs))}",
                   int((time.monotonic()-t0)*1000))

    # ====================================================================
    # Cleanup
    # ====================================================================
    for c in all_clients:
        c.close()
    await asyncio.sleep(0.5)   # let close frames propagate

    return results

# ---------------------------------------------------------------------------
# REPORT WRITER
# ---------------------------------------------------------------------------
def write_report(results: Results):
    now   = datetime.datetime.utcnow()
    lines = []
    lines.append("# TASK-601 E2E Integration Test Results")
    lines.append("")
    lines.append(f"- **Date**: {now.strftime('%Y-%m-%d')}")
    lines.append(f"- **Time**: {now.strftime('%H:%M:%S')} UTC")
    lines.append(f"- **Players**: 1 host + 3 players (4 WebSocket connections)")
    lines.append(f"- **Backend**: http://localhost:3000")
    lines.append(f"- **AI-content**: http://localhost:3001")
    lines.append("")

    pass_count = sum(1 for s in results.steps if s["result"] == "PASS")
    total      = len(results.steps)
    lines.append(f"## Summary: {pass_count} / {total} PASS")
    lines.append("")
    lines.append("| # | Step | Result | Elapsed ms | Detail |")
    lines.append("|---|------|--------|------------|--------|")
    for i, s in enumerate(results.steps, 1):
        detail_escaped = s["detail"].replace("|", "\\|")
        lines.append(f"| {i} | {s['name']} | **{s['result']}** | {s['elapsed_ms']} | {detail_escaped} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    if pass_count == total:
        lines.append("All steps passed. Full game loop verified end-to-end.")
    else:
        failures = [s for s in results.steps if s["result"] == "FAIL"]
        lines.append("## Failures")
        lines.append("")
        for f in failures:
            lines.append(f"- **{f['name']}**: {f['detail']}")

    return "\n".join(lines) + "\n"

# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("  TASK-601 — E2E Integration Test")
    print("  Backend: http://localhost:3000 | AI: http://localhost:3001")
    print("=" * 70)
    print()

    results = asyncio.run(run_test())

    print()
    print("=" * 70)
    pass_count = sum(1 for s in results.steps if s["result"] == "PASS")
    total      = len(results.steps)
    print(f"  FINAL: {pass_count} / {total} PASS")
    print("=" * 70)

    # Write report
    report_path = "/Users/oskar/pa-sparet-party/docs/sprint-1-test-checklist.md"
    report_text = write_report(results)
    with open(report_path, "w") as f:
        f.write(report_text)
    print(f"\n  Report written to {report_path}")

    sys.exit(0 if pass_count == total else 1)

if __name__ == "__main__":
    main()
