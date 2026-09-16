# TinyLink

The worked example from the *Spec-Driven Development* talk, as actual
runnable code. A minimal URL-shortener API with **zero npm dependencies** —
just Node.js.

```
POST /links          -> create a short link
GET  /{code}          -> redirect to the original URL (302 / 404)
GET  /links/{code}    -> look up a link's stats (bonus, not in the original spec)
```

## Why this repo is organized this way

It follows the same spec-driven loop:

```
specs/requirements.md   Step 1 — Specify   (what & why)
specs/plan.md           Step 2 — Plan      (architecture & decisions)
specs/tasks.md          Step 3 — Tasks     (small, traceable units)
src/                    Step 4 — Implement (code, one task at a time)
test/api.test.js        Step 5 — Validate  (tests mapped to requirement IDs)
```

Read them in that order if you want to see the whole loop, not just the code.

## Run it

No install step needed — this uses only Node's built-in `http` module.

```bash
node src/server.js
# TinyLink listening on http://localhost:3000
```

In another terminal:

```bash
curl -s -X POST http://localhost:3000/links \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.jetbrains.com"}'
# {"code":"aZ3kP9x","short_url":"http://localhost:3000/aZ3kP9x", ...}

```

```bash

curl -i http://localhost:3000/<generated-code>
# HTTP/1.1 302 Found 
# Location: https://www.jetbrains.com 
# Substitute to generated code

```
```bash

curl -s http://localhost:3000/links/<generated-code>
# {"code":"aZ3kP9x", ..., "clicks":1}
```



## Run the tests

Also dependency-free — uses Node's built-in test runner (`node:test`) and
built-in `fetch`. Requires Node 18+.

```bash
npm test
# or: node --test
```

The test names map directly to the requirement IDs in the talk's
traceability-matrix slide (R1–R5) — see the comment block at the top of
`test/api.test.js`.

## What's deliberately simplified vs. the talk's plan.md

The slide deck's `plan.md` calls for **Redis** in production, specifically
for native key TTL. This repo uses an in-memory `Map` behind the same
storage interface instead, so it runs anywhere with no infrastructure to
stand up. See `specs/plan.md` → "Decision: storage" for the reasoning and
what would need to change to go to Redis (only `src/store.js`).

Everything else — validation rules, status codes, the 30-day expiry, the
click counter — is a faithful, working implementation of `requirements.md`.

## Project layout

```
tinylink/
├── README.md
├── package.json
├── specs/
│   ├── requirements.md   # Step 1: Specify
│   ├── plan.md           # Step 2: Plan
│   └── tasks.md          # Step 3: Tasks
├── src/
│   ├── server.js         # HTTP routing + request handling
│   ├── store.js          # Link storage (in-memory, Redis-shaped interface)
│   ├── codeGenerator.js  # Base62 short-code generation
│   └── validate.js       # URL validation
└── test/
    └── api.test.js       # Step 5: Validate — one test per requirement
```
