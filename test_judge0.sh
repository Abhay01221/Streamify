#!/bin/sh
TOKEN=$(curl -s -X POST "http://localhost:2358/submissions?base64_encoded=false&wait=false" \
  -H "Content-Type: application/json" \
  -d '{"source_code":"print(\"hello\")","language_id":71,"stdin":""}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
sleep 4
RESULT=$(curl -s "http://localhost:2358/submissions/$TOKEN?base64_encoded=false")
echo "Result: $RESULT"