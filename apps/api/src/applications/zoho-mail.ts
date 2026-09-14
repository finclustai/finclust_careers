import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../env.js";

// Zoho's JSON varies by endpoint; only these fields are read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZohoBody = { status?: { code?: number }; data?: any; access_token?: string; expires_in?: number };

interface Attachment {
  storeName: string;
  attachmentPath: string;
  attachmentName: string;
}

/**
 * The company Zoho mailbox, reached through the Zoho Mail API with a refresh
 * token (ADR-0012). Creates drafts; it never sends. A person reviews and sends
 * from Zoho Mail itself.
 */
@Injectable()
export class ZohoMail {
  private readonly log = new Logger(ZohoMail.name);
  // Per warm function instance. Zoho access tokens last an hour.
  private token: { value: string; expiresAt: number } | null = null;
  private account: { id: string; email: string } | null = null;

  get configured() {
    return env.zoho !== null;
  }

  get draftsUrl() {
    return `${this.config.mailApiUrl}/zm/#mail/folder/drafts`;
  }

  get mailbox() {
    return this.getAccount().then((a) => a.email);
  }

  async uploadAttachment(file: Buffer, fileName: string): Promise<Attachment> {
    const { id } = await this.getAccount();
    const body = await this.call(
      `/api/accounts/${id}/messages/attachments?fileName=${encodeURIComponent(fileName)}`,
      { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(file) },
    );
    const data = Array.isArray(body.data) ? body.data[0] : body.data;
    return { storeName: data.storeName, attachmentPath: data.attachmentPath, attachmentName: data.attachmentName };
  }

  async createDraft(draft: { to: string[]; cc: string[]; subject: string; html: string; attachments: Attachment[] }) {
    const { id, email } = await this.getAccount();
    const body = await this.call(`/api/accounts/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "draft",
        fromAddress: email,
        toAddress: draft.to.join(","),
        ...(draft.cc.length ? { ccAddress: draft.cc.join(",") } : {}),
        subject: draft.subject,
        content: draft.html,
        mailFormat: "html",
        attachments: draft.attachments,
      }),
    });
    return { messageId: String(body.data?.messageId ?? "") || null };
  }

  private get config() {
    if (!env.zoho) throw new ServiceUnavailableException("Sharing CVs by email is not set up yet.");
    return env.zoho;
  }

  private async getAccount() {
    if (this.account) return this.account;
    const body = await this.call("/api/accounts", {});
    const first = body.data?.[0];
    if (!first) throw new BadGatewayException("The Zoho mailbox could not be found.");
    this.account = { id: String(first.accountId), email: first.primaryEmailAddress ?? first.mailboxAddress };
    return this.account;
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const { accountsUrl, clientId, clientSecret, refreshToken } = this.config;
    const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as ZohoBody;
    if (!body.access_token) {
      this.log.error(`Zoho token refresh failed: ${JSON.stringify(body)}`);
      throw new ServiceUnavailableException("The Zoho Mail connection needs to be renewed. Ask an admin.");
    }
    this.token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async call(path: string, init: RequestInit): Promise<ZohoBody> {
    const response = await fetch(`${this.config.mailApiUrl}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Zoho-oauthtoken ${await this.accessToken()}` },
    });
    const body = (await response.json().catch(() => ({}))) as ZohoBody;
    if (!response.ok || (body.status?.code && body.status.code !== 200)) {
      this.log.error(`Zoho ${path.split("?")[0]} failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);
      if (response.status === 401) this.token = null;
      throw new BadGatewayException(
        `Zoho Mail refused the request${body.data?.moreInfo ? `: ${body.data.moreInfo}` : ""}. Try again.`,
      );
    }
    return body;
  }
}
