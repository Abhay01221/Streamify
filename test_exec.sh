#!/bin/sh
set -e

PAYLOAD='{"source_code":"print(1+1)","language_id":71,"stdin":""}'

echo "=== Submitting to Judge0 ==="
RESPONSE=$(curl -s -X POST "http://localhost:2358/submissions?base64_encoded=false&wait=false" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
echo "Submit response: $RESPONSE"

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "ERROR: No token received"
  exit 1
fi

echo "=== Polling for result (5s) ==="
sleep 5
RESULT=$(curl -s "http://localhost:2358/submissions/${TOKEN}?base64_encoded=false")
echo "Result: $RESULT"

STATUS=$(echo "$RESULT" | grep -o '"description":"[^"]*"' | head -1 | cut -d'"' -f4)
STDOUT=$(echo "$RESULT" | grep -o '"stdout":"[^"]*"' | cut -d'"' -f4)
STDERR=$(echo "$RESULT" | grep -o '"stderr":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "=== Summary ==="
echo "Status: $STATUS"
echo "Stdout: $STDOUT"
echo "Stderr: $STDERR"
