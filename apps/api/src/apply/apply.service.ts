import { BadRequestException, GoneException, Injectable, NotFoundException } from "@nestjs/common";
import {
  buildApplicationReference,
  candidateFacingStatus,
  normalisePhone,
  normaliseSource,
  type ApplicationSource,
  type ApplicationStatus,
} from "@finclust/domain";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import type { ApplyDto, StatusLookupDto } from "./dto.js";

/** A job is open to candidates only while active, not trashed and not past its closing date. */
function openJobsWhere(now = new Date()): Prisma.JobOpeningWhereInput {
  return {
    status: "ACTIVE",
    deletedAt: null,
    OR: [{ closesAt: null }, { closesAt: { gt: now } }],
  };
}

const PUBLIC_JOB_FIELDS = {
  jobId: true,
  title: true,
  client: true,
  location: true,
  workMode: true,
  employmentType: true,
  minExperience: true,
  maxExperience: true,
  openedAt: true,
  closesAt: true,
  profile: { select: { name: true } },
} satisfies Prisma.JobOpeningSelect;

@Injectable()
export class ApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Every opening a candidate can apply to right now, for the careers home page. */
  listOpenJobs() {
    return this.prisma.client.jobOpening.findMany({
      where: openJobsWhere(),
      select: PUBLIC_JOB_FIELDS,
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  /** Everything the public form needs to render, and nothing internal. */
  async getOpening(jobId: string, rawSource: string | undefined) {
    const job = await this.prisma.client.jobOpening.findFirst({
      where: { jobId: jobId.trim().toUpperCase(), deletedAt: null },
      select: {
        ...PUBLIC_JOB_FIELDS,
        id: true,
        status: true,
        description: true,
        requiredSkills: true,
        candidateNoteEnabled: true,
      },
    });

    if (!job) throw new NotFoundException("That job opening does not exist.");
    this.assertOpen(job);

    const source = normaliseSource(rawSource);
    await this.countClick(job.id, source);

    const { id: _internalId, status: _status, ...publicFields } = job;
    return { ...publicFields, source };
  }

  async apply(jobId: string, rawSource: string | undefined, dto: ApplyDto) {
    const job = await this.prisma.client.jobOpening.findFirst({
      where: { jobId: jobId.trim().toUpperCase(), deletedAt: null },
      select: {
        id: true,
        jobId: true,
        status: true,
        closesAt: true,
        title: true,
        candidateNoteEnabled: true,
      },
    });
    if (!job) throw new NotFoundException("That job opening does not exist.");
    this.assertOpen(job);

    const phone = normalisePhone(dto.phone);
    if (!phone) {
      await this.storage.remove(dto.resumePath);
      throw new BadRequestException("Enter a valid mobile number, for example 98765 43210.");
    }

    // The path came from the browser, so the object is confirmed to be a real
    // PDF or Word file in our bucket before anything is written (ADR-0009).
    const cv = await this.storage.assertStoredCv(dto.resumePath);
    const source = normaliseSource(rawSource);
    // A note is only kept when this job asks for one; otherwise it is ignored,
    // so a crafted request cannot attach text the recruiter never enabled.
    const candidateNote = job.candidateNoteEnabled ? dto.candidateNote?.trim() || null : null;

    const existing = await this.prisma.client.application.findFirst({
      where: { jobOpeningId: job.id, candidate: { phone }, deletedAt: null },
      select: { applicationReference: true },
    });

    // Re-applying to the same vacancy is not an error. A double-tapped submit on
    // a flaky mobile connection gets back the reference already issued, rather
    // than a second Application or a confusing failure.
    if (existing) {
      await this.storage.remove(dto.resumePath);
      return {
        applicationReference: existing.applicationReference,
        jobTitle: job.title,
        alreadyApplied: true,
      };
    }

    const link = await this.prisma.client.applicationLink.findUnique({
      where: { jobOpeningId_source: { jobOpeningId: job.id, source } },
      select: { id: true },
    });

    const application = await this.prisma.client.$transaction(async (tx) => {
      const candidate = await tx.candidate.upsert({
        where: { phone },
        update: {
          // A returning Candidate's details refresh from their latest
          // application. Blanks never overwrite what we already hold.
          name: dto.fullName.trim(),
          email: dto.email ?? undefined,
          location: dto.location ?? undefined,
          totalExperience: dto.totalExperience ?? undefined,
          currentCompany: dto.currentCompany ?? undefined,
          noticePeriod: dto.noticePeriod ?? undefined,
          expectedSalary: dto.expectedSalary ?? undefined,
          linkedinUrl: dto.linkedinUrl ?? undefined,
          whatsappOptIn: dto.whatsappOptIn ?? undefined,
          // Applying again brings a person back out of Trash.
          deletedAt: null,
        },
        create: {
          phone,
          name: dto.fullName.trim(),
          email: dto.email,
          location: dto.location,
          totalExperience: dto.totalExperience,
          currentCompany: dto.currentCompany,
          noticePeriod: dto.noticePeriod,
          expectedSalary: dto.expectedSalary,
          linkedinUrl: dto.linkedinUrl,
          whatsappOptIn: dto.whatsappOptIn ?? false,
        },
        select: { id: true },
      });

      // UPDATE ... RETURNING takes a row lock, so two candidates submitting to
      // the same vacancy at once cannot be handed the same counter.
      const rows = await tx.$queryRaw<{ application_counter: number }[]>`
        UPDATE job_openings
           SET application_counter = application_counter + 1
         WHERE id = CAST(${job.id} AS uuid)
     RETURNING application_counter
      `;
      const counter = rows[0]?.application_counter;
      if (counter === undefined) {
        throw new BadRequestException("Could not record your application. Try again.");
      }

      return tx.application.create({
        data: {
          applicationReference: buildApplicationReference(job.jobId, Number(counter)),
          candidateId: candidate.id,
          jobOpeningId: job.id,
          applicationLinkId: link?.id,
          source,
          candidateNote,
          resume: {
            create: {
              candidateId: candidate.id,
              originalFileName: dto.resumeFileName,
              fileSize: cv.size,
              mimeType: cv.mimeType,
              storagePath: dto.resumePath,
            },
          },
        },
        select: { applicationReference: true },
      });
    });

    return {
      applicationReference: application.applicationReference,
      jobTitle: job.title,
      alreadyApplied: false,
    };
  }

  /**
   * Lets a candidate check progress with their reference and mobile number.
   * Both must match, and every failure returns the same message, so this cannot
   * be used to confirm whether a reference or a phone number exists.
   */
  async lookupStatus(dto: StatusLookupDto) {
    const phone = normalisePhone(dto.phone);
    const reference = dto.reference.trim().toUpperCase();
    const notFound = new NotFoundException(
      "We could not find an application with that reference and mobile number.",
    );
    if (!phone) throw notFound;

    const application = await this.prisma.client.application.findFirst({
      where: {
        applicationReference: reference,
        candidate: { phone, deletedAt: null },
        deletedAt: null,
        jobOpening: { deletedAt: null },
      },
      select: {
        applicationReference: true,
        status: true,
        appliedAt: true,
        jobOpening: { select: { title: true } },
      },
    });
    if (!application) throw notFound;

    const view = candidateFacingStatus(application.status as ApplicationStatus);
    return {
      applicationReference: application.applicationReference,
      jobTitle: application.jobOpening.title,
      appliedAt: application.appliedAt,
      ...view,
    };
  }

  private assertOpen(job: { status: string; closesAt: Date | null }) {
    if (job.status !== "ACTIVE") {
      throw new GoneException("This opening is no longer accepting applications.");
    }
    if (job.closesAt && job.closesAt.getTime() < Date.now()) {
      throw new GoneException("The closing date for this opening has passed.");
    }
  }

  private async countClick(jobOpeningId: string, source: ApplicationSource) {
    // Best effort: a failed counter must never stop a Candidate applying.
    await this.prisma.client.applicationLink
      .update({
        where: { jobOpeningId_source: { jobOpeningId, source } },
        data: { clickCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }
}
