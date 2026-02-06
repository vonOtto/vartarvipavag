# E2E Test Setup Guide

This guide explains how to set up and configure the E2E test suite for Tripto Party Edition.

## Prerequisites

Before running E2E tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Backend service** running on `http://localhost:3000`
4. **Web player** running on `http://localhost:5173`

## Installation

### 1. Install Dependencies

From the project root:

```bash
npm install
```

This will install:
- `@playwright/test` - E2E testing framework
- `@types/node` - TypeScript type definitions
- `typescript` - TypeScript compiler

### 2. Install Playwright Browsers

Playwright requires browser binaries to run tests:

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers. For a specific browser:

```bash
npx playwright install chromium
```

### 3. Configure Environment Variables

Create a `.env` file in the project root (if not already present):

```bash
# Backend URL
BACKEND_URL=http://localhost:3000

# Web Player URL
WEB_PLAYER_URL=http://localhost:5173
```

## Running the Backend and Web Player

### Option 1: Manual Start (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd services/backend
npm install
npm run dev
```

**Terminal 2 - Web Player:**
```bash
cd apps/web-player
npm install
npm run dev
```

### Option 2: Automatic Start (CI Mode)

The Playwright config includes `webServer` configuration that automatically starts both services:

```bash
npm run test:e2e
```

This will:
1. Start backend at `http://localhost:3000`
2. Start web player at `http://localhost:5173`
3. Wait for both to be ready
4. Run tests
5. Shut down services after tests complete

## Verifying Setup

### 1. Check Backend Health

```bash
curl http://localhost:3000/health
```

Expected response: `200 OK` with `{"status":"ok"}`

### 2. Check Web Player

Open browser to `http://localhost:5173` - should see the landing page.

### 3. Run a Simple Test

```bash
npx playwright test test/e2e/specs/happy-path.spec.ts --headed
```

This runs the happy path test with a visible browser window.

## Troubleshooting

### Backend Not Starting

**Issue:** Backend fails to start or health check fails.

**Solutions:**
- Check if port 3000 is available: `lsof -i :3000`
- Verify environment variables in `services/backend/.env`
- Check backend logs for errors
- Ensure dependencies are installed: `cd services/backend && npm install`

### Web Player Not Starting

**Issue:** Web player fails to start or is not accessible.

**Solutions:**
- Check if port 5173 is available: `lsof -i :5173`
- Clear Vite cache: `cd apps/web-player && rm -rf node_modules/.vite`
- Reinstall dependencies: `cd apps/web-player && npm install`

### Browser Installation Issues

**Issue:** Playwright browsers not installing.

**Solutions:**
- Run with sudo (macOS/Linux): `sudo npx playwright install`
- Install specific browser: `npx playwright install chromium`
- Check disk space and permissions

### WebSocket Connection Failures

**Issue:** Tests fail with WebSocket connection errors.

**Solutions:**
- Verify backend WebSocket endpoint: `ws://localhost:3000/ws`
- Check firewall/security settings
- Increase timeout values in test configuration
- Verify backend is handling WebSocket upgrades correctly

### Test Timeouts

**Issue:** Tests timeout waiting for state changes.

**Solutions:**
- Increase timeout values in `playwright.config.ts`
- Check if backend is processing events correctly
- Verify WebSocket messages are being sent/received
- Add debug logging to see where tests hang

### State Synchronization Issues

**Issue:** Tests fail because state doesn't update across clients.

**Solutions:**
- Verify backend broadcasts events to all connected clients
- Check WebSocket connection status in browser DevTools
- Ensure `STATE_SNAPSHOT` includes all required fields
- Add delays between rapid state changes

## Development Tips

### Running Tests in Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector for step-by-step debugging.

### Running Tests in UI Mode

```bash
npm run test:e2e:ui
```

This opens Playwright UI for interactive test execution.

### Running Specific Tests

```bash
# Single test file
npx playwright test test/e2e/specs/brake-scenario.spec.ts

# Single test case
npx playwright test test/e2e/specs/brake-scenario.spec.ts -g "simultaneous brakes"

# Specific browser
npx playwright test --project=chromium
```

### Viewing Test Reports

After tests run, view the HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

For CI/CD environments (GitHub Actions, etc.):

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e:headless
```

See `docs/testing/e2e-test-guide.md` for more details on running and writing tests.
