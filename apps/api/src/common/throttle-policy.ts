/**
 * Which requests count against the per-IP rate limit.
 *
 * Public routes always do: anyone can call them. Signed-in routes do not,
 * because staff pages are rendered by the website's server and so all arrive
 * from one address; a shared budget would throttle the whole team together.
 * A signed-in route that names its own limit (sharing CVs) keeps it.
 */
export function usesSharedLimit(route: { isPublic: boolean; hasOwnLimit: boolean }): boolean {
  return route.isPublic || route.hasOwnLimit;
}
