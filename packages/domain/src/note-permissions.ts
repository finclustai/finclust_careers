/**
 * Team notes: anyone who can see the candidate may edit a note (it then records
 * who edited it), but only its author or an admin may delete one.
 */
export function canChangeNote(
  user: { id: string; role: "ADMIN" | "RECRUITER" },
  note: { authorId: string },
  action: "edit" | "delete",
): boolean {
  if (action === "edit") return true;
  return note.authorId === user.id || user.role === "ADMIN";
}
