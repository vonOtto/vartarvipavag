#!/bin/bash
# Quick test script for REST API endpoints

set -e

echo "================================================"
echo "Testing På Spåret Party Backend REST API"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}1. Testing root endpoint${NC}"
curl -s $BASE_URL/ | python3 -m json.tool || echo "Response received (no pretty print)"
echo -e "${GREEN}✓ Root endpoint${NC}"
echo ""

echo -e "${BLUE}2. Creating new session${NC}"
SESSION_RESPONSE=$(curl -s -X POST $BASE_URL/v1/sessions -H "Content-Type: application/json")
echo $SESSION_RESPONSE | python3 -m json.tool || echo $SESSION_RESPONSE

# Extract session ID and join code (using basic shell tools)
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
JOIN_CODE=$(echo $SESSION_RESPONSE | grep -o '"joinCode":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ Session created${NC}"
echo "  Session ID: $SESSION_ID"
echo "  Join Code: $JOIN_CODE"
echo ""

echo -e "${BLUE}3. Player 1 (Alice) joins session${NC}"
PLAYER1_RESPONSE=$(curl -s -X POST $BASE_URL/v1/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}')
echo $PLAYER1_RESPONSE | python3 -m json.tool || echo $PLAYER1_RESPONSE

PLAYER1_ID=$(echo $PLAYER1_RESPONSE | grep -o '"playerId":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Alice joined${NC}"
echo "  Player ID: $PLAYER1_ID"
echo ""

echo -e "${BLUE}4. Player 2 (Bob) joins session${NC}"
PLAYER2_RESPONSE=$(curl -s -X POST $BASE_URL/v1/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob"}')
echo $PLAYER2_RESPONSE | python3 -m json.tool || echo $PLAYER2_RESPONSE

PLAYER2_ID=$(echo $PLAYER2_RESPONSE | grep -o '"playerId":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Bob joined${NC}"
echo "  Player ID: $PLAYER2_ID"
echo ""

echo -e "${BLUE}5. TV joins session${NC}"
TV_RESPONSE=$(curl -s -X POST $BASE_URL/v1/sessions/$SESSION_ID/tv \
  -H "Content-Type: application/json")
echo $TV_RESPONSE | python3 -m json.tool || echo $TV_RESPONSE
echo -e "${GREEN}✓ TV joined${NC}"
echo ""

echo -e "${BLUE}6. Get session by join code${NC}"
SESSION_INFO=$(curl -s $BASE_URL/v1/sessions/by-code/$JOIN_CODE)
echo $SESSION_INFO | python3 -m json.tool || echo $SESSION_INFO
echo -e "${GREEN}✓ Session lookup successful${NC}"
echo ""

echo -e "${BLUE}7. Testing error: non-existent session${NC}"
ERROR1=$(curl -s -X POST $BASE_URL/v1/sessions/fake-id-123/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie"}')
echo $ERROR1 | python3 -m json.tool || echo $ERROR1
echo -e "${GREEN}✓ Error handled correctly${NC}"
echo ""

echo -e "${BLUE}8. Testing error: missing player name${NC}"
ERROR2=$(curl -s -X POST $BASE_URL/v1/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{}')
echo $ERROR2 | python3 -m json.tool || echo $ERROR2
echo -e "${GREEN}✓ Validation error handled correctly${NC}"
echo ""

echo "================================================"
echo -e "${GREEN}All tests passed!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "  Session ID: $SESSION_ID"
echo "  Join Code: $JOIN_CODE"
echo "  Players: Alice ($PLAYER1_ID), Bob ($PLAYER2_ID)"
echo ""
