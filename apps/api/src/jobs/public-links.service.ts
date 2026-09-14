import { Injectable } from "@nestjs/common";
import { APPLICATION_SOURCES, buildWhatsappPost, type ApplicationSource, type PostableJob } from "@finclust/domain";

export interface ShareLink {
  source: ApplicationSource;
  url: string;
  clickCount: number;
}

export interface ShareKit {
  links: ShareLink[];
  /** Ready to paste into a WhatsApp group. Nothing is sent (ADR-0005). */
  whatsappMessage: string;
  whatsappShareUrl: string;
}

interface ShareableJob extends PostableJob {
  jobId: string;
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

    const message = buildWhatsappPost(job, this.applyUrl(job.jobId, "WHATSAPP"));
    return {
      links,
      whatsappMessage: message,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    };
  }

  private applyUrl(jobId: string, source: ApplicationSource): string {
    return `${this.origin}/apply/${jobId}?source=${source.toLowerCase()}`;
  }
}
