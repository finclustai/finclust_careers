/**
 * Stand-in for the few Zoho endpoints the API calls, so tests exercise the
 * whole share flow without filling the real mailbox with drafts. Records what
 * it received; tests read it back from GET /__drafts.
 */
import { createServer } from "node:http";

const drafts = [];
const attachments = new Map();

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://fake");
  const body = await readBody(req);

  if (url.pathname === "/__health") return json(res, 200, { ok: true });
  if (url.pathname === "/__drafts") return json(res, 200, drafts);

  if (url.pathname === "/oauth/v2/token") return json(res, 200, { access_token: "fake-token", expires_in: 3600 });

  if (req.headers.authorization !== "Zoho-oauthtoken fake-token") {
    return json(res, 401, { status: { code: 401, description: "Invalid token" } });
  }

  if (req.method === "GET" && url.pathname === "/api/accounts") {
    return json(res, 200, { status: { code: 200 }, data: [{ accountId: "1", primaryEmailAddress: "hr@e2e.test" }] });
  }

  if (req.method === "POST" && url.pathname === "/api/accounts/1/messages/attachments") {
    const name = url.searchParams.get("fileName");
    const path = `/fake/${attachments.size + 1}-${name}`;
    attachments.set(path, { name, bytes: body.length, head: body.subarray(0, 5).toString("latin1") });
    return json(res, 200, { status: { code: 200 }, data: [{ storeName: "fake", attachmentPath: path, attachmentName: name }] });
  }

  if (req.method === "POST" && url.pathname === "/api/accounts/1/messages") {
    const draft = JSON.parse(body.toString("utf8"));
    drafts.push({
      ...draft,
      attachments: (draft.attachments ?? []).map((a) => ({ ...a, ...attachments.get(a.attachmentPath) })),
    });
    return json(res, 200, { status: { code: 200 }, data: { messageId: String(drafts.length), mode: draft.mode } });
  }

  json(res, 404, { status: { code: 404, description: `fake zoho has no ${req.method} ${url.pathname}` } });
}).listen(4010, "127.0.0.1");
