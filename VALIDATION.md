# Validation — voice studio update, 2026-09-17

## Passed

`npm test` (`node --test tests/*.test.js`): **64 tests passed**.

The original 34 checks still cover text recognition/recall separation, hints, repairs, delayed retention, scheduling, profile migration, personal goals, escaped rendering, and the existing local recording fallback.

The voice update adds 30 checks covering:

- Separate listening/spoken evidence, completed playback and transcript confirmation requirements, idempotency, delayed recall, and rehearsals that preserve review dates.
- Targeted word selection, sound filters, bounded opt-in pace following, and an explicit command vocabulary.
- Actual local HTTP requests for asset allowlisting, missing credentials, rejected origins/hosts, malformed requests, request limits, and sanitized errors.
- Mocked OpenAI request contracts for transcription, speech, and structured conversation; the expected word is not included in transcription prompts.
- Mocked microphone/playback lifecycle, explicit uploads, late permission handling, cancellation, and stale network results.
- Voice-controller flows for confirmation, uncertain transcripts, sound rehearsal, listening without answer leakage, commands, and conversation rendering without invented proficiency.

JavaScript syntax checks and parsing all seven embedded build scripts: passed. `node scripts/build.js` generated the portable HTML build. Tests use no paid OpenAI calls.

## Not verified

**Live OpenAI requests have not run:** no `OPENAI_API_KEY` is configured in this workspace. The adapter uses documented endpoints and mocked contract tests. Model access, network connectivity, synthetic Emirati delivery, and real transcription quality still require a configured account and live verification.

**Real browser/device tests have not run:** Playwright is available, but Chromium is not installed. A previous browser download was denied by the environment network policy. `tests/browser.cjs` covers the text flow, and `tests/voice-browser.cjs` adds voice UI integration using fake microphone input and mocked API responses. Neither establishes browser correctness until run with an installed browser. Actual mobile layout, audio permissions, playback, recording codecs, and end-to-end interactions need device QA.

Controller tests use a minimal DOM stub; media tests use mocks. They do not replace browser or audio quality testing.

**Language and effectiveness are unvalidated:** teaching phrases, sound groups, accepted variants, AI replies, and generated speech need Emirati educator review. Transcript matches do not establish pronunciation accuracy. No phoneme score, global proficiency score, or faster-learning guarantee is implemented. Review timing and pace thresholds are product heuristics.

## Scope

Source, tests, setup instructions, and design notes are maintained in [axsimarosmelos/Melorina-](https://github.com/axsimarosmelos/Melorina-). GitHub storage does not host the voice backend. The current API server is loopback-only for one local user; public deployment requires authentication, HTTPS, per-user limits, and isolated storage.
