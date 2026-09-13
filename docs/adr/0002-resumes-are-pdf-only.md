# Resumes are PDF only

The requirements ask for PDF, DOC and DOCX uploads plus PDF↔Word conversion.
We accept **PDF only** and have removed conversion from scope entirely, because
conversion requires LibreOffice, which cannot run on our serverless deployment
target (ADR-0004) and would force a separate always-on worker or a paid API for
a feature nobody has asked to use yet.

## Consequences

- Upload is validated twice: extension and size in the browser, then a range
  fetch of the stored object's first bytes to confirm a `%PDF-` signature.
  Client-asserted content type is not trusted.
- Resume preview becomes an `<iframe>` over a signed URL rather than a
  conversion pipeline, and future text extraction needs one PDF parser with no
  DOCX branch.
- A candidate holding only a `.docx` must export it to PDF before applying. The
  form must say so plainly rather than failing after the fact.
