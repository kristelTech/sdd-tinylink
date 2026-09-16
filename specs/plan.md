# TinyLink — Plan

## Architecture

```
Client  --->  API service  --->  Link store
              (Node.js, no
               framework)
```

- **API service**: plain Node.js `http` module. No framework dependency,
  so this repo runs with zero `npm install` steps.
- **Link store**: an interface (`save`, `get`, `has`, `incrementClicks`)
  implemented in-memory for this reference project (`src/store.js`).

## Decision: storage

The slide deck's version of this plan chose **Redis** for the production
system, specifically for its native key TTL — a link's expiry is just the
key's TTL, so there's no separate cleanup job to write or run.

This repository ships an **in-memory `Map`-based implementation of the same
interface** instead, so the example runs anywhere with just `node`. It
implements expiry with the same semantics (lazy check-on-read, matching
Redis's "key doesn't exist after TTL" behavior) so swapping in a real Redis
client later only touches `src/store.js`, not the API or the tests.

## Data model

```
{
  code:       string   // 7 chars, base62
  target_url: string
  created_at: ISO datetime
  expires_at: ISO datetime  // created_at + 30 days
  clicks:     integer       // default 0
}
```

## Decisions log

| Question | Decision | Why |
|---|---|---|
| Collision on generated code? | Retry generation up to 3x, then 500 | Simple, no coordination needed; 7-char base62 space is large enough that repeated collisions signal a real problem |
| Code length / alphabet | 7 chars, `[A-Za-z0-9]` (base62) | Matches the requirement's stated format; short enough to be "tiny", long enough to avoid frequent collisions |
| Where do clicks increment? | Only on an actual 302 redirect, never on the stats lookup | Keeps "Track Clicks" (R5) honest — checking stats shouldn't count as a visit |
| Storage for reference implementation | In-memory `Map`, same interface Redis would implement | Zero-dependency demo; production deployment should swap in `src/store.js` only |

## Constraints (what we're explicitly not building)

- No authentication layer
- No horizontal scaling / multi-instance coordination (the in-memory store
  is single-process only — see "Decision: storage" above for the
  production path)
- No admin UI
