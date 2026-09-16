# TinyLink — Requirements

Notation: [EARS](https://alistairmavin.com/ears/) —
`WHEN <trigger> THE SYSTEM SHALL <observable behavior>`.
Every requirement below is written so it can be turned directly into a test.

## Requirement: Shorten URL

WHEN a client submits a POST request to `/links` with a valid target URL,
THE SYSTEM SHALL create a unique short code and return it with HTTP 201.

WHEN the target URL is missing or malformed,
THE SYSTEM SHALL return HTTP 400 with an error message.

## Requirement: Redirect

WHEN a client sends a GET request to `/{code}` for an existing, unexpired code,
THE SYSTEM SHALL respond with HTTP 302 redirecting to the original URL.

WHEN the code does not exist or has expired,
THE SYSTEM SHALL respond with HTTP 404.

## Requirement: Expiry

WHEN 30 days have passed since a link was created,
THE SYSTEM SHALL treat that code as not found for the purposes of the
Redirect requirement above (HTTP 404).

## Requirement: Track Clicks

WHEN a redirect succeeds for a given code,
THE SYSTEM SHALL increment that link's click counter by one.

## Non-goals (out of scope for this example)

- User accounts, authentication, or per-user link ownership
- Custom / vanity short codes
- Analytics beyond a raw click count (no geo, referrer, or device data)
- Multi-region deployment or horizontal scaling concerns

## Open questions (resolved in plan.md)

- What happens when a randomly generated code collides with an existing one?
- What storage should back link records, given the 30-day expiry requirement?
