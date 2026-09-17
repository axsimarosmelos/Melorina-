# Melorina: next implementation milestones

## 0.1 — Inspectable adaptive prototype

Implemented: three everyday guided scenarios, eight vocabulary items, independent word recognition/recall evidence, hint-aware review, local persistence, recording/replay, responsive interface, and tests.

## 0.2 — Focused practice and personal purpose

Implemented: three-turn focused practice; support based on recent evidence for each word and task; progressive clues; written models in small pieces; one optional hidden-model rehearsal per turn; contextual follow-up; and persistent personal conversation goals. Rehearsals cannot inflate independent-attempt evidence or change review dates. Existing local profiles retain their history.

Design source and boundaries: [Deep practice in Melorina](docs/deep-practice.md). Automated checks are documented in [VALIDATION.md](VALIDATION.md); browser verification remains outstanding.

## 0.3 — Voice studio and API integration

Implemented: a local server with server-only OpenAI credentials, explicit audio uploads, learner-confirmed transcripts, synthetic speech, listening recognition, spoken-word practice, sound rehearsal, turn-based AI conversations, selectable voices/tones/pace, three conversation versions, and explicit voice commands. Voice evidence is separate from text evidence; conversation feedback does not automatically become proficiency evidence.

Automatic pace following is optional and coarse. Sound practice does not claim phoneme assessment. Live OpenAI and device validation remain pending; see [voice practice](docs/voice-practice.md) and [validation](VALIDATION.md).

## Next — Validate the Emirati learning content

- Engage an Emirati language educator to review wording, regional variants, gender/register, accepted answers, and cultural context.
- Record consented, reusable native audio from multiple speakers and add a content review status/version for each phrase.
- Let learners observe a reviewed model at a natural and slower pace, isolate the part they need, then return to the whole utterance.
- Validate the new listening-only tasks and expand them beyond the eight-word draft; preserve separation from reading evidence.
- Expand conversations from isolated words to utterance-level goals, including asking for clarification and handling an unexpected reply.
- Add tests for acceptable alternative expressions, and send uncertain text judgments to a fallback rather than marking them wrong.

Exit criterion: every released task and audio item has an identifiable language reviewer and expected, acceptable, and unsupported answer cases.

## Next — Production conversations and durable accounts

- Extend the local API backend with authenticated users, sessions, events, content versions, learner goals, and learner skill estimates before public deployment.
- Preserve the server-only provider adapter and add per-user quotas, production authentication, and controlled realtime voice sessions.
- Let the curriculum selector choose a goal and evidence target; let the conversation service express that goal naturally. Constrain generated exercises to reviewed content and validate their answers.
- Keep event IDs idempotent, preserve hints and source confidence, and support account export/deletion.
- Replace the one-page session controller with resumable sessions and add conflict-safe persistence across devices.

Exit criterion: two users have isolated histories; a resumed conversation keeps its learning state; model uncertainty never silently becomes a negative score.

## 0.5 — Meaningful pronunciation personalization

- Compare candidate speech assessment systems against Emirati speaker and teacher judgments before choosing one.
- Distinguish recording quality, word recognition, intelligibility, dialect variation, and phoneme production.
- Add confidence thresholds and short diagnostic follow-ups. Unsupported phonemes remain unknown.
- Introduce sound-to-word relationships so a recurring sound difficulty can guide practice across several familiar words.
- Keep pronunciation success independent from unaided word recall and spontaneous usage.

Exit criterion: acceptable dialect variants are not routinely penalized, and feedback reliably agrees with qualified human judgment on the target tasks.

## 0.6 — Prove learning benefit

- Compare adaptive and fixed task sequences with equivalent content and practice time.
- Assess unaided recall after a delay and performance in unfamiliar conversations.
- Track learning outcomes alongside enjoyment and return rates. Do not substitute session counts for conversational competence.
- Tune review timing and task selection using measured results, not engagement alone.
- Evaluate the support thresholds and repair loop with learners. Do not optimize for a universal error rate or promote same-session rehearsal to durable retention evidence.

## Later expansion

- Additional Arabic varieties: preserve existing evidence but test transfer explicitly; do not copy Emirati mastery into another variety without evidence.
- Premium workplace scenarios and specialized speaking development.
- Optional consent-based practice with peers or mentors, grounded in real relationships and reviewed models. Do not fabricate classmates, testimonials, or social proof.
- Native mobile packaging when browser-based learning and validated audio flows justify it.
