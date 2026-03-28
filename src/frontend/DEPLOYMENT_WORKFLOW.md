# Frontend Deployment Workflow

This document describes the correct workflow for deploying the frontend after backend changes, ensuring the frontend always uses the correct backend canister ID and that users receive the latest build without cache issues.

## Problem

After recreating or redeploying the backend canister, two issues can occur:

1. **Backend receives a new canister ID**: If the frontend is not updated with this new ID, it will attempt to connect to the old (non-existent) canister, resulting in connection failures and "Actor not available" errors.

2. **Browser caches stale frontend**: Even after redeploying the frontend with the correct canister ID, browsers may serve a cached version of `index.html` that contains the old configuration, showing the "Backend Canister ID nije konfiguriran" error.

## Solution: Cache-Control Configuration

The frontend now includes `.ic-assets.json5` which configures the IC asset canister to:

- **Never cache `index.html`**: Sets `Cache-Control: no-cache, no-store, must-revalidate` so browsers always fetch the latest app shell
- **Long-term cache hashed assets**: Vite-generated files in `/assets/` remain cached for 1 year (immutable)
- **Never cache `env.json`**: Runtime configuration is always fresh

This ensures that after a frontend redeploy, a simple browser refresh (not hard refresh) loads the latest build with the correct backend canister ID.

## Authoritative Deployment Workflow

Follow these steps **in order** whenever you redeploy or recreate the backend:

### Automated Deployment (Recommended)

Use the provided deployment script:

