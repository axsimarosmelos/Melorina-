# Validation — hosted voice update, 2026-09-17

## Passed

`npm test` (`node --test tests/*.test.js`): **80 tests passed** on Node 24.19.0.
`npm run build` succeeded; all eight embedded browser scripts parse.
No test calls a live OpenAI endpoint or spends API credits.

The existing 64 tests cover learning evidence, hints/repairs, delayed reviews,
profile migration, text controllers, voice practice, the provider adapter,
explicit microphone uploads, completed playback, confirmation and cancellation.

The hosted update adds 16 checks covering:

- Fail-closed production configuration: HTTPS origins, persistent directory,
  invitation secret and numeric limits; local mode cannot run in production.
- Actual HTTP requests against the hosted server mode with an injected mock
  provider: invited registration, account sessions, authorization before AI work,
  allowed CORS preflights, denied origins/hosts/headers, and asset allowlisting.
- Separate learner allowances, service-wide allowances, one-request-per-user
  concurrency, and sanitized failures that still consume quota.
- On-disk SQLite restart tests for accounts, sessions, expiry, throttling and
  quotas; passwords and tokens are not stored in plaintext.
- Password recovery preserves account identity, revokes sessions and rejects old
  credentials; session revocation and account deletion also invalidate access.
- Browser-client tests for an unconfigured Pages app, explicit HTTPS service
  selection, per-origin tokens, no credential-bearing redirects, expired sessions,
  corrupt preferences and stale logins after changing backend.
- Controller tests for restarting cancelled connection checks, separate guest/account histories, sign-in plus consent
  before voice use, and session-expiry cleanup without invented learning evidence.

Hosted HTTP tests use loopback transport and the configured Host/Origin headers.
They verify application boundaries, not a real TLS proxy or Render deployment.

## Not verified

**Live deployment and OpenAI calls:** no backend has been provisioned from this
workspace. Hosting integrations are disabled by its administrator, and no hosting
credentials or `OPENAI_API_KEY` are available. The Render blueprint was prepared
from the official documentation but has not been applied to a Render account.
A real service URL must be set in `src/config.js` after deployment. Health checks
confirm process/configuration availability, not a valid OpenAI key or model access.
Follow [deployment](docs/deployment.md) for the concrete activation steps.

**Real browser/device tests:** Playwright is available but Chromium is absent.
An earlier browser download was denied by network policy. No browser/device test
was executed for this release. `tests/browser.cjs` and `tests/voice-browser.cjs`
remain optional checks; the latter uses mocked API replies and fake microphone
input. Neither validates real speech quality. Minimal-DOM controller tests and
mocked media tests do not establish layout, focus behavior, audio permissions,
recording codec support, mobile playback, or end-to-end browser correctness.

**Language and effectiveness:** educator review is still required for the draft
Emirati phrases, sound groups, accepted variants, generated responses and speech.
Transcription matches do not establish pronunciation accuracy. No phoneme score,
global proficiency score, or faster-learning guarantee is implemented. Review
intervals and pace thresholds remain product heuristics.

**Operations:** automatic offsite database backups, cloud progress sync, managed
email recovery and multi-instance hosting are not configured. Voice accounts are
invited accounts on a single persistent service. Learning evidence remains local
to each browser/account profile. Usage units are not a hard dollar spending cap.
