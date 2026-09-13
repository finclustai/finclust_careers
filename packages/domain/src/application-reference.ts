export function buildApplicationReference(jobId: string, counter: number): string {
  return `FIN-${jobId}-${String(counter).padStart(6, "0")}`;
}
