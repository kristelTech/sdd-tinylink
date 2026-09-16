'use strict';

const DEFAULT_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * In-memory implementation of the storage interface described in
 * specs/plan.md. The plan calls for Redis in production (native TTL,
 * no cron cleanup job needed) — this Map-based version implements the
 * same interface with lazy expiry, so it's a drop-in reference/demo
 * store with zero external dependencies.
 */
class LinkStore {
  constructor({ ttlDays = DEFAULT_TTL_DAYS } = {}) {
    this.ttlDays = ttlDays;
    this.links = new Map();
  }

  has(code) {
    return this.links.has(code);
  }

  /**
   * WHEN a client submits a POST request to /links with a valid
   * target URL, THE SYSTEM SHALL create a short code ...
   * (specs/requirements.md — Requirement: Shorten URL)
   */
  save(code, targetUrl) {
    const now = new Date();
    const record = {
      code,
      target_url: targetUrl,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + this.ttlDays * MS_PER_DAY).toISOString(),
      clicks: 0,
    };
    this.links.set(code, record);
    return record;
  }

  /**
   * Returns the record for `code`, or undefined if it doesn't exist
   * or has expired (expired entries are deleted lazily on read).
   * WHEN the code does not exist or has expired,
   * THE SYSTEM SHALL respond with HTTP 404.
   */
  get(code) {
    const record = this.links.get(code);
    if (!record) return undefined;
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      this.links.delete(code);
      return undefined;
    }
    return record;
  }

  incrementClicks(code) {
    const record = this.get(code);
    if (!record) return undefined;
    record.clicks += 1;
    return record;
  }

  size() {
    return this.links.size;
  }
}

module.exports = { LinkStore, DEFAULT_TTL_DAYS };
