#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
  TESTS_RUN=$((TESTS_RUN + 1))
  echo -e "${YELLOW}[TEST $TESTS_RUN] $1${NC}"
}

pass() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✅ PASS${NC}\n"
}

fail() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}❌ FAIL: $1${NC}\n"
}

# API Base URL
API_URL="http://localhost:4001"

# Test 1: Check services
print_header "1. TESTING SERVICES STATUS"

print_test "All services running"
RUNNING=$(docker compose ps --format "{{.Status}}" | grep -c "Up")
if [ "$RUNNING" -eq 6 ]; then
  pass
else
  fail "Expected 6 services running (mongo, redis, minio, api, worker, client), got $RUNNING"
fi

# Test 2: Health check
print_header "2. TESTING API HEALTH"

print_test "API health check"
RESPONSE=$(curl -s "$API_URL/health")
if echo "$RESPONSE" | grep -q '"ok":true'; then
  pass
else
  fail "Health check failed: $RESPONSE"
fi

# Test 3: Upload test files
print_header "3. TESTING FILE UPLOAD"

# Create a test image (simple PNG)
print_test "Create and upload test image"
python3 << 'PYTHON_TEST'
import requests
import base64
import json
from PIL import Image
import io

# Create a simple test image
img = Image.new('RGB', (100, 100), color='red')
img_bytes = io.BytesIO()
img.save(img_bytes, format='PNG')
img_data = base64.b64encode(img_bytes.getvalue()).decode()

# Upload
response = requests.post(
    'http://localhost:4001/api/upload',
    json={
        'originalName': 'test-image.png',
        'mimeType': 'image/png',
        'data': img_data
    },
    timeout=10
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code in [200, 201, 202]:
    data = response.json()
    asset_id = data.get('assetId')
    print(f"Asset ID: {asset_id}")
    with open('/tmp/asset_id.txt', 'w') as f:
        f.write(asset_id)
PYTHON_TEST

if [ $? -eq 0 ]; then
  pass
else
  fail "Image upload failed"
fi

# Test 4: Check assets list
print_header "4. TESTING ASSET RETRIEVAL"

print_test "Get all assets"
RESPONSE=$(curl -s "$API_URL/api/assets")
ASSET_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")

if [ "$ASSET_COUNT" -gt 0 ]; then
  echo "Found $ASSET_COUNT asset(s)"
  pass
else
  fail "No assets found or JSON parse error"
fi

# Test 5: Get asset stats
print_header "5. TESTING ASSET STATISTICS"

print_test "Get asset stats"
RESPONSE=$(curl -s "$API_URL/api/stats")
if echo "$RESPONSE" | grep -q "total"; then
  TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('total', 0))" 2>/dev/null)
  echo "Total assets: $TOTAL"
  pass
else
  fail "Stats endpoint failed: $RESPONSE"
fi

# Test 6: Wait for processing and check status
print_header "6. TESTING MEDIA PROCESSING"

print_test "Wait for asset processing (30 seconds)"
ASSET_ID=$(cat /tmp/asset_id.txt 2>/dev/null)
if [ -z "$ASSET_ID" ]; then
  fail "No asset ID found from upload"
else
  # Poll for status changes
  for i in {1..30}; do
    RESPONSE=$(curl -s "$API_URL/api/assets/$ASSET_ID")
    STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'UNKNOWN'))" 2>/dev/null)
    
    if [ "$STATUS" = "PROCESSED" ] || [ "$STATUS" = "PROCESSED_NO_FILE" ]; then
      echo "Status: $STATUS"
      pass
      break
    elif [ "$STATUS" = "FAILED" ]; then
      ERROR=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', ''))" 2>/dev/null)
      fail "Processing failed: $ERROR"
      break
    else
      echo "Status: $STATUS (attempt $i/30)"
      sleep 1
    fi
  done
fi

# Test 7: Check metadata extraction
print_header "7. TESTING METADATA EXTRACTION"

print_test "Check asset metadata"
if [ -n "$ASSET_ID" ]; then
  RESPONSE=$(curl -s "$API_URL/api/assets/$ASSET_ID")
  METADATA=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); m=data.get('metadata', {}); print(json.dumps(m))" 2>/dev/null)
  
  if [ ! -z "$METADATA" ] && [ "$METADATA" != "{}" ]; then
    echo "Metadata: $METADATA"
    pass
  else
    fail "No metadata found"
  fi
else
  fail "No asset ID"
fi

# Test 8: Frontend accessibility
print_header "8. TESTING FRONTEND ACCESSIBILITY"

print_test "Frontend accessible on port 3001"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$RESPONSE" = "200" ]; then
  pass
else
  fail "Frontend returned HTTP $RESPONSE"
fi

# Test 9: Verify database connectivity
print_header "9. TESTING DATABASE CONNECTIVITY"

print_test "MongoDB accessibility"
MONGO_RESPONSE=$(docker exec media_mongo mongosh --eval "1" 2>&1 | grep -c "1" || echo "0")
if [ "$(echo "$MONGO_RESPONSE" | head -c 1)" -ne 0 ]; then
  pass
else
  fail "MongoDB not responding"
fi

# Test 10: Verify worker is processing
print_header "10. TESTING WORKER PROCESSING"

print_test "Worker logs show job processing"
WORKER_LOGS=$(docker logs media_worker 2>&1 | grep -c "🔄 Processing" || echo 0)
if [ "$WORKER_LOGS" -gt 0 ]; then
  echo "Found $WORKER_LOGS processing jobs in worker logs"
  pass
else
  fail "No processing jobs found in worker logs"
fi

# Final Summary
print_header "TEST SUMMARY"

echo -e "Total Tests: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
echo -e "\nPass Rate: ${GREEN}$PASS_RATE%${NC}"

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "\n${GREEN}✨ ALL TESTS PASSED! ✨${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  SOME TESTS FAILED${NC}"
  exit 1
fi
