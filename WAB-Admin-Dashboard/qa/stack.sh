#!/bin/sh
# Local REAL stack for testing the admin panel against WAB-Server: MongoDB (replica set), Redis, MinIO (S3) and the server
# (fake OTP/notifier/payment providers, real storage). Needs mongod, mongosh, redis-server, minio and mc on the PATH and the
# server built (`npm ci && npm run build` in ../WAB-Server). Local development only: the passwords below are throw-away.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="${SERVER_DIR:-$HERE/../../WAB-Server}"
Q="${QA_DIR:-${TMPDIR:-/tmp}/wab-qa}"
API_PORT="${API_PORT:-4000}"
ADMIN_ORIGINS="${ADMIN_ORIGINS:-http://localhost:4173,http://localhost:4174}"
MINIO_USER=qaminio
MINIO_PASS=qaminiopass123
mkdir -p "$Q/mongo" "$Q/redis" "$Q/minio" "$Q/mc"

if ! pgrep -f "mongod.*27018" >/dev/null; then
  nohup mongod --dbpath "$Q/mongo" --replSet rs0 --port 27018 --bind_ip 127.0.0.1 --logpath "$Q/mongod.log" >/dev/null 2>&1 &
  sleep 4
  mongosh --quiet --port 27018 --eval 'try{rs.status().ok}catch(e){rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27018"}]}).ok}'
fi
if ! pgrep -f "redis-server.*6380" >/dev/null; then
  nohup redis-server --port 6380 --bind 127.0.0.1 --dir "$Q/redis" --save "" >"$Q/redis.log" 2>&1 &
  sleep 1
fi
if ! pgrep -f "minio server" >/dev/null; then
  MINIO_ROOT_USER=$MINIO_USER MINIO_ROOT_PASSWORD=$MINIO_PASS MINIO_API_CORS_ALLOW_ORIGIN='*' \
    nohup minio server "$Q/minio" --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 >"$Q/minio.log" 2>&1 &
  sleep 3
fi
export MC_CONFIG_DIR="$Q/mc"
mc alias set qa http://127.0.0.1:9000 "$MINIO_USER" "$MINIO_PASS" >/dev/null
mc mb --ignore-existing qa/wab-public qa/wab-private >/dev/null
mc anonymous set download qa/wab-public >/dev/null

cd "$SERVER_DIR"
export NODE_ENV=development PORT="$API_PORT" LOG_LEVEL=info
# Fake external providers: WAB-Server/.env.development may enable the real notifier, whose key is not set locally.
export NOTIFIER_PROVIDER=fake OTP_PROVIDER=fake PAYMENT_PROVIDER=fake
export MONGODB_URI='mongodb://127.0.0.1:27018/wab_qa?replicaSet=rs0' REDIS_URL='redis://127.0.0.1:6380'
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-qa-local-secret-qa-local-secret-qa-local-1234}"
export CORS_ALLOWED_ORIGINS="$ADMIN_ORIGINS"
export ADMIN_EMAIL="${ADMIN_EMAIL:-qa.admin@wab.example}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-QaAdminPass#2026}"
export PAYOUT_ENCRYPTION_KEY="${PAYOUT_ENCRYPTION_KEY:-$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')}"
export STORAGE_PROVIDER=real S3_REGION=us-east-1 S3_PUBLIC_BUCKET=wab-public S3_PRIVATE_BUCKET=wab-private
export S3_ENDPOINT=http://127.0.0.1:9000 S3_FORCE_PATH_STYLE=true S3_ACCESS_KEY_ID="$MINIO_USER" S3_SECRET_ACCESS_KEY="$MINIO_PASS"
export CDN_BASE_URL=http://127.0.0.1:9000/wab-public
node dist/seeds/run.js >/dev/null 2>&1 || true
node dist/seeds/runDemo.js >/dev/null 2>&1 || true
node dist/seeds/runAdmin.js >/dev/null 2>&1 || true
pkill -f "node dist/server.js" 2>/dev/null || true
sleep 1
nohup node dist/server.js >"$Q/server.log" 2>&1 &
sleep 5
curl -s -o /dev/null -w "server health %{http_code}\n" "http://127.0.0.1:$API_PORT/health"
echo "STACK-READY (logs in $Q). Admin: $ADMIN_EMAIL / $ADMIN_PASSWORD; API http://127.0.0.1:$API_PORT"
