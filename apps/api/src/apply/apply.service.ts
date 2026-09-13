import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { buildApplicationReference, normalisePhone, normaliseSource } from "@finclust/domain";
import type { ApplicationSource } from "@finclust/domain";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import type { ApplyDto } from "./dto.js";

@Injectable()
export class ApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Everything the public form needs to render, and nothing internal. */
  async getOpening(jobId: string, rawSource: string | undefined) {
    const job = await this.prisma.client.jobOpening.findUnique({
      where: { jobId: jobId.trim().toUpperCase() },
      select: {
        id: true,
        jobId: true,
        title: true,
        description: true,
        client: true,
        location: true,
        workMode: true,
        employmentType: true,
        minExperience: true,
        maxExperience: true,
        requiredSkills: true,
        status: true,
        closesAt: true,
        profile: { select: { name: true } },
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
    const job = await this.prisma.client.jobOpening.findUnique({
      where: { jobId: jobId.trim().toUpperCase() },
      select: { id: true, jobId: true, status: true, closesAt: true, title: true },
    });
    if (!job) throw new NotFoundException("That job opening does not exist.");
    this.assertOpen(job);

    const phone = normalisePhone(dto.phone);
    if (!phone) {
      await this.storage.remove(dto.resumePath);
      throw new BadRequestException("Enter a valid mobile number, for example 98765 43210.");
    }

    // The path came from the browser, so the object is confirmed to be a real
    // PDF in our bucket before anything is written (ADR-0002).
    const fileSize = await this.storage.assertStoredPdf(dto.resumePath);
    const source = normaliseSource(rawSource);

    const existing = await this.prisma.client.application.findFirst({
      where: { jobOpeningId: job.id, candidate: { phone } },
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
          resume: {
            create: {
              candidateId: candidate.id,
              originalFileName: dto.resumeFileName,
              fileSize,
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
