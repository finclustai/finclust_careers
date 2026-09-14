/**
 * Browser-side call to the API through the same-origin /api rewrite. Throws an
 * Error carrying the API's own message, so callers can show it as-is.
 */
export async function send<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Something went wrong. Try again.");
  }
  return data as T;
}

export const errorText = (caught: unknown) =>
  caught instanceof Error ? caught.message : "Something went wrong. Try again.";
