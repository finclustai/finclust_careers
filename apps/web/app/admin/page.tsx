import { redirect } from "next/navigation";

// Lets an admin type careers.finclust.ai/admin and land somewhere useful. The
// admin layout runs first, so a signed-out visitor is sent to /login instead.
export default function AdminIndex() {
  redirect("/admin/jobs");
}
