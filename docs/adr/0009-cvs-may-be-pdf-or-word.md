# CVs may be PDF or Word

Supersedes ADR-0002. Candidates may upload a CV as PDF, DOC or DOCX, because many
people in the target audience only have a Word CV and asking them to export a PDF
first loses applications at the last step.

Nothing is converted. Word files are stored exactly as uploaded.

## Consequences

- The stored object's first bytes are still checked before an Application is
  written: `%PDF-` for PDF, `PK\x03\x04` for DOCX, `D0 CF 11 E0` for DOC. The
  client-declared content type is still not trusted.
- The storage bucket accepts all three MIME types; the 10 MB limit is unchanged.
- PDFs preview in the browser's own PDF viewer. Where a browser has none
  (Android Chrome), the panel offers Open and Download instead of a frame that
  would silently download.
- Word CVs preview through Microsoft's Office viewer (view.officeapps.live.com),
  which fetches the file once from a 60-second signed URL. The file therefore
  passes through Microsoft to be displayed; it is not stored there. This was an
  explicit choice over a text-only conversion, for the real layout.
- A Word file is still never rendered on our own origin: it is shown inside
  Microsoft's viewer or downloaded as an attachment, so any active content in it
  cannot run against the admin console.
