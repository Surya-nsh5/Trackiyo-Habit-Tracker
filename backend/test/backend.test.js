const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// 1. Test Daily-Lock Logic
describe('Daily-Lock Middleware', () => {
  const { validateDailyWrite } = require('../middleware/dailyLock.js');

  const pad2 = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  test('permits write when log_date matches client_today and server today', () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { body: { log_date: todayStr, client_today: todayStr } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };

    const result = validateDailyWrite(req, res);
    assert.equal(result, todayStr);
    assert.equal(statusCode, null);
  });

  test('rejects write when log_date is not equal to client_today (historical edit)', () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { body: { log_date: '2025-01-01', client_today: todayStr } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };

    const result = validateDailyWrite(req, res);
    assert.equal(result, null);
    assert.equal(statusCode, 403);
    assert.match(jsonBody.error, /Only today's records can be modified/);
  });

  test('rejects write when dates are invalid or missing format', () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { body: { log_date: 'invalid-date', client_today: todayStr } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };

    const result = validateDailyWrite(req, res);
    assert.equal(result, null);
    assert.equal(statusCode, 400);
  });
});

// 2. Test Streak Calculation Logic
describe('Streak Calculation Engine', () => {
  function addDays(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  function calculateStreakFromDates(completedDatesSet, todayStr, graceDatesSet = new Set()) {
    const isDone = (d) => completedDatesSet.has(d) || graceDatesSet.has(d);
    let cursor = todayStr;
    if (!isDone(cursor)) {
      cursor = addDays(cursor, -1);
    }
    let current = 0;
    while (isDone(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }

    const sortedDates = Array.from(completedDatesSet).sort();
    let longest = 0;
    let currentRun = 0;
    let prevDate = null;

    for (const d of sortedDates) {
      if (!prevDate) {
        currentRun = 1;
      } else {
        const expectedNext = addDays(prevDate, 1);
        if (d === expectedNext) {
          currentRun++;
        } else if (d === prevDate) {
          continue;
        } else if (graceDatesSet.has(expectedNext) && d === addDays(expectedNext, 1)) {
          currentRun += 2;
        } else {
          currentRun = 1;
        }
      }
      if (currentRun > longest) longest = currentRun;
      prevDate = d;
    }
    if (current > longest) longest = current;
    return { current, longest };
  }

  test('computes active consecutive streak including today', () => {
    const today = '2026-10-01';
    const dates = new Set(['2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28']);
    const res = calculateStreakFromDates(dates, today);
    assert.equal(res.current, 4);
    assert.equal(res.longest, 4);
  });

  test('computes active streak ending yesterday if today is not yet logged', () => {
    const today = '2026-10-01';
    const dates = new Set(['2026-09-30', '2026-09-29']);
    const res = calculateStreakFromDates(dates, today);
    assert.equal(res.current, 2);
  });

  test('breaks streak when a day is missed without grace day', () => {
    const today = '2026-10-01';
    // Missed 2026-09-30
    const dates = new Set(['2026-10-01', '2026-09-29', '2026-09-28']);
    const res = calculateStreakFromDates(dates, today);
    assert.equal(res.current, 1);
    assert.equal(res.longest, 2);
  });

  test('bridges missed day with a grace day successfully', () => {
    const today = '2026-10-01';
    const dates = new Set(['2026-10-01', '2026-09-29', '2026-09-28']);
    const graceDates = new Set(['2026-09-30']);
    const res = calculateStreakFromDates(dates, today, graceDates);
    assert.equal(res.current, 4);
    assert.equal(res.longest, 4);
  });
});

// 3. Test Route Precedence & Ordering (Prevents shadowing bugs)
describe('Route Precedence Security & Correctness', () => {

  test('share.routes.js: /my/history is registered before /:token', () => {
    const shareRoutes = require('../routes/share.routes.js');
    const paths = shareRoutes.stack.map(s => s.route?.path).filter(Boolean);
    const historyIdx = paths.indexOf('/my/history');
    const tokenIdx = paths.indexOf('/:token');

    assert.ok(historyIdx !== -1, '/my/history route must exist');
    assert.ok(tokenIdx !== -1, '/:token route must exist');
    assert.ok(historyIdx < tokenIdx, '/my/history must be registered BEFORE /:token');
  });

  test('challenges.routes.js: DELETE /:id is registered', () => {
    const challengeRoutes = require('../routes/challenges.routes.js');
    const deleteRoute = challengeRoutes.stack.find(
      s => s.route?.path === '/:id' && s.route?.methods?.delete
    );
    assert.ok(deleteRoute, 'DELETE /:id must be registered in challenges.routes.js');
  });
});

// 4. Test Server 404 & Health
describe('Server Endpoints & Error Handling', () => {
  const app = require('../server.js');

  test('health endpoint is registered', () => {
    const routes = app._router ? app._router.stack : app.router.stack;
    const hasHealth = routes.some(layer => layer.route?.path === '/api/health');
    assert.ok(hasHealth, 'Health check route /api/health should be mounted');
  });
});
