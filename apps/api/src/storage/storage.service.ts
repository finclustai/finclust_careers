import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";

const PDF_SIGNATURE = "%PDF-";
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: SupabaseClient = createClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
    { auth: { persistSession: false } },
  );

  /**
   * The browser uploads straight to storage with this, so resume bytes never
   * pass through the API (ADR-0003). Our serverless request body cap is 4.5MB
   * and resumes may be 10MB, so routing them through here is not an option.
   */
  async createUploadUrl(jobId: string) {
    const path = `${jobId}/${crypto.randomUUID()}.pdf`;
    const { data, error } = await this.client.storage
      .from(env.resumeBucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      this.log.error(`Could not create upload URL: ${error?.message}`);
      throw new BadRequestException("Could not start the upload. Try again.");
    }
    return { path: data.path, token: data.token, signedUrl: data.signedUrl };
  }

  /**
   * Confirms the stored object is really a PDF before it is recorded against an
   * Application. The declared content type came from the browser and is free to
   * lie, so the first bytes are read back from storage instead.
   */
  async assertStoredPdf(path: string): Promise<number> {
    const { data, error } = await this.client.storage.from(env.resumeBucket).info(path);
    if (error || !data) throw new BadRequestException("Upload your CV before submitting.");

    // Storage reports size as optional. An object we cannot size is one we
    // cannot vouch for, so it is refused rather than recorded on trust.
    const size = data.size;
    if (typeof size !== "number") {
      await this.remove(path);
      throw new BadRequestException("Could not read the upload. Try again.");
    }
    if (size > MAX_BYTES) {
      await this.remove(path);
      throw new BadRequestException("That file is over 10MB. Upload a smaller PDF.");
    }
    if (size === 0) {
      await this.remove(path);
      throw new BadRequestException("That file is empty. Upload your CV again.");
    }

    const head = await this.client.storage
      .from(env.resumeBucket)
      .download(path, { transform: undefined });

    if (head.error || !head.data) throw new BadRequestException("Could not read the upload. Try again.");

    const signature = new TextDecoder().decode(
      new Uint8Array(await head.data.slice(0, 5).arrayBuffer()),
    );
    if (signature !== PDF_SIGNATURE) {
      await this.remove(path);
      throw new BadRequestException("That file is not a PDF. Export your CV as PDF and try again.");
    }

    return size;
  }

  /**
   * Short-lived and role-checked by the caller. The bucket stays private.
   *
   * `downloadAs` decides Content-Disposition, and the two uses are not
   * interchangeable. With it, storage replies `attachment`, which a browser
   * saves to disk and an iframe renders as nothing. Without it, the reply is
   * `Content-Type: application/pdf` with no disposition, which renders in the
   * viewer. The preview therefore needs the plain URL and the download button
   * needs the attachment one.
   *
   * Serving a PDF inline is safe here because the bytes were confirmed to start
   * with %PDF- before the Resume row was written (ADR-0002), the bucket accepts
   * no other MIME type, storage sends X-Content-Type-Options: nosniff, and the
   * browser opens it in its sandboxed PDF viewer rather than as a document.
   */
  async createSignedUrl(path: string, downloadAs?: string) {
    const { data, error } = await this.client.storage
      .from(env.resumeBucket)
      .createSignedUrl(path, 60, downloadAs ? { download: downloadAs } : undefined);

    if (error || !data) throw new BadRequestException("Could not prepare that file.");
    return data.signedUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(env.resumeBucket).remove([path]);
    if (error) this.log.warn(`Could not remove orphaned object ${path}: ${error.message}`);
  }
}
