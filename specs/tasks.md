# TinyLink — Tasks

Each task cites the requirement it satisfies (see `requirements.md`) and the
test that proves it (see `test/api.test.js`).

- [x] **T1** — Implement `POST /links` (happy path)
      → satisfies: Shorten URL
      → proven by: `test_create_link_returns_201`

- [x] **T2** — Reject malformed / missing URLs with 400
      → satisfies: Shorten URL (error case)
      → proven by: `test_invalid_url_returns_400`

- [x] **T3** — Implement `GET /{code}` redirect (302)
      → satisfies: Redirect
      → proven by: `test_redirect_to_original_url`

- [x] **T4** — Return 404 for unknown or expired codes
      → satisfies: Redirect (error case), Expiry
      → proven by: `test_expired_code_returns_404`

- [x] **T5** — Increment click counter on redirect
      → satisfies: Track Clicks
      → proven by: `test_click_counter_increments`

- [ ] **T6** — Swap `src/store.js` for a Redis-backed implementation
      → satisfies: (infrastructure — see plan.md "Decision: storage")
      → not yet started; interface is already isolated for this
