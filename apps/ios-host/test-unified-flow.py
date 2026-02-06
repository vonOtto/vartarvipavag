#!/usr/bin/env python3
"""
Test unified session creation flow:
- iOS Host and tvOS can both create or join sessions
- Backend validates duplicate HOST role (409 Conflict)
"""
import json
import requests
import sys

BASE_URL = "http://localhost:3000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test_unified_flow():
    try:
        # Test 1: Create session
        print_section("Test 1: Create session")
        resp = requests.post(f"{BASE_URL}/v1/sessions", json={})
        resp.raise_for_status()
        create_data = resp.json()
        print(json.dumps(create_data, indent=2))

        session_id = create_data['sessionId']
        join_code = create_data['joinCode']
        print(f"\n✓ Session created: {session_id}")
        print(f"✓ Join code: {join_code}")

        # Test 2: Lookup session by join code
        print_section("Test 2: Lookup session by join code")
        resp = requests.get(f"{BASE_URL}/v1/sessions/by-code/{join_code}")
        resp.raise_for_status()
        lookup_data = resp.json()
        print(json.dumps(lookup_data, indent=2))
        print(f"\n✓ Has host: {lookup_data.get('hasHost', False)}")

        # Test 3: iOS Host joins as HOST role
        print_section("Test 3: iOS Host joins as HOST role")
        resp = requests.post(
            f"{BASE_URL}/v1/sessions/{session_id}/join",
            json={"name": "iOS Host", "role": "host"}
        )
        resp.raise_for_status()
        host_data = resp.json()
        print(json.dumps(host_data, indent=2))
        print(f"\n✓ iOS Host joined with playerId: {host_data['playerId']}")

        # Test 4: Verify hasHost flag is now true
        print_section("Test 4: Verify hasHost flag is now true")
        resp = requests.get(f"{BASE_URL}/v1/sessions/by-code/{join_code}")
        resp.raise_for_status()
        lookup_data2 = resp.json()
        has_host = lookup_data2.get('hasHost', False)
        print(f"Has host: {has_host}")
        if has_host:
            print("✓ hasHost flag correctly set to true")
        else:
            print("✗ ERROR: hasHost should be true")
            return False

        # Test 5: Try to join as HOST again (should get 409)
        print_section("Test 5: Try to join as HOST again (expect 409)")
        resp = requests.post(
            f"{BASE_URL}/v1/sessions/{session_id}/join",
            json={"name": "iOS Host 2", "role": "host"}
        )
        if resp.status_code == 409:
            print(f"✓ Correctly rejected duplicate HOST with 409")
            print(f"Response: {resp.json()}")
        else:
            print(f"✗ ERROR: Expected 409, got {resp.status_code}")
            print(f"Response: {resp.text}")
            return False

        # Test 6: Regular player joins
        print_section("Test 6: Regular player joins")
        resp = requests.post(
            f"{BASE_URL}/v1/sessions/{session_id}/join",
            json={"name": "Test Player"}
        )
        resp.raise_for_status()
        player_data = resp.json()
        print(json.dumps(player_data, indent=2))
        print(f"\n✓ Player joined: {player_data['playerId']}")

        # Test 7: TV joins (REST endpoint issues token)
        print_section("Test 7: TV joins")
        resp = requests.post(f"{BASE_URL}/v1/sessions/{session_id}/tv", json={})
        resp.raise_for_status()
        tv_data = resp.json()
        print(json.dumps(tv_data, indent=2))
        print(f"\n✓ TV token issued successfully")
        print("  Note: Duplicate TV validation happens at WebSocket level (code 4009)")

        print_section("✅ All unified REST flow tests PASSED!")
        return True

    except requests.exceptions.ConnectionError:
        print(f"\n✗ ERROR: Cannot connect to backend at {BASE_URL}")
        print("Make sure the backend service is running on port 3000")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_unified_flow()
    sys.exit(0 if success else 1)
