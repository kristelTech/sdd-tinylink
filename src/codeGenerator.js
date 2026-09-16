'use strict';

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a random base62 short code.
 * Matches spec: 7 characters, base62 (Requirement: Shorten URL).
 */
function generateCode(length = 7) {
  let code = '';
  for (let i = 0; i < length; i++) {
    const idx = crypto.randomInt(0, ALPHABET.length);
    code += ALPHABET[idx];
  }
  return code;
}

module.exports = { generateCode, ALPHABET };
