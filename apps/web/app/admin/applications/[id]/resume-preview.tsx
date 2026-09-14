"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";

/**
 * Renders the CV inline from a signed URL. PDF-only (ADR-0002) is what makes
 * this an iframe rather than a conversion pipeline.
 *
 * Signed URLs last 60 seconds, which is right for a download link but far too
 * short for a document someone is reading. The URL is therefore refreshed on
 * demand rather than held: an expired preview shows a Reload control instead of
 * silently going blank.
 */
export function ResumePreview({
  applicationId,
  fileName,
  fileSize,
}: {
  applicationId: string;
  fileName: string;
  fileSize: number;
}) {
  // Two URLs, not one: the iframe needs the inline-disposition URL, the download
  // button needs the attachment one. A single URL cannot serve both.
  const [urls, setUrls] = useState<{ previewUrl: string | null; downloadUrl: string; previewable: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}/resume-url`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not load this CV.");
      }
      const data = await response.json();
      setUrls({ previewUrl: data.previewUrl, downloadUrl: data.downloadUrl, previewable: data.previewable });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this CV.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  return (
    <section className="card flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-sand px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-extrabold" title={fileName}>
          {fileName}
        </h2>
        <span className="tnum shrink-0 text-xs text-mid">{(fileSize / 1024).toFixed(0)} KB</span>

        <button
          type="button"
          onClick={load}
          aria-label="Reload the preview"
          title="Reload the preview"
          className="icon-button shrink-0 border-2 border-ink bg-paper"
        >
          <RefreshCw size={13} strokeWidth={2.5} aria-hidden />
        </button>

        {urls && (
          <>
            {urls.previewUrl && (
            <a
              href={urls.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the CV in a new tab"
              title="Open in a new tab"
              className="icon-button shrink-0 border-2 border-ink bg-paper"
            >
              <ExternalLink size={13} strokeWidth={2.5} aria-hidden />
            </a>
            )}
            <a
              href={urls.downloadUrl}
              aria-label={`Download ${fileName}`}
              title="Download"
              className="icon-button shrink-0 border-2 border-ink bg-orange-tint"
            >
              <Download size={13} strokeWidth={2.5} aria-hidden />
            </a>
          </>
        )}
      </header>

      <div className="relative min-h-[70vh] bg-sand lg:min-h-[calc(100vh-220px)]">
        {loading && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-mid">
            <Loader2 size={17} strokeWidth={2.5} aria-hidden className="animate-spin" />
            Loading CV…
          </p>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p role="alert" className="error">
              <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              {error}
            </p>
            <button type="button" onClick={load} className="btn btn-secondary">
              Try again
            </button>
          </div>
        )}

        {urls && !error && !urls.previewable && (
          // Word files cannot render in a browser and are never rendered here
          // anyway, since they may carry active content (ADR-0009).
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <FileText size={40} strokeWidth={1.75} aria-hidden className="text-mid" />
            <p className="text-sm font-bold">Word document</p>
            <p className="max-w-xs text-sm text-body">
              Word files can&apos;t be previewed in the browser. Download it to open in Word or Google Docs.
            </p>
            <a href={urls.downloadUrl} className="btn btn-primary">
              <Download size={17} strokeWidth={2.5} aria-hidden />
              Download CV
            </a>
          </div>
        )}

        {urls?.previewUrl && !error && (
          <iframe
            src={`${urls.previewUrl}#view=FitH`}
            title={`CV: ${fileName}`}
            onLoad={() => setLoading(false)}
            className="size-full absolute inset-0 border-0"
          />
        )}
      </div>
    </section>
  );
}
