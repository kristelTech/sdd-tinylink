'use strict';

const http = require('http');
const { LinkStore } = require('./store');
const { generateCode } = require('./codeGenerator');
const { isValidUrl } = require('./validate');

const MAX_CODE_COLLISION_RETRIES = 3;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      // Basic guard against runaway request bodies.
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Implements: Shorten URL (T1, T2)
 * WHEN a client submits a POST request to /links with a valid target
 * URL, THE SYSTEM SHALL create a unique short code and return it with
 * HTTP 201. WHEN the target URL is missing or malformed, THE SYSTEM
 * SHALL return HTTP 400 with an error message.
 */
async function handleCreateLink(req, res, store, baseUrl) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Request body must be valid JSON' });
  }

  const url = body && body.url;

  // T2 -> 400
  if (!isValidUrl(url)) {
    return sendJson(res, 400, { error: 'Invalid URL' });
  }

  // T1 -> 201, with retry on short-code collision (see specs/plan.md)
  let code;
  for (let attempt = 0; attempt < MAX_CODE_COLLISION_RETRIES; attempt++) {
    const candidate = generateCode();
    if (!store.has(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return sendJson(res, 500, { error: 'Could not generate a unique code, try again' });
  }

  const record = store.save(code, url);
  return sendJson(res, 201, {
    code: record.code,
    short_url: `${baseUrl}/${record.code}`,
    target_url: record.target_url,
    expires_at: record.expires_at,
  });
}

/**
 * Implements: Redirect (T3, T4) + Track Clicks (T5)
 * WHEN a client sends GET /{code} for an existing code, THE SYSTEM
 * SHALL respond with HTTP 302 to the original URL. WHEN the code does
 * not exist or has expired, THE SYSTEM SHALL respond with HTTP 404.
 */
function handleRedirect(req, res, store, code) {
  const record = store.incrementClicks(code); // T5: increments only on a real redirect
  if (!record) {
    return sendJson(res, 404, { error: 'Short link not found or expired' });
  }
  res.writeHead(302, { Location: record.target_url });
  res.end();
}

/**
 * Bonus endpoint (not in the original slide spec) so clicks/expiry are
 * observable without a redirect. If you want this covered by the spec,
 * add a requirement for it to specs/requirements.md first.
 */
function handleStats(req, res, store, code) {
  const record = store.get(code);
  if (!record) {
    return sendJson(res, 404, { error: 'Short link not found or expired' });
  }
  return sendJson(res, 200, record);
}

function createServer({ ttlDays } = {}) {
  const store = new LinkStore({ ttlDays });

  const server = http.createServer((req, res) => {
    const baseUrl = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url, baseUrl);
    const segments = url.pathname.split('/').filter(Boolean);

    if (req.method === 'POST' && url.pathname === '/links') {
      return handleCreateLink(req, res, store, baseUrl).catch((err) => {
        sendJson(res, 500, { error: 'Internal server error', detail: err.message });
      });
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'links') {
      return handleStats(req, res, store, segments[1]);
    }

    if (req.method === 'GET' && segments.length === 1) {
      return handleRedirect(req, res, store, segments[0]);
    }

    return sendJson(res, 404, { error: 'Not found' });
  });

  // Exposed for tests / introspection — not part of the public HTTP API.
  server.store = store;
  return server;
}

function start(port = process.env.PORT || 3000) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`TinyLink listening on http://localhost:${port}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createServer, start };
