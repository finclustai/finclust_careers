# Recruitment CV Management

FINCLUST's recruitment system. Candidates apply to a specific vacancy through a
unique tracked link, upload a resume, and recruiters move each submission through
a hiring pipeline from a central dashboard.

The model is built around **Job Opening + Application + Candidate**, not around
stored documents. One person may apply to many vacancies; each of those is a
separate Application with its own status, source and recruiter.

## Language

### Hiring side

**Job Profile**:
A category of role the business recruits for, such as Oracle EBS Finance.
Job Openings are grouped and filtered by it.
_Avoid_: role, category, designation, skillset

**Job Opening**:
A single vacancy being filled for one Client, carrying its own Job ID, skills,
experience band and lifecycle status.
_Avoid_: vacancy, position, requisition, job post, job ad

**Job ID**:
The human-readable identifier for a Job Opening, such as `EBS-FIN-001`. Appears
in Application Links and Application References. Never typed by a Candidate.
_Avoid_: job code, req number, opening number

**Client**:
The company a Job Opening is being filled for. Distinct from Current Company,
which is where a Candidate works today.
_Avoid_: customer, account, company

**Recruiter**:
A user who owns Applications and moves them through the pipeline. Sees only the
Applications assigned to them.
_Avoid_: agent, owner, consultant

### Candidate side

**Candidate**:
A person who has applied at least once, identified by mobile number. One
Candidate persists across every vacancy they apply to.
_Avoid_: applicant, lead, resource, profile

**Application**:
One Candidate's submission to one Job Opening. The central record of the system:
it holds the status, the Source, the assigned Recruiter and the Resume. A
Candidate applying to three vacancies produces three Applications.
_Avoid_: submission, entry, candidature

**Application Reference**:
The identifier shown to the Candidate on submission and used to find them later,
formatted `FIN-<Job ID>-<counter>`, e.g. `FIN-EBS-FIN-001-000125`.
_Avoid_: application number, ticket number, acknowledgement number

**Resume**:
The PDF document attached to an Application. Stored privately and never served
inline.
_Avoid_: CV, document, attachment, profile

### Routing and tracking

**Application Link**:
A unique URL that resolves to exactly one Job Opening and one Source, so both are
captured without the Candidate entering anything. Carries its own click count.
_Avoid_: apply URL, tracking link, short link

**Source**:
The place a Candidate arrived from — WhatsApp, LinkedIn, Website, Referral or
Other. Fixed set; recorded on the Application at submission and never edited.
_Avoid_: platform, channel, medium, referrer

### Pipeline

**Application Status**:
Where one Application sits in the pipeline: New, Screening, Shortlisted,
Interview, Selected, Offer, Joined, Rejected or On Hold. It belongs to the
Application, not the Candidate — the same person can be Shortlisted for one
vacancy and Rejected for another at the same time.
_Avoid_: candidate status, stage, state

**Status Change**:
A recorded transition of one Application from one Application Status to another,
capturing who changed it, when, and why.
_Avoid_: status update, transition log, history entry
