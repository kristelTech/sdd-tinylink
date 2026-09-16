'use strict';

/**
 * Traceability matrix (see specs/requirements.md and the talk deck):
 *
 *   R1  Shorten URL — happy path        -> test_create_link_returns_201
 *   R2  Shorten URL — invalid input     -> test_invalid_url_returns_400
 *   R3  Redirect — valid code           -> test_redirect_to_original_url
 *   R4  Redirect — unknown / expired    -> test_expired_code_returns_404
 *   R5  Track click count               -> test_click_counter_increments
 *
 * Uses Node's built-in test runner and fetch — no dependencies to install.
 * Run with: node --test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

async function withServer(fn, opts) {
  const server = createServer(opts);
  const port = await listen(server);
  const baseUrl = `http://localhost:${port}`;
  try {
    await fn({ server, baseUrl, store: server.store });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('R1 — test_create_link_returns_201', async () => {
  await withServer(async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/some/long/path' }),
    });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.match(body.code, /^[A-Za-z0-9]{7}$/);
    assert.equal(body.short_url, `${baseUrl}/${body.code}`);
    assert.equal(body.target_url, 'https://example.com/some/long/path');
  });
});

test('R2 — test_invalid_url_returns_400', async () => {
  await withServer(async ({ baseUrl }) => {
    const cases = [
      {},                                  // missing url
      { url: 'not-a-url' },                // malformed
      { url: 'ftp://example.com/file' },   // unsupported protocol
    ];

    for (const payload of cases) {
      const res = await fetch(`${baseUrl}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(payload)}`);
      const body = await res.json();
      assert.ok(body.error);
    }
  });
});

test('R3 — test_redirect_to_original_url', async () => {
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/target' }),
    });
    const { code } = await create.json();

    const res = await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), 'https://example.com/target');
  });
});

test('R4 — test_expired_code_returns_404 (unknown code)', async () => {
  await withServer(async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/doesnotexist`, { redirect: 'manual' });
    assert.equal(res.status, 404);
  });
});

test('R4 — test_expired_code_returns_404 (actually expired)', async () => {
  // ttlDays: -1 means "already expired" the instant it's created,
  // so we can exercise expiry without waiting 30 days.
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/expired' }),
    });
    const { code } = await create.json();

    const res = await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
    assert.equal(res.status, 404);
  }, { ttlDays: -1 });
});

test('R5 — test_click_counter_increments', async () => {
  await withServer(async ({ baseUrl, store }) => {
    const create = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/counted' }),
    });
    const { code } = await create.json();

    assert.equal(store.get(code).clicks, 0);

    await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
    await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
    await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });

    const stats = await (await fetch(`${baseUrl}/links/${code}`)).json();
    assert.equal(stats.clicks, 3);
  });
});
