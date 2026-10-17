#!/bin/sh
set -e

BASE="http://localhost:5000"

echo "=== Step 1: Login ==="
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coders.dev","password":"Admin@123"}' \
  -m 10)
echo "Login response: $LOGIN"

TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

if [ -z "$TOKEN" ]; then
  echo "ERROR: No token"
  exit 1
fi

echo ""
echo "=== Step 2: Submit print(1+1) as Run ==="
SUB=$(curl -s -X POST "$BASE/api/submissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"problemSlug":"two-sum","language":"python","code":"print(1+1)","isRun":true,"customInput":""}' \
  -m 10)
echo "Submit response: $SUB"

SUB_ID=$(echo "$SUB" | grep -o '"submissionId":"[^"]*"' | cut -d'"' -f4)
echo "Submission ID: $SUB_ID"

echo ""
echo "=== Step 3: Wait 15s for Piston execution ==="
sleep 15

echo ""
echo "=== Step 4: Check submission status ==="
RESULT=$(curl -s "$BASE/api/submissions/$SUB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -m 10)
echo "Status: $(echo $RESULT | grep -o '"status":"[^"]*"' | head -1)"
echo "Full: $RESULT"
