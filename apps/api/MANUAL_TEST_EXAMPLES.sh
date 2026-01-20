#!/bin/bash

# Quick Manual Test Examples
# Copy-paste these commands to test the API

set -e

echo "=== File Upload API Testing Commands ==="
echo ""

echo "1. Health Check"
echo "curl http://localhost:3000/health"
echo ""
echo "Expected: {\"ok\":true,\"db\":true,\"service\":true}"
echo ""
echo "---"
echo ""

echo "2. Get Statistics"
echo "curl http://localhost:3000/api/assets/stats"
echo ""
echo "Expected: {\"success\":true,\"data\":{\"total\":0,\"pending\":0,\"processed\":0,\"failed\":0}}"
echo ""
echo "---"
echo ""

echo "3. Get All Assets (Empty)"
echo "curl http://localhost:3000/api/assets"
echo ""
echo "Expected: {\"success\":true,\"data\":[]}"
echo ""
echo "---"
echo ""

echo "4. Create Test File & Upload"
cat << 'EOF'

# Create test file
echo "Test content created at $(date)" > /tmp/test.txt

# Convert to base64
BASE64=$(cat /tmp/test.txt | base64 -w0)

# Upload
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"originalName\": \"test.txt\",
    \"mimeType\": \"text/plain\",
    \"data\": \"$BASE64\"
  }"

# Expected Response:
# {
#   "success": true,
#   "message": "File uploaded and processing started",
#   "data": {
#     "assetId": "507f1f77bcf86cd799439011",
#     "objectName": "uploads/1234567890-test.txt",
#     "jobId": "123",
#     "filename": "test.txt",
#     "size": 45,
#     "status": "PENDING"
#   }
# }

# Save the assetId for next tests!
ASSET_ID="507f1f77bcf86cd799439011"  # Replace with actual ID from response

EOF

echo ""
echo "---"
echo ""

echo "5. Get Specific Asset (replace ASSET_ID)"
echo 'curl http://localhost:3000/api/assets/ASSET_ID'
echo ""
echo "Expected: Asset details with status PENDING"
echo ""
echo "---"
echo ""

echo "6. List Assets with Pagination"
echo "curl 'http://localhost:3000/api/assets?page=1&pageSize=10'"
echo ""
echo "Expected: {\"success\":true,\"data\":[...],\"total\":1,\"page\":1,\"pageSize\":10}"
echo ""
echo "---"
echo ""

echo "7. Get Presigned URL"
echo "curl 'http://localhost:3000/api/upload/url?fileName=document.pdf'"
echo ""
echo "Expected: Presigned URL valid for 5 minutes"
echo ""
echo "---"
echo ""

echo "8. Finalize Upload (after presigned upload)"
cat << 'EOF'

curl -X POST http://localhost:3000/api/upload/finalize \
  -H "Content-Type: application/json" \
  -d "{
    \"objectName\": \"uploads/1234567890-document.pdf\",
    \"originalName\": \"document.pdf\",
    \"mimeType\": \"application/pdf\",
    \"size\": 2048
  }"

# Expected: Asset created and queued for processing

EOF

echo ""
echo "---"
echo ""

echo "9. Delete Asset (replace ASSET_ID)"
echo 'curl -X DELETE http://localhost:3000/api/assets/ASSET_ID'
echo ""
echo "Expected: {\"success\":true,\"message\":\"Asset deleted successfully\"}"
echo ""
echo "---"
echo ""

echo "10. Verify Asset Deleted"
echo 'curl http://localhost:3000/api/assets'
echo ""
echo "Expected: Empty array or fewer assets"
echo ""
echo "---"
echo ""

echo "=== Upload Different File Types ==="
echo ""

echo "A. Upload JSON File"
cat << 'EOF'

echo '{
  "name": "Test",
  "type": "JSON"
}' > /tmp/test.json

BASE64=$(cat /tmp/test.json | base64 -w0)

curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"originalName\": \"test.json\",
    \"mimeType\": \"application/json\",
    \"data\": \"$BASE64\"
  }"

EOF

echo ""
echo "---"
echo ""

echo "B. Upload CSV File"
cat << 'EOF'

echo 'id,name,email
1,John,john@example.com
2,Jane,jane@example.com' > /tmp/test.csv

BASE64=$(cat /tmp/test.csv | base64 -w0)

curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"originalName\": \"test.csv\",
    \"mimeType\": \"text/csv\",
    \"data\": \"$BASE64\"
  }"

EOF

echo ""
echo "---"
echo ""

echo "=== Error Testing ==="
echo ""

echo "1. Missing Required Field"
echo 'curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{\"mimeType\":\"text/plain\"}"'
echo ""
echo "Expected: 400 - Missing originalName and data"
echo ""

echo "2. Non-existent Asset"
echo 'curl http://localhost:3000/api/assets/nonexistent'
echo ""
echo "Expected: 404 - Asset not found"
echo ""

echo "3. Invalid Page Number"
echo 'curl "http://localhost:3000/api/assets?page=invalid"'
echo ""
echo "Expected: Page defaults to 1"
echo ""

echo ""
echo "=== Performance Testing ==="
echo ""

echo "Test Multiple Uploads (Concurrent)"
cat << 'EOF'

for i in {1..5}; do
  echo "Uploading file $i..."
  echo "File $i content" > /tmp/file_$i.txt
  BASE64=$(cat /tmp/file_$i.txt | base64 -w0)
  
  curl -X POST http://localhost:3000/api/upload \
    -H "Content-Type: application/json" \
    -d "{
      \"originalName\": \"file_$i.txt\",
      \"mimeType\": \"text/plain\",
      \"data\": \"$BASE64\"
    }" &
done

wait
echo "All uploads completed!"

# Check stats
curl http://localhost:3000/api/assets/stats

EOF

echo ""
echo "=== Response Format Examples ==="
echo ""

echo "Success Response:"
cat << 'EOF'
{
  "success": true,
  "data": {
    "assetId": "507f1f77bcf86cd799439011",
    "objectName": "uploads/1234567890-file.txt",
    "jobId": "123",
    "filename": "file.txt",
    "size": 1024,
    "status": "PENDING"
  },
  "statusCode": 201
}
EOF

echo ""

echo "Error Response:"
cat << 'EOF'
{
  "success": false,
  "error": "Asset not found",
  "details": "Cannot find asset with ID: xyz",
  "statusCode": 404
}
EOF

echo ""

echo "Stats Response:"
cat << 'EOF'
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 2,
    "processed": 2,
    "failed": 1
  },
  "statusCode": 200
}
EOF

echo ""
echo "=== Docker Commands ==="
echo ""

echo "View API logs:"
echo "docker logs media_api -f"
echo ""

echo "View MinIO logs:"
echo "docker logs minio -f"
echo ""

echo "Check MongoDB:"
echo "docker exec -it mongo mongosh"
echo "  use dam"
echo "  db.assets.find().pretty()"
echo ""

echo "=== Useful Variables ==="
echo ""

echo "Set these in your shell to test quickly:"
cat << 'EOF'

API="http://localhost:3000"

# After first upload, save ASSET_ID
ASSET_ID="<save_from_response>"

# Quick test commands
alias api-health="curl $API/health"
alias api-list="curl $API/api/assets"
alias api-stats="curl $API/api/assets/stats"
alias api-get="curl $API/api/assets/$ASSET_ID"
alias api-delete="curl -X DELETE $API/api/assets/$ASSET_ID"

EOF

echo ""
echo "=== Cleanup ==="
echo ""

echo "Remove test files:"
echo "rm -f /tmp/test.* /tmp/file_*.txt"
echo ""

echo "Clear all assets from database:"
echo "docker exec -it mongo mongosh"
echo "  use dam"
echo "  db.assets.deleteMany({})"
echo ""

echo "=== Complete! ==="
echo ""
echo "Next: Run ./test-upload.sh for automated testing"
