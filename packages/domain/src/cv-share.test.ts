import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES } from "./application-status.js";
import { DEFAULT_SHARE_TEMPLATE, buildShareEmail, parseEmailList, stageAfterSharing } from "./cv-share.js";

describe("stageAfterSharing", () => {
  it.each(["NEW", "SCREENING", "SHORTLISTED", "ON_HOLD"] as const)("moves %s forward to Sent to client", (status) => {
    expect(stageAfterSharing(status)).toBe("SENT_TO_CLIENT");
  });

  // Sharing again later must never drag someone back from an interview or an
  // offer, and a rejection is a decision sharing does not overturn.
  it.each(["SENT_TO_CLIENT", "INTERVIEW", "SELECTED", "OFFER", "JOINED", "REJECTED"] as const)(
    "leaves %s where it is",
    (status) => {
      expect(stageAfterSharing(status)).toBeNull();
    },
  );

  it("places Sent to client between Shortlisted and Interview", () => {
    const i = APPLICATION_STATUSES.indexOf("SENT_TO_CLIENT");
    expect(APPLICATION_STATUSES[i - 1]).toBe("SHORTLISTED");
    expect(APPLICATION_STATUSES[i + 1]).toBe("INTERVIEW");
  });
});

describe("parseEmailList", () => {
  it("splits on commas, semicolons and spaces, lowercases and de-duplicates", () => {
    expect(parseEmailList(" HR@Client.com; ops@client.com,hr@client.com  x@y.in")).toEqual({
      valid: ["hr@client.com", "ops@client.com", "x@y.in"],
      invalid: [],
    });
  });

  it("reports what is not an address", () => {
    expect(parseEmailList("hr@client.com, not-an-email")).toEqual({
      valid: ["hr@client.com"],
      invalid: ["not-an-email"],
    });
  });
});

const job = { jobId: "BAX-EBS-01", title: "EBS R12 Functional" };
const candidate = {
  name: "Satish Bhalerao",
  totalExperience: "8",
  location: "Pune",
  noticePeriod: "30 days",
  expectedSalary: null,
};

describe("buildShareEmail", () => {
  it("fills the subject and names the count", () => {
    const email = buildShareEmail(DEFAULT_SHARE_TEMPLATE, job, [candidate, { ...candidate, name: "Abhishek" }], "HR Team");
    expect(email.subject).toBe("Profiles for EBS R12 Functional (BAX-EBS-01) – 2 candidates");
  });

  it("uses the singular for one candidate", () => {
    expect(buildShareEmail(DEFAULT_SHARE_TEMPLATE, job, [candidate], "HR").subject).toContain("1 candidate");
    expect(buildShareEmail(DEFAULT_SHARE_TEMPLATE, job, [candidate], "HR").subject).not.toContain("candidates");
  });

  it("puts every candidate in the table, with a dash for what is missing", () => {
    const { html } = buildShareEmail(DEFAULT_SHARE_TEMPLATE, job, [candidate], "HR");
    expect(html).toContain("<table");
    expect(html).toContain("Satish Bhalerao");
    expect(html).toContain("8 yrs");
    expect(html).toContain("30 days");
    expect(html).toMatch(/<td[^>]*>–<\/td>/);
  });

  // Names and notes come from a public form. Unescaped, an applicant could put
  // markup or a phishing link into an email sent from the company mailbox.
  it("escapes what candidates typed", () => {
    const { html } = buildShareEmail(DEFAULT_SHARE_TEMPLATE, job, [{ ...candidate, name: '<a href="x">Win</a>' }], "HR");
    expect(html).not.toContain('<a href="x">');
    expect(html).toContain("&lt;a href=&quot;x&quot;&gt;Win&lt;/a&gt;");
  });

  it("turns the template's blank lines into paragraphs and keeps line breaks", () => {
    const { html } = buildShareEmail({ subject: "S", body: "Hello,\n\nLine one\nLine two\n\n{candidates}" }, job, [candidate], "HR");
    expect(html).toContain("<p>Hello,</p>");
    expect(html).toContain("<p>Line one<br>Line two</p>");
  });

  it("escapes the template text too", () => {
    const { html } = buildShareEmail({ subject: "S", body: "Fish & <chips>\n\n{candidates}" }, job, [candidate], "HR");
    expect(html).toContain("Fish &amp; &lt;chips&gt;");
  });

  it("adds the table at the end when the template forgets the placeholder", () => {
    const { html } = buildShareEmail({ subject: "S", body: "Hello" }, job, [candidate], "HR");
    expect(html.indexOf("<table")).toBeGreaterThan(html.indexOf("Hello"));
  });
});
