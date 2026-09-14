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
- PDFs keep the inline preview. A browser cannot render Word inline, so a Word
  CV shows a download control in the preview panel instead of an empty frame.
- Word downloads are always served as attachments. A Word file from an unknown
  sender can carry active content, so it is never rendered in the recruiter's
  browser.
