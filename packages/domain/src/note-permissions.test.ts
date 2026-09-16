import { describe, expect, it } from "vitest";
import { canChangeNote } from "./note-permissions.js";

const author = { id: "a", role: "RECRUITER" as const };
const colleague = { id: "b", role: "RECRUITER" as const };
const admin = { id: "c", role: "ADMIN" as const };
const note = { authorId: "a" };

describe("canChangeNote", () => {
  // Editing is open to the team; the note then says who edited it.
  it("lets anyone on the team edit a note", () => {
    expect(canChangeNote(author, note, "edit")).toBe(true);
    expect(canChangeNote(colleague, note, "edit")).toBe(true);
    expect(canChangeNote(admin, note, "edit")).toBe(true);
  });

  it("lets the author delete their own note", () => {
    expect(canChangeNote(author, note, "delete")).toBe(true);
  });

  it("stops a colleague deleting someone else's note", () => {
    expect(canChangeNote(colleague, note, "delete")).toBe(false);
  });

  it("lets an admin delete any note", () => {
    expect(canChangeNote(admin, note, "delete")).toBe(true);
  });
});
