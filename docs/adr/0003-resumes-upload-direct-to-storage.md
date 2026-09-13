# Resumes upload directly to object storage, bypassing the API

The browser requests a short-lived signed upload URL from the API and PUTs the
resume straight to Supabase Storage; the submitted form carries only the
resulting storage path. Resume bytes never pass through our API, because our
deployment target caps a serverless request body at 4.5MB while resumes are
allowed up to 10MB — a limit that is invisible in the code and would otherwise
surface as unexplained failures on large files.

## Consequences

- Upload starts while the candidate is still filling in the rest of the form, so
  submission is near-instant on a slow mobile connection.
- An abandoned form leaves an orphaned object in storage rather than a
  half-created Application. Orphans are harmless; a sweep can reclaim them later.
- The API never holds the bytes, so signature validation is a range fetch
  against storage (ADR-0002) rather than an in-memory check.
