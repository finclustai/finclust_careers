import { Injectable } from "@nestjs/common";
import { APPLICATION_SOURCES, defaultPostFor, type ApplicationSource, type PostableJob } from "@finclust/domain";

export interface ShareLink {
  source: ApplicationSource;
  url: string;
  clickCount: number;
  /** What the editor shows: this job's own wording for the channel, or the default. */
  template: string;
  customTemplate: boolean;
}

/** Nothing is sent from here (ADR-0005); these are for a person to paste. */
export interface ShareKit {
  links: ShareLink[];
}

interface ShareableJob extends PostableJob {
  jobId: string;
  shareMessages: unknown;
  applicationLinks?: { source: ApplicationSource; clickCount: number }[];
}

@Injectable()
export class PublicLinksService {
  private readonly origin = (process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

  /**
   * One link per source, each with its own post. The post itself is built in
   * the browser from the template (buildJobPost), so it can follow edits live.
   */
  buildShareKit(job: ShareableJob): ShareKit {
    const counts = new Map(job.applicationLinks?.map((l) => [l.source, l.clickCount]));
    const saved = (job.shareMessages ?? {}) as Record<string, string>;
    return {
      links: APPLICATION_SOURCES.map((source) => ({
        source,
        url: this.applyUrl(job.jobId, source),
        clickCount: counts.get(source) ?? 0,
        template: saved[source] ?? defaultPostFor(source),
        customTemplate: Boolean(saved[source]),
      })),
    };
  }

  private applyUrl(jobId: string, source: ApplicationSource): string {
    return `${this.origin}/apply/${jobId}?source=${source.toLowerCase()}`;
  }
}
