import { NextResponse } from "next/server";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

/**
 * Clears the session on the API, then sends the browser back to the login page.
 * A GET so it can be a plain link, and safe to be one because it only destroys
 * a session -- there is nothing here for a malicious page to forge.
 */
export async function GET(request: Request) {
  const upstream = await fetch(`${API_ORIGIN}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  const response = NextResponse.redirect(new URL("/login", request.url));
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}
