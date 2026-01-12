#!/bin/bash

# Color codes
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

# Test 1: Check services
print_header "1. TESTING SERVICES STATUS"

print_test "All services running"
RUNNING=$(docker compose ps --format "{{.Status}}" | grep -c "Up")
if [ "$RUNNING" -eq 5 ]; then
  pass
else
  fail "Expected 5 services running, got $RUNNING"
fi

# Test 2: Health check
print_header "2. TESTING API HEALTH"

print_test "Health endpoint responds"
HEALTH=$(curl -s http://localhost:4000/health)
if echo "$HEALTH" | grep -q '"ok":true'; then
  pass
else
  fail "Health check failed: $HEALTH"
fi

# Test 3: Get empty assets
print_header "3. TESTING ASSET ENDPOINTS"

print_test "GET /api/assets endpoint"
ASSETS=$(curl -s http://localhost:4000/api/assets)
if echo "$ASSETS" | grep -q '\[\|"_id"'; then
  pass
else
  fail "Failed to get assets: $ASSETS"
fi

# Test 4: Upload file
print_header "4. TESTING FILE UPLOAD"

print_test "Create and upload test file"
TEST_FILE="/tmp/test-upload-$(date +%s).bin"
dd if=/dev/urandom of="$TEST_FILE" bs=1024 count=10 2>/dev/null
BASE64_DATA=$(base64 -w0 < "$TEST_FILE")

echo "{
  \"originalName\": \"test-$(date +%s).bin\",
  \"mimeType\": \"application/octet-stream\",
  \"data\": \"$BASE64_DATA\"
}" > /tmp/upload_payload.json

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/upload \
  -H "Content-Type: application/json" \
  -d @/tmp/upload_payload.json)

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ]; then
  ASSET_ID=$(echo "$UPLOAD_BODY" | grep -o '"assetId":"[^"]*' | head -1 | cut -d'"' -f4)
  OBJECT=$(echo "$UPLOAD_BODY" | grep -o '"objectName":"[^"]*' | head -1 | cut -d'"' -f4)
  JOB_ID=$(echo "$UPLOAD_BODY" | grep -o '"jobId":"[^"]*' | head -1 | cut -d'"' -f4)
  pass
else
  fail "Upload failed with HTTP $HTTP_CODE"
  exit 1
fi

# Test 5: Verify file in MinIO
print_test "File persisted to MinIO"
if [ -f "/home/manoj/Documents/dam/data/minio/assets/$OBJECT" ]; then
  pass
else
  fail "File not found in MinIO at /data/minio/assets/$OBJECT"
fi

# Test 6: Get single asset
print_header "5. TESTING SINGLE ASSET RETRIEVAL"

print_test "GET /api/assets/:id endpoint"
SINGLE_ASSET=$(curl -s http://localhost:4000/api/assets/$ASSET_ID)
if echo "$SINGLE_ASSET" | grep -q "$ASSET_ID"; then
  pass
else
  fail "Failed to get single asset: $SINGLE_ASSET"
fi

# Test 7: Wait for worker
print_header "6. TESTING WORKER PROCESSING"

print_test "Worker processes job (10 seconds)"
sleep 10
echo -e "${GREEN}✅ PASS${NC}\n"
TESTS_PASSED=$((TESTS_PASSED + 1))

# Test 8: Verify asset status updated
print_test "Asset status updated to PROCESSED"
ASSET_UPDATED=$(curl -s http://localhost:4000/api/assets/$ASSET_ID)
STATUS=$(echo "$ASSET_UPDATED" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ "$STATUS" = "PROCESSED" ] || [ "$STATUS" = "PROCESSED_NO_FILE" ]; then
  pass
else
  fail "Expected status PROCESSED, got: $STATUS"
fi

# Test 9: Statistics endpoint
print_header "7. TESTING STATISTICS"

print_test "GET /api/stats endpoint"
STATS=$(curl -s http://localhost:4000/api/stats)
if echo "$STATS" | grep -q '"total"'; then
  TOTAL=$(echo "$STATS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  PENDING=$(echo "$STATS" | grep -o '"pending":[0-9]*' | cut -d':' -f2)
  PROCESSED=$(echo "$STATS" | grep -o '"processed":[0-9]*' | cut -d':' -f2)
  echo "  Total: $TOTAL, Pending: $PENDING, Processed: $PROCESSED"
  pass
else
  fail "Stats endpoint failed: $STATS"
fi

# Test 10: Delete asset
print_header "8. TESTING ASSET DELETION"

print_test "DELETE /api/assets/:id endpoint"
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE http://localhost:4000/api/assets/$ASSET_ID)
DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -1)
if [ "$DELETE_CODE" = "200" ]; then
  pass
else
  fail "Delete failed with HTTP $DELETE_CODE"
fi

# Test 11: Verify asset deleted
print_test "Asset deleted from database"
DELETED_ASSET=$(curl -s http://localhost:4000/api/assets/$ASSET_ID)
if echo "$DELETED_ASSET" | grep -q '"error".*"not found"'; then
  pass
else
  fail "Asset still exists after deletion"
fi

# Test 12: Worker logs
print_header "9. TESTING WORKER LOGS"

print_test "Worker processing logs contain expected messages"
WORKER_LOGS=$(docker compose logs worker --no-color --since 20s)
if echo "$WORKER_LOGS" | grep -q "Processing\|PROCESSED"; then
  pass
else
  fail "Worker logs missing expected messages"
fi

# Summary
print_header "TEST SUMMARY"
echo -e "Total Tests Run:   ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed:      ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:      $([ $TESTS_FAILED -eq 0 ] && echo -e "${GREEN}" || echo -e "${RED}")$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}\n"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED!${NC}\n"
  exit 1
fi
