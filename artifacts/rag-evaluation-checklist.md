# Retrieval and Grounded-Answer Release Checklist

This public-safe checklist is designed for a retrieval-augmented generation feature. Adapt thresholds to the product risk, data sensitivity, and user workflow.

## 1. Dataset and access

- [ ] Every source has an owner, freshness policy, and retention policy.
- [ ] Tenant, account, role, and document-level access rules are tested before retrieval.
- [ ] Personally identifiable or sensitive content has a defined handling policy.
- [ ] Deleted or revoked documents disappear from results within the agreed service level.
- [ ] The evaluation set represents common, difficult, ambiguous, and unanswerable questions.

## 2. Ingestion

- [ ] Parsers preserve headings, tables, page references, and source metadata where possible.
- [ ] Chunking is evaluated against document structure instead of a universal token size.
- [ ] Duplicate and near-duplicate chunks are measured and controlled.
- [ ] Failed documents enter an observable retry or quarantine path.
- [ ] Ingestion versions are traceable to parser, chunker, and embedding versions.

## 3. Retrieval

- [ ] Recall@k and hit rate meet the agreed threshold on a golden question set.
- [ ] Access-filter correctness is 100 percent in negative authorization tests.
- [ ] Lexical, semantic, and hybrid retrieval are compared on the same evaluation set.
- [ ] Reranking produces measurable lift before its latency and cost are accepted.
- [ ] Minimum-score and top-k behavior is tested for both missing and noisy evidence.

## 4. Answer quality

- [ ] Every factual claim can be traced to retrieved evidence.
- [ ] Citation coverage and citation correctness are scored independently.
- [ ] The system abstains when evidence is missing, contradictory, stale, or unauthorized.
- [ ] Prompt-injection and instruction-conflict tests are part of the release suite.
- [ ] Answer completeness is measured without rewarding unsupported elaboration.

## 5. Reliability and operations

- [ ] Traces connect query, filters, retrieved chunks, prompt version, model, and response.
- [ ] p50 and p95 latency budgets exist for retrieval and generation separately.
- [ ] Token and infrastructure costs have per-request and aggregate budgets.
- [ ] Dependency timeouts, retries, circuit breakers, and fallbacks are tested.
- [ ] On-call owners can distinguish data, retrieval, model, prompt, and platform failures.

## 6. Product feedback

- [ ] Helpful and not-helpful feedback captures a reason without collecting unnecessary data.
- [ ] Escalation and handoff paths are visible when the system abstains.
- [ ] Task completion and time saved are measured against a non-AI baseline.
- [ ] Feedback changes enter a reviewed dataset, prompt, or product backlog.
- [ ] Release decisions record known limitations and rollback criteria.

## Suggested release record

Record the dataset version, retrieval configuration, model and prompt versions, evaluation results, risk sign-off, known limitations, rollout percentage, and rollback owner for every material release.
