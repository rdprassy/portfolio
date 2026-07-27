# GA4 Setup and Mobile Reporting

The portfolio now has a consent-aware Google Analytics 4 integration. The retired
Universal Analytics identifier (`UA-84703941-1`) has been removed because
Universal Analytics no longer processes new data.

Collection is configured for the `rdprassy Portfolio` GA4 web stream using
Measurement ID `G-GQ2BFW2HKJ`. The Google tag loads only after visitor consent.

## One-time GA4 setup

1. Sign in at [Google Analytics](https://analytics.google.com/).
2. Open **Admin** and create or select a Google Analytics 4 property.
3. Under **Data collection and modification**, open **Data streams**.
4. Create a **Web** stream for `https://www.rdprassy.com`.
5. Open the stream and copy the **Measurement ID** beginning with `G-`.
6. Paste it into `js/analytics-config.js`:

```js
googleMeasurementId: "G-GQ2BFW2HKJ",
```

The Measurement ID is a public website identifier, not a password or API secret,
so it is expected to appear in client-side source code.

The old `UA-84703941-1` value cannot be converted into or substituted for this
new identifier.

The raw Google installation snippet is intentionally not pasted into each page.
The portfolio's consent-aware loader creates the same Google tag after consent;
installing both versions would risk duplicate page views and events.

Official reference:
[Find your Google tag ID](https://support.google.com/analytics/answer/9539598)

## What the integration does

- Loads the Google tag only after the visitor allows analytics.
- Uses Google Consent Mode v2 states.
- Keeps advertising storage, advertising user data, and ad personalization denied.
- Disables Google Signals and advertising-personalization signals in the site tag.
- Avoids automatic duplicate page views.
- Removes email addresses and query strings from event destinations.
- Never sends AI lab query text, email content, form content, phone numbers, or documents.
- Provides persistent **Privacy** and **Analytics choices** controls in the footer.

## Events already instrumented

| Event | Meaning |
| --- | --- |
| `page_view` | A portfolio page was viewed |
| `resume_view` | A résumé edition was opened |
| `resume_download` | A résumé PDF was downloaded |
| `ai_case_study_open` | The flagship AI case study was opened |
| `ai_lab_open` | The interactive retrieval lab was opened |
| `ai_lab_run` | A retrieval run completed; query text is excluded |
| `github_open` | A GitHub profile or project link was opened |
| `contact_click` | A contact action was selected |
| `performance_snapshot` | Coarse navigation timing was recorded |

## Recommended GA4 administration

1. In **Admin → Data display → Events**, confirm the custom events after traffic arrives.
2. Mark `contact_click` as a **key event**.
3. Create custom dimensions for `site_section`, `event_label`, and
   `link_destination`.
4. Create custom metrics for `load_ms`, `result_count`, `top_k`, and `threshold`
   only if those reports will be used.
5. Keep data retention limited to the shortest period that meets the reporting need.
6. Leave advertising features off unless the privacy notice and consent design are
   intentionally expanded.

## Verify after activation

1. Temporarily set `debug: true` in `js/analytics-config.js`.
2. Open the live site in a private browser window.
3. Allow analytics in the consent panel.
4. Visit the résumé library, open the AI case study, and run one sample lab query.
5. In GA4, open **Admin → Data display → DebugView** and confirm the events.
6. Return `debug` to `false` before the final publish.

## Use Analytics on a phone

The website remains a **Web** data stream. A separate Android or iOS app stream is
not needed merely to view the website's reports on a phone.

1. Install the official Google Analytics app:
   - [Android / Google Play](https://play.google.com/store/apps/details?id=com.google.android.apps.giant)
   - [iPhone and iPad / App Store](https://apps.apple.com/app/google-analytics/id881599038)
2. Sign in with the same Google account that has access to the GA4 property.
3. Select the rdprassy GA4 property.
4. Pin or revisit **Realtime**, **Reports snapshot**, **Pages and screens**, and
   **Events** for quick portfolio checks.

Official reference:
[About the Analytics app](https://support.google.com/analytics/answer/12674799)

## Useful portfolio questions

1. Which résumé edition receives the most views and downloads?
2. Do visitors open the AI case study and then run the lab?
3. Which project paths lead to GitHub, LinkedIn, or contact clicks?
4. Which pages have slow load snapshots on real devices?
5. Does the contact conversion rate improve after content changes?
