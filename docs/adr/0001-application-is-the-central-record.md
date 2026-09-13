# The Application is the central record, not the Resume

The requirements describe a "CV Management System", which invites a model where
resumes are the primary table and everything hangs off them. We model the
**Application** — one Candidate's submission to one Job Opening — as the central
record instead, because a single person routinely applies to several vacancies
and each of those needs its own status, source, recruiter and resume.

## Consequences

- Application Status lives on the Application, never on the Candidate. The same
  person can be Shortlisted for EBS Finance and Rejected for Fusion at once.
- Duplicate detection identifies an existing **Candidate** and surfaces their
  prior Applications; it never rejects the new Application.
- Every list screen the recruiter uses ("All Resumes", "Shortlisted") is a query
  over Applications, joined out to Candidate and Job Opening for display.
