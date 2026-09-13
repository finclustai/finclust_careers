# 04 — Job Openings and Application Links

Status: ready-for-human
Blocked by: 03

CRUD for Job Openings with the fields in requirement section 7, and status
Draft, Active, On Hold, Closed, Cancelled.

On first activation, generate one Application Link per Source
(`whatsapp`, `linkedin`, `website`, `referral`, `other`), each resolving to the
same Job Opening and carrying its own click counter.

The job detail screen shows a copy-ready WhatsApp post: title, location,
experience band and the link. Copy button, and a `wa.me` share button. Nothing
is sent automatically (ADR-0005).
