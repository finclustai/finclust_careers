import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CV_MIME, cvTypeFromName, cvTypeFromSignature, type CvType } from "@finclust/domain";
import { env } from "../env.js";

const MAX_BYTES = 10 * 1024 * 1024;
// Longest signature checked is the 8-byte OLE header of a legacy .doc.
const SIGNATURE_BYTES = 8;

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: SupabaseClient = createClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
    { auth: { persistSession: false } },
  );

  /**
   * The browser uploads straight to storage with this, so CV bytes never pass
   * through the API (ADR-0003). The serverless request body cap is 4.5MB and a
   * CV may be 10MB, so routing uploads through here is not an option.
   *
   * The file name only picks the stored extension. What the file really is gets
   * decided later from its bytes (assertStoredCv).
   */
  async createUploadUrl(jobId: string, fileName: string) {
    const type = cvTypeFromName(fileName);
    if (!type) {
      throw new BadRequestException("Upload your CV as a PDF or Word file (.pdf, .doc, .docx).");
    }

    const path = `${jobId}/${crypto.randomUUID()}.${type}`;
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
   * Confirms the stored object is really a CV before it is recorded against an
   * Application. The declared content type came from the browser and is free to
   * lie, so the first bytes are read back from storage instead (ADR-0009).
   */
  async assertStoredCv(path: string): Promise<{ size: number; mimeType: string; type: CvType }> {
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
      throw new BadRequestException("That file is over 10MB. Upload a smaller file.");
    }
    if (size === 0) {
      await this.remove(path);
      throw new BadRequestException("That file is empty. Upload your CV again.");
    }

    const type = cvTypeFromSignature(await this.readHead(path));
    if (!type) {
      await this.remove(path);
      throw new BadRequestException(
        "That file is not a PDF or Word document. Upload your CV as .pdf, .doc or .docx.",
      );
    }

    return { size, mimeType: CV_MIME[type], type };
  }

  /**
   * Reads only the first bytes of a stored object with an HTTP Range request.
   * The storage SDK has no ranged download, and downloading a 10MB CV into a
   * serverless function to inspect eight bytes wastes memory and time on every
   * single application.
   */
  private async readHead(path: string): Promise<Uint8Array> {
    const url = `${env.supabaseUrl}/storage/v1/object/${env.resumeBucket}/${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.supabaseSecretKey}`,
        apikey: env.supabaseSecretKey,
        Range: `bytes=0-${SIGNATURE_BYTES - 1}`,
      },
    });
    if (!response.ok) throw new BadRequestException("Could not read the upload. Try again.");
    return new Uint8Array(await response.arrayBuffer()).subarray(0, SIGNATURE_BYTES);
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
   * Only PDFs are ever served inline, and only after their bytes were confirmed
   * to start with %PDF- (ADR-0009). Storage sends X-Content-Type-Options:
   * nosniff and the browser opens a PDF in its sandboxed viewer. Word files may
   * carry active content, so callers must always pass `downloadAs` for them.
   */
  async createSignedUrl(path: string, downloadAs?: string) {
    const { data, error } = await this.client.storage
      .from(env.resumeBucket)
      .createSignedUrl(path, 60, downloadAs ? { download: downloadAs } : undefined);

    if (error || !data) throw new BadRequestException("Could not prepare that file.");
    return data.signedUrl;
  }

  /** Erases many objects at once; used by permanent delete (ADR-0011). */
  async removeMany(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.client.storage.from(env.resumeBucket).remove(paths);
    if (error) this.log.warn(`Could not remove ${paths.length} objects: ${error.message}`);
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(env.resumeBucket).remove([path]);
    if (error) this.log.warn(`Could not remove orphaned object ${path}: ${error.message}`);
  }
}
