import { Injectable } from "@nestjs/common";
import { APPLICATION_SOURCES, DEFAULT_JOB_POST, buildJobPost, type ApplicationSource, type PostableJob } from "@finclust/domain";

export interface ShareLink {
  source: ApplicationSource;
  url: string;
  clickCount: number;
}

export interface ShareKit {
  links: ShareLink[];
  /** Ready to paste into a group. Nothing is sent (ADR-0005). */
  whatsappMessage: string;
  whatsappShareUrl: string;
  telegramMessage: string;
  /** What the editor shows: the job's own template, or the default. */
  template: string;
  customTemplate: boolean;
}

interface ShareableJob extends PostableJob {
  jobId: string;
  shareMessage: string | null;
  applicationLinks?: { source: ApplicationSource; clickCount: number }[];
}

@Injectable()
export class PublicLinksService {
  private readonly origin = (process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

  buildShareKit(job: ShareableJob): ShareKit {
    const counts = new Map(job.applicationLinks?.map((l) => [l.source, l.clickCount]));
    const links = APPLICATION_SOURCES.map((source) => ({
      source,
      url: this.applyUrl(job.jobId, source),
      clickCount: counts.get(source) ?? 0,
    }));

    // One template, each channel with its own link, so applications from a
    // Telegram group are counted as Telegram.
    const message = buildJobPost(job, this.applyUrl(job.jobId, "WHATSAPP"), job.shareMessage);
    return {
      links,
      whatsappMessage: message,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegramMessage: buildJobPost(job, this.applyUrl(job.jobId, "TELEGRAM"), job.shareMessage),
      template: job.shareMessage ?? DEFAULT_JOB_POST,
      customTemplate: job.shareMessage !== null,
    };
  }

  private applyUrl(jobId: string, source: ApplicationSource): string {
    return `${this.origin}/apply/${jobId}?source=${source.toLowerCase()}`;
  }
}
