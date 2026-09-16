import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_POST, buildJobPost } from "./job-post.js";

const buildWhatsappPost = (job: Parameters<typeof buildJobPost>[0], url: string) => buildJobPost(job, url);

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

describe("buildJobPost with an edited template", () => {
  it("fills every placeholder from the job", () => {
    const post = buildJobPost(full, URL, "Hiring {title} in {location}, {experience}. Skills: {skills}. {employment}, {openings} openings. Apply: {link}");
    expect(post).toBe(
      `Hiring EBS R12 FUNCTIONAL in Hyderabad/Gurugram (On-site), 4-10 years. Skills: Oracle EBS R12, GL, AP. Contract, 2 openings. Apply: ${URL}`,
    );
  });

  // The whole point of saving a template rather than text: editing the job
  // later changes the post without anyone rewriting it.
  it("picks up a changed job without touching the template", () => {
    const template = "*{title}*\nLocation: {location}\n{link}";
    expect(buildJobPost({ ...full, location: "Pune", workMode: null }, URL, template)).toBe(`*EBS R12 FUNCTIONAL*\nLocation: Pune\n${URL}`);
  });

  it("puts each channel's own link in", () => {
    expect(buildJobPost(full, "https://x/apply/A?source=telegram", "Apply: {link}")).toBe("Apply: https://x/apply/A?source=telegram");
  });

  it("drops a line whose fact the job does not have", () => {
    expect(buildJobPost({ ...full, location: null, workMode: null }, URL, "Role: {title}\nLocation: {location}\nEnd")).toBe(
      "Role: EBS R12 FUNCTIONAL\nEnd",
    );
  });

  it("drops a paragraph when every fact in it is missing", () => {
    const template = "Intro\n\n*About the role*\n{about}\n\nBye";
    expect(buildJobPost({ ...full, description: null }, URL, template)).toBe("Intro\n\nBye");
  });

  it("leaves unknown braces as written", () => {
    expect(buildJobPost(full, URL, "Use {code} {title}")).toBe("Use {code} EBS R12 FUNCTIONAL");
  });

  it("uses the default template when a job has none", () => {
    expect(buildJobPost(full, URL, null)).toBe(buildJobPost(full, URL, DEFAULT_JOB_POST));
    expect(DEFAULT_JOB_POST).toContain("{link}");
  });
});
