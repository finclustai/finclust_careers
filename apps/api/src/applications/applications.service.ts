import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { canTransition, isPreviewable, type ApplicationStatus } from "@finclust/domain";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import type { SessionUser } from "../auth/index.js";
import type { ChangeStatusDto, ListApplicationsQueryDto } from "./dto.js";

const CARD_FIELDS = {
  id: true,
  applicationReference: true,
  status: true,
  source: true,
  appliedAt: true,
  candidate: {
    select: { id: true, name: true, phone: true, location: true, totalExperience: true },
  },
  assignedRecruiter: { select: { id: true, name: true } },
  jobOpening: { select: { id: true, jobId: true, title: true } },
  resume: { select: { id: true } },
} satisfies Prisma.ApplicationSelect;

// Columns page rather than load everything: one vacancy can hold hundreds.
const COLUMN_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Visibility lives here rather than in each endpoint. A RECRUITER sees only
   * what is assigned to them, and no controller can forget to apply it because
   * every query in this service starts from this clause.
   */
  private scope(user: SessionUser): Prisma.ApplicationWhereInput {
    const base: Prisma.ApplicationWhereInput = { deletedAt: null };
    if (user.role === "ADMIN") return base;
    return { ...base, assignedRecruiterId: user.id };
  }

  /** Board data: one Job Opening, grouped into its stage columns. */
  async board(jobOpeningId: string, user: SessionUser) {
    const job = await this.prisma.client.jobOpening.findUnique({
      where: { id: jobOpeningId },
      select: { id: true, jobId: true, title: true, client: true, status: true },
    });
    if (!job) throw new NotFoundException("That job opening does not exist.");

    const where = { ...this.scope(user), jobOpeningId };

    const [cards, counts] = await Promise.all([
      this.prisma.client.application.findMany({
        where,
        select: CARD_FIELDS,
        orderBy: { appliedAt: "desc" },
        take: COLUMN_PAGE_SIZE * 9,
      }),
      this.prisma.client.application.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      job,
      cards,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      columnPageSize: COLUMN_PAGE_SIZE,
    };
  }

  /** Cross-job list with combinable filters, for work that spans vacancies. */
  async list(query: ListApplicationsQueryDto, user: SessionUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const search = query.search?.trim();

    const where: Prisma.ApplicationWhereInput = {
      ...this.scope(user),
      ...(query.jobOpeningId ? { jobOpeningId: query.jobOpeningId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.recruiterId ? { assignedRecruiterId: query.recruiterId } : {}),
      ...(query.appliedFrom || query.appliedTo
        ? {
            appliedAt: {
              ...(query.appliedFrom ? { gte: new Date(query.appliedFrom) } : {}),
              ...(query.appliedTo ? { lte: new Date(query.appliedTo) } : {}),
            },
          }
        : {}),
      ...(query.profileId ? { jobOpening: { profileId: query.profileId } } : {}),
      ...(search
        ? {
            OR: [
              { applicationReference: { contains: search, mode: "insensitive" } },
              { candidate: { name: { contains: search, mode: "insensitive" } } },
              { candidate: { phone: { contains: search } } },
              { candidate: { email: { contains: search, mode: "insensitive" } } },
              { jobOpening: { title: { contains: search, mode: "insensitive" } } },
              { jobOpening: { jobId: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // ponytail: offset pagination. Recruiters want numbered pages, which keyset
    // cannot give. Degrades past ~10k matching rows; revisit then.
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.application.findMany({
        where,
        select: CARD_FIELDS,
        orderBy: { appliedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.application.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, user: SessionUser) {
    const application = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id },
      include: {
        candidate: true,
        jobOpening: { select: { id: true, jobId: true, title: true, client: true } },
        assignedRecruiter: { select: { id: true, name: true } },
        resume: { select: { id: true, originalFileName: true, fileSize: true, mimeType: true, uploadedAt: true } },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { name: true } } },
        },
      },
    });
    // Deliberately a 404 and not a 403: telling a recruiter that an application
    // exists but is not theirs leaks the pipeline of every other recruiter.
    if (!application) throw new NotFoundException("That application does not exist.");
    return application;
  }

  /**
   * The only way an Application changes status. Legality is decided by the same
   * canTransition the board uses to dim columns, so the UI and the API can never
   * disagree, and the history row is written in the same transaction as the
   * change -- a status that moved without a history entry is not possible.
   */
  async changeStatus(id: string, dto: ChangeStatusDto, user: SessionUser) {
    const current = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundException("That application does not exist.");

    const from = current.status as ApplicationStatus;
    const to = dto.status;

    if (from === to) {
      throw new BadRequestException(`This application is already ${label(to)}.`);
    }
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `An application cannot move from ${label(from)} to ${label(to)}.`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: to },
        select: CARD_FIELDS,
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus: from,
          newStatus: to,
          changedById: user.id,
          comment: dto.comment,
        },
      });

      return updated;
    });
  }

  /**
   * Resumes are never served by this API (ADR-0003). Two short-lived signed URLs
   * are minted after the role check: one that renders in the preview iframe and
   * one that saves to disk. They differ only in Content-Disposition, and a
   * single URL cannot do both.
   */
  async resumeUrls(applicationId: string, user: SessionUser) {
    const application = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id: applicationId },
      select: {
        applicationReference: true,
        candidate: { select: { name: true } },
        resume: { select: { storagePath: true, originalFileName: true, mimeType: true } },
      },
    });
    if (!application?.resume) throw new NotFoundException("No CV is attached to this application.");

    const { storagePath, mimeType, originalFileName } = application.resume;
    const safeName = application.candidate.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    const extension = /\.(pdf|docx|doc)$/i.exec(originalFileName)?.[1]?.toLowerCase() ?? "pdf";
    const previewable = isPreviewable(mimeType);

    // No inline URL is ever minted for a Word file: it could carry active
    // content, so it may only be downloaded, never rendered (ADR-0009).
    const [previewUrl, downloadUrl] = await Promise.all([
      previewable ? this.storage.createSignedUrl(storagePath) : Promise.resolve(null),
      this.storage.createSignedUrl(storagePath, `${safeName}-${application.applicationReference}.${extension}`),
    ]);
    return { previewUrl, downloadUrl, previewable, mimeType, expiresInSeconds: 60 };
  }
}

function label(status: ApplicationStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}
