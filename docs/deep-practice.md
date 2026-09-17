# Deep practice in Melorina

Design note for version 0.2, September 17, 2026.

## Source and interpretation

This work uses the user-supplied transcript of [Daniel Coyle's discussion of learning and deep practice, Big Think Clips](https://youtu.be/vMyiySyx0AU). The transcript identifies the title as “You can progress more in 6 minutes than you would in a month | Daniel Coyle.” The video was not independently viewed. The transcript is not reproduced in this repository.

The useful design idea is a cycle: attempt a manageable challenge, notice what needs work, slow down and repair a small part, then return to meaningful use. Motivation can come from a personally important conversation and models or relationships that make participation feel possible.

These are design hypotheses. The video's anecdotes and claims about error percentages, practice hours, learning speed, or compounding improvement do not establish how quickly Melorina users will learn. We do not promise a month's progress in minutes or force a particular proportion of mistakes.

## From ideas to working behavior

| Idea in the transcript | Version 0.2 behavior | Boundary |
| --- | --- | --- |
| Reach slightly beyond what feels easy | Suggest a word and task from actual review and recognition/recall evidence | No global proficiency level is assigned |
| Notice the difficulty | Separate unaided answers, hinted answers, and recognition misses; show the written model afterward | Unmatched free text may be valid Arabic, so it is not automatically recorded as failure |
| Slow down and isolate a part | Reveal a small clue before the full answer; show authored phrase chunks with the target highlighted | Written models are draft; transliteration is not pronunciation assessment |
| Repair and repeat | Offer one optional hidden-model retry, then continue | Immediate repair is recorded as rehearsal and cannot increase mastery or delay review |
| Rejoin meaningful use | Interleave a different word, then ask for the focus word in another situation | A contextual word response is not evidence of spontaneous conversation ability |
| Connect practice to personal purpose | Save a short personal conversation goal and display it during focused practice and reflection | Topic selection guides suggestions; free text is a reminder, not an AI-generated curriculum |
| Learn from people and models | Use reviewed, consented native audio and optional peer/mentor practice in future milestones | No native audio or real social learning feature has been implemented yet |

## Selection and adaptation

The focus planner first uses the existing queue: due reviews, a transition from successful recognition to recall, then unseen words associated with the selected topic. Learners can also choose a particular word. A recognition miss does not unlock the harder recall recommendation.

For a given word and task, the engine reads at most six recent observations. Fewer than four observations means it is still gathering evidence. With enough observations, an independent-answer share of 50% or less suggests extra support; 85% or more suggests trying another situation. Values in between keep ordinary support available. These internal thresholds are editable starting heuristics, not calibrated probabilities or an intended mistake rate. They do not combine reading, recall, listening, and pronunciation into one score.

A focused session contains three turns: the target, a different word, and the target in a new setting. Recent recall difficulties open an initial-letter clue. Recognition already provides answer choices and is not marked hinted unless extra help was actually supplied. When the initial recognition response is not independent, the final turn keeps answer choices instead of requiring recall. A successful immediate repair does not override that decision.

The learner may retry a supported or missed response once, or skip the retry. That attempt is stored in `rehearsals`, with its word, task, context, session, timestamp, and whether a clue/model was reopened. It does not modify `skills`, independent-attempt `events`, or review timing. Subsequent turns without hints can provide unaided task evidence, but same-session repetition does not count as delayed retention. Existing review rules require at least a day between relevant observations for delayed evidence.

## Evidence we still need

An Emirati Arabic educator must review the language models and acceptable variants. Browser and device testing must cover the interface and microphone path. Learning evaluation must compare delayed unaided recall and unfamiliar conversation performance, not just practice completion. The present eight-word prototype demonstrates the interaction and evidence model; it does not validate learning effectiveness or provide open-ended AI conversation.
