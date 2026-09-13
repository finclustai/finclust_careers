import { Injectable } from "@nestjs/common";
import { APPLICATION_SOURCES, type ApplicationSource } from "@finclust/domain";

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

interface ShareableJob {
  jobId: string;
  title: string;
  client: string | null;
  location: string | null;
  minExperience: number | null;
  maxExperience: number | null;
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

    const message = this.whatsappMessage(job);
    return {
      links,
      whatsappMessage: message,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    };
  }

  private applyUrl(jobId: string, source: ApplicationSource): string {
    return `${this.origin}/apply/${jobId}?source=${source.toLowerCase()}`;
  }

  private whatsappMessage(job: ShareableJob): string {
    const lines = [`*${job.title}*`];
    if (job.client) lines.push(`Client: ${job.client}`);
    if (job.location) lines.push(`Location: ${job.location}`);

    const experience = this.experienceBand(job);
    if (experience) lines.push(`Experience: ${experience}`);

    lines.push("", "Apply here:", this.applyUrl(job.jobId, "WHATSAPP"), "", "— FINCLUST Recruitment");
    return lines.join("\n");
  }

  private experienceBand(job: ShareableJob): string | null {
    const { minExperience: min, maxExperience: max } = job;
    if (min !== null && max !== null) return `${min}-${max} years`;
    if (min !== null) return `${min}+ years`;
    if (max !== null) return `up to ${max} years`;
    return null;
  }
}
