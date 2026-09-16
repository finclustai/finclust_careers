"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface Urls {
  previewUrl: string;
  downloadUrl: string;
  viewer: "pdf" | "office";
}

const officeEmbed = (url: string) => `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
const officeView = (url: string) => `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;

/**
 * Shows the CV from a short-lived signed URL. PDFs use the browser's own
 * viewer; Word files use Microsoft's Office viewer, since no browser can render
 * them (ADR-0009). Signed URLs last 60 seconds, so an expired preview offers
 * Reload rather than going blank.
 *
 * `fill` makes it take its container's height (the board's side panel);
 * otherwise it sizes itself to the screen.
 */
export function ResumePreview({
  applicationId,
  fileName,
  fileSize,
  fill = false,
}: {
  applicationId: string;
  fileName: string;
  fileSize: number;
  fill?: boolean;
}) {
  const [urls, setUrls] = useState<Urls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  // Android Chrome has no built-in PDF viewer: an iframe there silently turns
  // into a download on every visit, and that download can cancel the next page
  // navigation. Such browsers get Open and Download buttons for PDFs instead.
  const [inlinePdf, setInlinePdf] = useState(true);
  useEffect(() => setInlinePdf(navigator.pdfViewerEnabled !== false), []);

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
      setUrls({ previewUrl: data.previewUrl, downloadUrl: data.downloadUrl, viewer: data.viewer });
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

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const frame = urls && !error && (urls.viewer === "office" || inlinePdf);
  const openUrl = urls ? (urls.viewer === "office" ? officeView(urls.previewUrl) : urls.previewUrl) : null;
  const size = fileSize < 1024 * 1024 ? `${Math.max(1, Math.round(fileSize / 1024))} KB` : `${(fileSize / 1024 / 1024).toFixed(1)} MB`;

  return (
    <section
      aria-label={`CV: ${fileName}`}
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-paper"
          : fill
            ? "flex h-full flex-col overflow-hidden"
            : // Tall enough to read a page, and on desktop it stays in view while the details beside it scroll.
              "card flex h-[80dvh] flex-col overflow-hidden lg:sticky lg:top-[84px] lg:h-[calc(100dvh-104px)] lg:self-start"
      }
    >
      <header className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-sand px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-extrabold" title={fileName}>
          {fileName}
        </h2>
        <span className="tnum shrink-0 text-xs text-mid">{size}</span>

        <button type="button" onClick={load} aria-label="Reload the preview" title="Reload the preview" className="icon-button shrink-0 border-2 border-ink bg-paper">
          <RefreshCw size={13} strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Exit full screen" : "Full screen"}
          title={expanded ? "Exit full screen (Esc)" : "Full screen"}
          className="icon-button shrink-0 border-2 border-ink bg-paper"
        >
          {expanded ? <Minimize2 size={13} strokeWidth={2.5} aria-hidden /> : <Maximize2 size={13} strokeWidth={2.5} aria-hidden />}
        </button>
        {urls && openUrl && (
          <>
            <a href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the CV in a new tab" title="Open in a new tab" className="icon-button shrink-0 border-2 border-ink bg-paper">
              <ExternalLink size={13} strokeWidth={2.5} aria-hidden />
            </a>
            <a href={urls.downloadUrl} aria-label={`Download ${fileName}`} title="Download" className="icon-button shrink-0 border-2 border-ink bg-orange-tint">
              <Download size={13} strokeWidth={2.5} aria-hidden />
            </a>
          </>
        )}
      </header>

      <div className="relative min-h-[240px] flex-1 bg-sand">
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

        {urls && !error && !frame && openUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <FileText size={40} strokeWidth={1.75} aria-hidden className="text-mid" />
            <p className="max-w-xs text-sm text-body">This browser can&apos;t show the CV inside the page.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={openUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <ExternalLink size={17} strokeWidth={2.5} aria-hidden />
                Open CV
              </a>
              <a href={urls.downloadUrl} className="btn btn-secondary">
                <Download size={17} strokeWidth={2.5} aria-hidden />
                Download
              </a>
            </div>
          </div>
        )}

        {frame && urls && (
          <iframe
            key={urls.previewUrl}
            src={urls.viewer === "office" ? officeEmbed(urls.previewUrl) : `${urls.previewUrl}#view=FitH`}
            title={`CV: ${fileName}`}
            className="absolute inset-0 size-full border-0 bg-paper"
          />
        )}
      </div>
    </section>
  );
}
