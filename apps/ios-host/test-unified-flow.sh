#!/bin/bash
set -e

BASE_URL="http://localhost:3000"

echo "=== Test 1: Create session ==="
CREATE_RESP=$(curl -s -X POST "$BASE_URL/v1/sessions" -H "Content-Type: application/json" -d '{}')
echo "$CREATE_RESP" | jq .

SESSION_ID=$(echo "$CREATE_RESP" | jq -r '.sessionId')
JOIN_CODE=$(echo "$CREATE_RESP" | jq -r '.joinCode')
HOST_TOKEN=$(echo "$CREATE_RESP" | jq -r '.hostAuthToken')

echo ""
echo "Session ID: $SESSION_ID"
echo "Join Code: $JOIN_CODE"

echo ""
echo "=== Test 2: Lookup session by join code ==="
LOOKUP_RESP=$(curl -s "$BASE_URL/v1/sessions/by-code/$JOIN_CODE")
echo "$LOOKUP_RESP" | jq .

HAS_HOST=$(echo "$LOOKUP_RESP" | jq -r '.hasHost')
echo "Has Host: $HAS_HOST"

echo ""
echo "=== Test 3: iOS Host joins as HOST role ==="
JOIN_HOST_RESP=$(curl -s -X POST "$BASE_URL/v1/sessions/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d '{"name":"iOS Host","role":"host"}')
echo "$JOIN_HOST_RESP" | jq .

HOST_PLAYER_ID=$(echo "$JOIN_HOST_RESP" | jq -r '.playerId')
echo "Host Player ID: $HOST_PLAYER_ID"

echo ""
echo "=== Test 4: Verify hasHost flag is now true ==="
LOOKUP_RESP2=$(curl -s "$BASE_URL/v1/sessions/by-code/$JOIN_CODE")
HAS_HOST2=$(echo "$LOOKUP_RESP2" | jq -r '.hasHost')
echo "Has Host: $HAS_HOST2"

echo ""
echo "=== Test 5: Try to join as HOST again (should get 409) ==="
JOIN_HOST_AGAIN=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/v1/sessions/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d '{"name":"iOS Host 2","role":"host"}')
echo "$JOIN_HOST_AGAIN"

HTTP_CODE=$(echo "$JOIN_HOST_AGAIN" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" = "409" ]; then
  echo "✅ Correctly rejected duplicate HOST with 409"
else
  echo "❌ Expected 409, got $HTTP_CODE"
fi

echo ""
echo "=== Test 6: Player joins ==="
JOIN_PLAYER_RESP=$(curl -s -X POST "$BASE_URL/v1/sessions/$SESSION_ID/join" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Player"}')
echo "$JOIN_PLAYER_RESP" | jq .

echo ""
echo "=== Test 7: TV joins ==="
TV_JOIN_RESP=$(curl -s -X POST "$BASE_URL/v1/sessions/$SESSION_ID/tv" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$TV_JOIN_RESP" | jq .

echo ""
echo "✅ All unified flow tests completed!"
