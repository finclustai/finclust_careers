# 09 — Application detail and Resume download

Status: ready-for-human
Blocked by: 05, 03

Candidate and Application detail: name, Reference, profile, job, phone, email,
experience, location, source, applied date, status, and the status history.

`GET /api/resumes/:id/download` role-checks, then returns a 60-second Supabase
signed URL with the content type forced to `application/octet-stream` so an
uploaded file can never render inline in an admin browser. The bucket stays
private and is never exposed.
