'use strict';

/**
 * WHEN the target URL is missing or malformed,
 * THE SYSTEM SHALL return HTTP 400 with an error message.
 * (specs/requirements.md — Requirement: Shorten URL)
 */
function isValidUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

module.exports = { isValidUrl };
