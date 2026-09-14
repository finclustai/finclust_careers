import { fetchOpenJobs } from "@/lib/api";
import { OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "Job opening at FINCLUST";
export const size = OG_SIZE;
export const contentType = "image/png";

// Looks the job up from the open-roles list, not the apply endpoint: the apply
// endpoint counts a link click, and WhatsApp fetching a preview is not a click.
export default async function Image({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = (await fetchOpenJobs())?.find((j) => j.jobId === jobId.toUpperCase());
  return await renderOgCard(job);
}
