# Voice practice in Melorina 0.3

The initial Emirati Arabic course now has an OpenAI-backed voice studio. This is turn-based speech: record, check the transcript, then receive a reply. It is not a continuous hands-free call.

## Try it locally

Requires Node.js 22 or newer. No runtime packages are required.

1. Copy `.env.example` to `.env` on your own machine.
2. Set `OPENAI_API_KEY` in `.env`. Never put a real key in a browser field, chat, screenshot, or GitHub commit.
3. Run `npm run start:voice` and open `http://localhost:4173`.
4. Open **Voice studio**, enable AI voice for this visit, and choose a voice, coaching tone, pace, scenario, conversation version, and optional sound focus.
5. Choose **Listen & recognise**, **Say it yourself**, **Sound workshop**, or **Start a voice conversation**.

`npm start` also works if `OPENAI_API_KEY` is already present in the server environment. Without a key, existing text practice works and voice studio explains setup. The standalone HTML export cannot provide its own API backend.

API usage is charged to the configured OpenAI account. Use account usage limits. The local service also limits request size, concurrency, and request frequency, but those limits are not a billing cap. This server is for one local user and listens on `127.0.0.1`. Public hosting needs authentication, HTTPS, user isolation, and per-user quotas before deployment.

## The learning loop

The user-supplied Daniel Coyle transcript is the same source used in [deep-practice.md](deep-practice.md). The voice implementation applies its small-part practice cycle:

- Attempt a word without a model, or listen before choosing its meaning.
- Notice the feedback. A transcript mismatch remains uncertain, rather than automatically becoming a learner mistake.
- Hear a model more slowly, inspect a short phrase in pieces, and optionally hide it for one repair.
- Change to a different word, then return to the focus word. Spoken practice uses a new situation; listening practice keeps the target hidden in text.
- Revisit after time has passed. Immediate rehearsal cannot move a review date or establish lasting retention.

The sound workshop lets learners choose a draft sound family, hear words and whole phrases, record themselves, replay, and compare. All its attempts are rehearsals. It does not claim to measure the production of a specific phoneme. The phrase collection and AI Emirati delivery still require an Emirati educator's review.

## Personalization

Six selectable synthetic voices are independent of language level. Warm, calm, and direct coaching styles combine with slow, comfortable, or natural pace. An optional pace-following setting uses the length and duration of a confirmed reply containing at least four words. It selects one of three bounded playback speeds; it is a rough delivery preference, not a fluency or emotion assessment.

Conversation versions offer guidance, everyday exchanges, or a mild unexpected reply. The conversation prompt receives the personal goal, selected style, up to three focus words, and help requests. It asks one short question and offers at most one correction. Repeated requests for help prompt a shorter utterance and a small model. Text-practice difficulties can suggest conversation vocabulary without being treated as proof of a listening or speaking difficulty.

Voice practice maintains separate `listening` and `spoken` evidence under `state.voice`. Spoken evidence means an exact word match in a learner-confirmed transcript; it is neither phoneme accuracy nor spontaneous conversation proficiency. Listening evidence requires completed playback. Replaying audio or revealing the model marks support. Reviews use transparent initial rules: 15 minutes after a listening miss, six hours after support, and one to fourteen days after unaided responses. These intervals have not been validated experimentally.

Learner-selected words remain targets for future practice. GPT-suggested focus words only become targets when the learner chooses to practice them. Free conversation never automatically increases mastery. The conversation ends after six learner replies so there is a natural point to pause and work on one small part.

## Voice controls

Controls are explicit and separate from practice answers. Tap **Record a command**, transcribe, and confirm one of: repeat, slower, hint, next, or stop. Supported Arabic equivalents are listed in the interface. There is no always-on listening. Ordinary conversation text cannot silently trigger a control or delete progress.

## Data and service boundaries

| Data | Handling |
| --- | --- |
| API key | Read by the Node server; never returned to the browser or included in the build |
| Microphone recording | Kept in page memory until the learner chooses Transcribe; then sent through the local server to OpenAI |
| Transcript | Shown for confirmation; a mismatch or discarded transcript does not count as failure |
| Conversation | Recent turns sent to OpenAI; local history stays in memory and is cleared on leaving the studio |
| Learning evidence and preferences | Stored locally with existing progress; included in progress export and reset |
| AI-generated audio | Returned for playback and discarded from client object URLs on cancellation/navigation |

The app does not write audio, transcripts, or raw API request logs to disk. OpenAI has its own [API data controls and retention policies](https://developers.openai.com/api/docs/guides/your-data). Conversation requests use `store: false`; that is not a blanket claim of zero provider retention. Turning voice off cancels pending work but cannot retract data already sent.

The server rejects foreign origins and unexpected hosts, requires a custom header for API writes, bounds audio to 6 MiB and JSON to 24 KB, limits requests to 30 per minute and two concurrently, and serves only browser assets. It does not expose `.env`, server source, or arbitrary project files. Upstream errors are sanitized. Generated text is rendered as escaped text.

## OpenAI integration

Defaults are configurable in the server environment:

| Purpose | Default | Official contract |
| --- | --- | --- |
| Recorded speech to text | `gpt-4o-mini-transcribe` | [File transcription](https://developers.openai.com/api/docs/guides/speech-to-text) |
| Conversation and one small coaching suggestion | `gpt-4.1-mini` | [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) |
| Spoken model and conversation reply | `gpt-4o-mini-tts` | [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) |

The transcription request deliberately excludes the expected word, to avoid biasing the recognizer toward the answer. Every transcript requires learner confirmation. Conversation output uses a strict schema and server validation. Voice and tone choices are allowlisted. Synthetic speech is labelled in the interface.

## Verification still needed

Automated tests exercise the local server with mocked OpenAI responses, voice evidence, controller flows, and microphone/network cancellation. They do not establish real API availability, audio quality, pronunciation validity, or browser/device behavior. See [VALIDATION.md](../VALIDATION.md). No faster-learning guarantee is made; measure delayed recall and unfamiliar conversational performance before making effectiveness claims.
