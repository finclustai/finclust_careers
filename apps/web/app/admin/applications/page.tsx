import { apiGet } from "@/lib/server-api";
import { Filters, type FilterOptions } from "./filters";
import { filterQuery, type ResultsPage } from "./query";
import { Results } from "./results";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = filterQuery((key) => (typeof raw[key] === "string" ? (raw[key] as string) : null));

  const [data, jobs, profiles, recruiters] = await Promise.all([
    apiGet<ResultsPage>(`/applications?${query}`),
    apiGet<{ items: { id: string; jobId: string; title: string }[] }>("/jobs?pageSize=100"),
    apiGet<{ id: string; name: string }[]>("/job-profiles"),
    apiGet<{ id: string; name: string }[]>("/recruiters").catch(() => []),
  ]);
  const options: FilterOptions = { jobs: jobs.items, profiles, recruiters };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">Applications</h1>
      </header>
      <Filters options={options} />
      <Results initial={data} initialQuery={query} />
    </main>
  );
}
