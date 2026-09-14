import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { request } from "@playwright/test";
import { ADMIN_STATE, PREFIX, RECRUITER_STATE, STATE, adminCredentials, cleanup, type RunState } from "./support";

const BASE = "http://127.0.0.1:3000";

/**
 * Signs in once per role and saves the sessions, so tests do not each log in
 * (login is limited to 5 a minute per IP). Creates the run's temporary job and
 * recruiter through the real API.
 */
export default async function globalSetup() {
  await cleanup();
  mkdirSync(STATE, { recursive: true });

  const admin = await request.newContext({ baseURL: BASE });
  const login = await admin.post("/api/auth/login", { data: await adminCredentials() });
  if (!login.ok()) throw new Error(`admin login failed: ${login.status()} ${await login.text()}`);
  await admin.storageState({ path: ADMIN_STATE });

  const [profile] = await (await admin.get("/api/job-profiles")).json();
  const stamp = Date.now().toString(36).toUpperCase();
  const jobRes = await admin.post("/api/jobs", {
    data: {
      jobId: `${PREFIX}-${stamp}`,
      title: "E2E Test Role",
      profileId: profile.id,
      location: "Hyderabad",
      workMode: "HYBRID",
      minExperience: 3,
      maxExperience: 9,
      requiredSkills: ["Testing"],
      description: "Temporary role created by the automated tests. Please ignore.",
    },
  });
  if (!jobRes.ok()) throw new Error(`job create failed: ${await jobRes.text()}`);
  const job = await jobRes.json();
  await admin.put(`/api/jobs/${job.id}/status`, { data: { status: "ACTIVE" } });

  const recruiter = { name: `${PREFIX} Recruiter`, email: `recruiter-${stamp.toLowerCase()}@e2e.test`, password: `e2e-${stamp}-pass` };
  const userRes = await admin.post("/api/users", { data: { ...recruiter, role: "RECRUITER" } });
  if (!userRes.ok()) throw new Error(`recruiter create failed: ${await userRes.text()}`);
  const { id } = await userRes.json();
  await admin.dispose();

  const recruiterContext = await request.newContext({ baseURL: BASE });
  const recruiterLogin = await recruiterContext.post("/api/auth/login", { data: { email: recruiter.email, password: recruiter.password } });
  if (!recruiterLogin.ok()) throw new Error(`recruiter login failed: ${recruiterLogin.status()}`);
  await recruiterContext.storageState({ path: RECRUITER_STATE });
  await recruiterContext.dispose();

  const state: RunState = { job: { id: job.id, jobId: job.jobId, title: job.title }, recruiter: { id, ...recruiter } };
  writeFileSync(join(STATE, "run.json"), JSON.stringify(state, null, 2));
}
