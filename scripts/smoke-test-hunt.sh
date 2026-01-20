#!/bin/bash
# Smoke test script for Hunt API endpoints
# Tests that JWT-based identity works correctly

API_URL="${API_URL:-http://localhost:5000}"
TOKEN=""
USER_ID=""

echo "=== Hunt API Smoke Test ==="
echo "API URL: $API_URL"
echo ""

# Step 1: Dev login to get JWT token
echo "1. Dev login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d '{"testUserId": "smoke_test_user"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "   FAIL: Could not get auth token"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "   OK: Got token for user $USER_ID"

# Step 2: Test /api/hunt/economy/me
echo ""
echo "2. Test GET /api/hunt/economy/me..."
ECONOMY_RESPONSE=$(curl -s -X GET "$API_URL/api/hunt/economy/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ECONOMY_RESPONSE" | grep -q '"economy"'; then
  echo "   OK: Economy endpoint works"
  echo "   Energy: $(echo "$ECONOMY_RESPONSE" | grep -o '"energy":[0-9]*' | cut -d':' -f2)"
else
  echo "   FAIL: Economy endpoint failed"
  echo "   Response: $ECONOMY_RESPONSE"
fi

# Step 3: Test /api/hunt/collection/me
echo ""
echo "3. Test GET /api/hunt/collection/me..."
COLLECTION_RESPONSE=$(curl -s -X GET "$API_URL/api/hunt/collection/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$COLLECTION_RESPONSE" | grep -q '"creatures"'; then
  echo "   OK: Collection endpoint works"
else
  echo "   FAIL: Collection endpoint failed"
  echo "   Response: $COLLECTION_RESPONSE"
fi

# Step 4: Test /api/hunt/eggs/me
echo ""
echo "4. Test GET /api/hunt/eggs/me..."
EGGS_RESPONSE=$(curl -s -X GET "$API_URL/api/hunt/eggs/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$EGGS_RESPONSE" | grep -q '"eggs"'; then
  echo "   OK: Eggs endpoint works"
else
  echo "   FAIL: Eggs endpoint failed"
  echo "   Response: $EGGS_RESPONSE"
fi

# Step 5: Test /api/hunt/me (Phase I stats)
echo ""
echo "5. Test GET /api/hunt/me..."
ME_RESPONSE=$(curl -s -X GET "$API_URL/api/hunt/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q '"huntsToday"'; then
  echo "   OK: /api/hunt/me endpoint works"
  echo "   Hunts today: $(echo "$ME_RESPONSE" | grep -o '"huntsToday":[0-9]*' | cut -d':' -f2)"
else
  echo "   FAIL: /api/hunt/me endpoint failed"
  echo "   Response: $ME_RESPONSE"
fi

# Step 6: Test location update (no walletAddress in body)
echo ""
echo "6. Test POST /api/hunt/location..."
LOCATION_RESPONSE=$(curl -s -X POST "$API_URL/api/hunt/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}')

if echo "$LOCATION_RESPONSE" | grep -q '"success"'; then
  echo "   OK: Location update works (no walletAddress in body)"
else
  echo "   FAIL: Location update failed"
  echo "   Response: $LOCATION_RESPONSE"
fi

echo ""
echo "=== Smoke Test Complete ==="
