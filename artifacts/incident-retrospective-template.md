# Production Incident Retrospective

Use this template after service, data-pipeline, retrieval, or agent failures. The objective is learning and system improvement, not individual blame.

## Incident summary

- Incident title:
- Date and duration:
- Severity:
- Incident commander:
- Affected users or workflows:
- Current status:

## Impact

Describe user-visible impact, affected volume, delayed or incorrect decisions, data integrity implications, and any security or compliance concern. Separate measured impact from estimates.

## Detection

- How was the incident detected?
- Which signal should have detected it earlier?
- Was the alert actionable?
- What information was missing from the first alert?

## Timeline

| Time | Event | Evidence or trace |
| --- | --- | --- |
| 00:00 | First failure | |
| 00:00 | Detection | |
| 00:00 | Containment | |
| 00:00 | Recovery | |
| 00:00 | Full validation | |

## Root cause

State the technical and organizational conditions that made the incident possible. Avoid stopping at the component that produced the final error.

### For an AI or retrieval incident, inspect

- Source freshness and authorization
- Parsing, chunking, embedding, and index versions
- Retrieval filters, top-k, threshold, and reranking
- Prompt and model versions
- Tool permissions and agent stopping conditions
- Evaluation gaps and missing negative tests

## Contributing factors

- What increased probability?
- What increased duration?
- What increased impact?
- Which assumption was wrong?

## Resolution and recovery

Explain containment, permanent correction, data repair, validation, and communication. Link each claim to logs, traces, deployments, or tests.

## Corrective actions

| Action | Type | Owner | Due date | Verification |
| --- | --- | --- | --- | --- |
| | Prevent | | | |
| | Detect | | | |
| | Contain | | | |
| | Learn | | | |

## What went well

Record the people, safeguards, documentation, automation, and decisions that reduced impact or recovery time.

## What will change

Summarize the few durable system or process changes. Track them to completion and verify that they reduce recurrence, detection time, or blast radius.
