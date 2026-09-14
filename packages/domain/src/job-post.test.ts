import { describe, expect, it } from "vitest";
import { buildWhatsappPost } from "./job-post.js";

const URL = "https://careers.finclust.ai/apply/BAX-EBS-01?source=whatsapp";
const full = {
  title: "EBS R12 FUNCTIONAL",
  client: "Secret Client Ltd",
  location: "Hyderabad/Gurugram",
  workMode: "ONSITE" as const,
  employmentType: "CONTRACT" as const,
  minExperience: 4,
  maxExperience: 10,
  openings: 2,
  requiredSkills: ["Oracle EBS R12", "GL", "AP"],
  description: "We are looking for an experienced consultant.\n\n- Lead finance modules\n- Work with clients",
};

describe("buildWhatsappPost", () => {
  it("opens with a greeting and the role in bold", () => {
    const post = buildWhatsappPost(full, URL);
    expect(post.startsWith("Hello everyone,\n\nFINCLUST is hiring for the role of\n*EBS R12 FUNCTIONAL*")).toBe(true);
  });

  it("lists the facts that were filled in", () => {
    const post = buildWhatsappPost(full, URL);
    expect(post).toContain("*Location:* Hyderabad/Gurugram (On-site)");
    expect(post).toContain("*Experience:* 4-10 years");
    expect(post).toContain("*Employment:* Contract");
    expect(post).toContain("*Openings:* 2");
    expect(post).toContain("*Key skills:* Oracle EBS R12, GL, AP");
  });

  // Naming the client invites candidates and rival agencies to go direct.
  it("never names the client", () => {
    expect(buildWhatsappPost(full, URL)).not.toContain("Secret Client");
  });

  it("includes the description as one flowing paragraph", () => {
    expect(buildWhatsappPost(full, URL)).toContain(
      "*About the role*\nWe are looking for an experienced consultant. Lead finance modules. Work with clients.",
    );
  });

  it("shortens a long description at a word boundary", () => {
    const post = buildWhatsappPost({ ...full, description: "word ".repeat(200) }, URL);
    const about = post.split("*About the role*\n")[1].split("\n")[0];
    expect(about.length).toBeLessThanOrEqual(301);
    expect(about.endsWith("word…")).toBe(true);
  });

  it("ends with the link, a request to share and a sign-off", () => {
    const post = buildWhatsappPost(full, URL);
    expect(post).toContain(`apply here with your CV (takes about a minute):\n${URL}`);
    expect(post.endsWith("Know someone who fits? Please share this post.\n\nRegards,\nFINCLUST Recruitment")).toBe(true);
  });

  it("leaves out whatever a job does not have", () => {
    const post = buildWhatsappPost(
      { title: "Analyst", client: null, location: null, workMode: null, employmentType: null, minExperience: null, maxExperience: null, openings: 1, requiredSkills: [], description: null },
      URL,
    );
    expect(post).not.toMatch(/Location|Experience|Employment|Openings|Key skills|About the role/);
    expect(post).toContain("*Analyst*");
  });

  it("describes open-ended experience ranges", () => {
    expect(buildWhatsappPost({ ...full, maxExperience: null }, URL)).toContain("*Experience:* 4+ years");
    expect(buildWhatsappPost({ ...full, minExperience: null }, URL)).toContain("*Experience:* up to 10 years");
  });

  it("shows a remote job's mode on its own when there is no location", () => {
    expect(buildWhatsappPost({ ...full, location: null, workMode: "REMOTE" }, URL)).toContain("*Location:* Remote");
  });
});
