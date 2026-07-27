# Portfolio Analytics Setup

The redesigned portfolio emits privacy-conscious analytics events without sending them anywhere by default. This avoids silently connecting a third-party tracker before the site owner chooses a provider and approves its privacy implications.

## Events already instrumented

- `page_view`
- `resume_view`
- `resume_download`
- `ai_case_study_open`
- `ai_lab_open`
- `ai_lab_run`
- `github_open`
- `contact_click`
- `performance_snapshot`

The AI lab event records result count, top-k, score threshold, and whether the question was a named sample or a custom query. It does not record the query text.

## Browser event interface

Every event is dispatched as:

```js
window.addEventListener("rdprassy:analytics", function (event) {
  console.log(event.detail);
});
```

## Supported adapters

The site automatically forwards events when either of these provider functions exists:

- `window.gtag` for Google Analytics 4
- `window.plausible` for Plausible

No provider script or measurement identifier is included in the public site yet.

## Recommended dashboard

Track these portfolio decisions:

1. Which résumé edition receives the most views and downloads?
2. Do visitors open the AI case study and then run the lab?
3. Which case studies lead to GitHub, LinkedIn, or contact clicks?
4. Which pages have slow load snapshots on real devices?
5. Does the contact conversion rate improve after content changes?

## Privacy checklist before connection

- Choose a provider and data region.
- Publish or update a privacy notice.
- Disable unnecessary advertising and cross-site features.
- Avoid collecting AI lab query text, email content, or personal form data.
- Define retention and access.
- Validate events in a test property before production.
