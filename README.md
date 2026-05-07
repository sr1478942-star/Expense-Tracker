# FDHP Expense Tracker

## Overview
This repository contains a static frontend (`index.html`, `style.css`, `script.js`) and an optional Node.js backend (`server.js`) for Redis-backed storage.

The existing GitHub Actions workflow at `.github/workflows/deploy.yml` is configured to deploy the static frontend to GitHub Pages on pushes to `main`.

## Local Backend Setup

1. Install Node.js if you don't already have it.
2. Open a terminal in the project folder:
   ```powershell
   cd C:\Users\sr147\Desktop\srsb\FDHP
   npm install
   ```
3. Configure environment variables in `.env`:
   ```text
   REDIS_URL=redis://127.0.0.1:6379
   API_KEY=A2mle31pbt8ue4s30jy7jx6ibxzlswyaks35sn0d4byp1830vr
   ```
4. Start the backend server:
   ```powershell
   npm run start
   ```
5. Use the backend by setting `USE_BACKEND = true` in `script.js`.

## Redis Notes
- The backend stores users, expenses, and income in Redis.
- The `API_KEY` is required for all `/api` requests.
- If Redis is not available, the app still works locally using browser `localStorage`.

## GitHub Pages Deployment
- The static frontend is deployed from the repository root.
- The backend is not part of GitHub Pages and must be hosted separately if you want API support in production.
- `.github/workflows/deploy.yml` is already configured and should remain unchanged for static site deployment.

## Useful Commands
- `npm install` — install backend dependencies
- `npm run start` — start the backend server
- `npm run dev` — start the backend server with `nodemon`

## Important
For production use, host `server.js` and Redis separately; GitHub Pages can only serve the frontend.
