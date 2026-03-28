#!/bin/bash
# Frontend Deployment Script
# Ensures correct sequence: regenerate bindings → clean build → verify → deploy
# This script is the authoritative deployment workflow for the frontend

set -e  # Exit on any error

echo "🚀 Starting frontend deployment workflow..."
echo "📅 Build started at: $(date)"

# ─────────────────────────────────────────────
# Step 1: Regenerate backend bindings
# ─────────────────────────────────────────────
echo ""
echo "📦 Step 1/5: Regenerating backend bindings..."
dfx generate backend
echo "✅ Backend bindings regenerated"

# ─────────────────────────────────────────────
# Step 2: Verify canister ID is available
# ─────────────────────────────────────────────
echo ""
echo "🔍 Step 2/5: Verifying backend canister ID..."

BACKEND_CANISTER_ID=$(dfx canister id backend 2>/dev/null || echo "")

if [ -z "$BACKEND_CANISTER_ID" ]; then
  echo "❌ ERROR: Could not retrieve backend canister ID."
  echo "   Make sure the backend canister is deployed: dfx deploy backend"
  exit 1
fi

echo "✅ Backend canister ID: $BACKEND_CANISTER_ID"
export VITE_CANISTER_ID_BACKEND="$BACKEND_CANISTER_ID"

# Also export frontend canister ID if available
FRONTEND_CANISTER_ID=$(dfx canister id frontend 2>/dev/null || echo "")
if [ -n "$FRONTEND_CANISTER_ID" ]; then
  echo "✅ Frontend canister ID: $FRONTEND_CANISTER_ID"
  export VITE_CANISTER_ID_FRONTEND="$FRONTEND_CANISTER_ID"
fi

# ─────────────────────────────────────────────
# Step 3: Clean build artifacts (cache-busting)
# ─────────────────────────────────────────────
echo ""
echo "🧹 Step 3/5: Cleaning build artifacts (cache-busting)..."
rm -rf frontend/dist
rm -rf frontend/.vite
# Also clear any node_modules/.vite cache
rm -rf frontend/node_modules/.vite 2>/dev/null || true
echo "✅ Build artifacts cleaned"

# ─────────────────────────────────────────────
# Step 4: Build frontend with timestamp
# ─────────────────────────────────────────────
echo ""
echo "🔨 Step 4/5: Building frontend..."
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_BUILD_TIMESTAMP="$BUILD_TIMESTAMP"

cd frontend
VITE_CANISTER_ID_BACKEND="$BACKEND_CANISTER_ID" \
VITE_BUILD_TIMESTAMP="$BUILD_TIMESTAMP" \
npm run build:skip-bindings
cd ..
echo "✅ Frontend built successfully (timestamp: $BUILD_TIMESTAMP)"

# Verify the build contains the correct canister ID
if [ -f "frontend/dist/env.json" ]; then
  echo "📋 env.json contents:"
  cat frontend/dist/env.json
fi

# ─────────────────────────────────────────────
# Step 5: Deploy frontend canister
# ─────────────────────────────────────────────
echo ""
echo "🌐 Step 5/5: Deploying frontend canister..."
dfx deploy frontend
echo "✅ Frontend canister deployed"

# ─────────────────────────────────────────────
# Verification summary
# ─────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo "════════════════════════════════════════════"
echo ""
echo "📋 Deployment summary:"
echo "  Backend Canister ID : $BACKEND_CANISTER_ID"
if [ -n "$FRONTEND_CANISTER_ID" ]; then
  echo "  Frontend Canister ID: $FRONTEND_CANISTER_ID"
  echo "  App URL             : https://${FRONTEND_CANISTER_ID}.icp0.io"
fi
echo "  Build timestamp     : $BUILD_TIMESTAMP"
echo ""
echo "📋 Next steps:"
echo "  1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  2. Verify backend canister ID in app's 'Informacije o implementaciji' dialog"
echo "  3. Check that the app loads without 'Backend Canister ID nije konfiguriran' error"
echo ""
echo "🔍 Troubleshooting:"
echo "  - If you still see the error, check frontend/dist/env.json for correct canister ID"
echo "  - Verify .ic-assets.json5 is present in frontend/ directory"
echo "  - Check browser DevTools Network tab to confirm index.html is not cached (200, not 304)"
echo "  - Try opening the app in an incognito/private window to bypass browser cache"
