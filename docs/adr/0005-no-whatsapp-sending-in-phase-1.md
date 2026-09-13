# No WhatsApp sending in Phase 1

The requirements centre on WhatsApp distribution, so its absence needs recording.
Meta offers **no API that can post to a WhatsApp group or channel** — the Cloud
API only messages individual numbers, and any business-initiated message is a
billable template requiring prior approval. Phase 1 therefore generates the job
post text and its tracked Application Link for a human to paste into groups, and
sends nothing automatically.

## Consequences

- Phase 1 acknowledgement to the candidate is the on-screen Application
  Reference only. There is no WhatsApp or email acknowledgement yet.
- Any later broadcast feature needs an opt-in consent field captured at
  application time, so the apply form collects that consent from day one even
  though nothing consumes it yet.
