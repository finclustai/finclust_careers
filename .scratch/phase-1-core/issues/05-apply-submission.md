# 05 — Public apply endpoint and Resume upload

Status: ready-for-human
Blocked by: 04

Unauthenticated, rate limited, and the only public write in the system.

1. `POST /api/apply/:slug/upload-url` returns a signed Supabase Storage upload
   URL constrained to `application/pdf`. Browser PUTs the file directly.
2. `POST /api/apply/:slug` takes the form fields plus the storage path.
   Validates the object is really a PDF by range-fetching its first five bytes
   and checking for the PDF signature. Rejects and deletes the object otherwise.
3. Finds or creates the Candidate by mobile number, creates the Application,
   increments `job_openings.application_counter` with UPDATE RETURNING inside
   the same transaction, and builds the Application Reference.
4. Re-submission to the same Job Opening returns the existing Reference.

Captures Job Opening, Source and applied time from the link. The Candidate never
types a Job ID. WhatsApp opt-in consent is collected and stored but unused
(ADR-0005).
