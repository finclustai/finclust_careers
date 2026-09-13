import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

/**
 * Server-side fetch that forwards the session cookie. Any 401 sends the user to
 * the login page rather than rendering a broken screen.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const response = await fetch(`${API_ORIGIN}/api${path}`, {
    headers: { cookie: jar.toString() },
    cache: "no-store",
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
