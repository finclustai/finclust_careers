# Share CVs as Zoho Mail drafts

Recruiters send candidate CVs to clients by email. The app does this by
creating a draft in the company Zoho mailbox (hr@finclust.ai) through the Zoho
Mail API, with the CVs attached as real files and the body filled in from an
editable template. A person opens the draft in Zoho Mail, edits it if needed,
and sends it.

The company is on Zoho Mail's Forever Free plan, which has no SMTP or IMAP.
Before deciding, we tested the API on that plan: token refresh, reading the
account, uploading an attachment and saving a draft with it all work.

## Considered options

- **mailto / compose link.** Free and simple, but a browser cannot attach files
  to a compose window, so CVs would have to travel as links.
- **Send from the app (SMTP or API send).** No chance to review, not available
  over SMTP on the free plan, and mail sent on someone's behalf without a final
  look is a risk with client relationships.
- **Draft through the API (chosen).** Real attachments, the person keeps the
  final say, the email carries their Zoho signature and lands in Sent.

## Consequences

- One mailbox, connected once with a refresh token held in server environment
  variables (`ZOHO_*`). Without them, sharing is switched off, not broken.
- The app only knows a draft was created, not that it was sent. The share is
  recorded, and Applications move to Sent to client, at draft time.
- Sharing moves New, Screening, Shortlisted and On hold forward to Sent to
  client. It never moves anyone back, and never overturns a rejection.
- One email covers one Job Opening. CVs are capped at 20 per email and 20 MB in
  total, below the limits Zoho publishes for paid plans.
- Candidate-entered text is HTML-escaped before it goes into the email, since
  it comes from a public form and leaves from the company mailbox.
