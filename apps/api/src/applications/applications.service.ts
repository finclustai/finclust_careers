import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { canChangeNote, canTransition, dailyCounts, isPreviewable, type ApplicationStatus } from "@finclust/domain";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import type { SessionUser } from "../auth/index.js";
import type { AssignDto, ChangeStatusDto, ListApplicationsQueryDto, NoteDto } from "./dto.js";

const CARD_FIELDS = {
  id: true,
  applicationReference: true,
  status: true,
  source: true,
  appliedAt: true,
  candidate: {
    select: {
      id: true, name: true, phone: true, location: true, totalExperience: true,
      _count: { select: { notes: true } },
    },
  },
  assignedRecruiter: { select: { id: true, name: true } },
  jobOpening: { select: { id: true, jobId: true, title: true } },
  resume: { select: { id: true, originalFileName: true, fileSize: true } },
} satisfies Prisma.ApplicationSelect;

const NOTE_FIELDS = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  author: { select: { id: true, name: true } },
  editedBy: { select: { name: true } },
} satisfies Prisma.CandidateNoteSelect;

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
  scope(user: SessionUser): Prisma.ApplicationWhereInput {
    // Anything in Trash -- the job or the candidate -- is hidden everywhere.
    const base: Prisma.ApplicationWhereInput = {
      deletedAt: null,
      candidate: { deletedAt: null },
      jobOpening: { deletedAt: null },
    };
    if (user.role === "ADMIN") return base;
    return { ...base, assignedRecruiterId: user.id };
  }

  /**
   * Board data, grouped client-side into stage columns. With a job id it is that
   * job's board; without, it is the combined board across every job (ADR-0010).
   */
  async board(jobOpeningId: string | undefined, user: SessionUser) {
    const job = jobOpeningId
      ? await this.prisma.client.jobOpening.findFirst({
          where: { id: jobOpeningId, deletedAt: null },
          select: { id: true, jobId: true, title: true, client: true, status: true },
        })
      : null;
    if (jobOpeningId && !job) throw new NotFoundException("That job opening does not exist.");

    const where = { ...this.scope(user), ...(jobOpeningId ? { jobOpeningId } : {}) };

    const [cards, counts] = await Promise.all([
      this.prisma.client.application.findMany({
        where,
        select: CARD_FIELDS,
        orderBy: { appliedAt: "desc" },
        // ponytail: newest 450 cards only. Enough for a board a person can
        // scan; the filtered list page is the tool past that.
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
      ...(query.profileId ? { jobOpening: { deletedAt: null, profileId: query.profileId } } : {}),
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
    const scope = this.scope(user);
    const application = await this.prisma.client.application.findFirst({
      where: { ...scope, id },
      include: {
        candidate: {
          include: {
            notes: { orderBy: { createdAt: "desc" }, select: NOTE_FIELDS },
          },
        },
        jobOpening: { select: { id: true, jobId: true, title: true, client: true } },
        assignedRecruiter: { select: { id: true, name: true } },
        resume: { select: { id: true, originalFileName: true, fileSize: true, mimeType: true, uploadedAt: true } },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { name: true } } },
        },
        cvShareItems: {
          orderBy: { share: { createdAt: "desc" } },
          select: {
            share: {
              select: { id: true, createdAt: true, toAddresses: true, ccAddresses: true, createdBy: { select: { name: true } } },
            },
          },
        },
      },
    });
    // Deliberately a 404 and not a 403: telling a recruiter that an application
    // exists but is not theirs leaks the pipeline of every other recruiter.
    if (!application) throw new NotFoundException("That application does not exist.");

    // Prev/Next walk the same job, newest first, like its board.
    const sameJob = { ...scope, jobOpeningId: application.jobOpeningId };
    const [newer, older, otherApplications] = await Promise.all([
      this.prisma.client.application.findFirst({
        where: { ...sameJob, appliedAt: { gt: application.appliedAt } },
        orderBy: { appliedAt: "asc" },
        select: { id: true },
      }),
      this.prisma.client.application.findFirst({
        where: { ...sameJob, appliedAt: { lt: application.appliedAt } },
        orderBy: { appliedAt: "desc" },
        select: { id: true },
      }),
      this.prisma.client.application.findMany({
        where: { ...scope, candidateId: application.candidateId, id: { not: id } },
        orderBy: { appliedAt: "desc" },
        select: {
          id: true, status: true, appliedAt: true,
          jobOpening: { select: { jobId: true, title: true } },
        },
      }),
    ]);

    return { ...application, previousId: newer?.id ?? null, nextId: older?.id ?? null, otherApplications };
  }

  /** Notes belong to the candidate, so they follow them to every vacancy. */
  async addNote(applicationId: string, dto: NoteDto, user: SessionUser) {
    const application = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id: applicationId },
      select: { candidateId: true },
    });
    if (!application) throw new NotFoundException("That application does not exist.");
    return this.prisma.client.candidateNote.create({
      data: { candidateId: application.candidateId, authorId: user.id, body: dto.body.trim() },
      select: NOTE_FIELDS,
    });
  }

  async editNote(applicationId: string, noteId: string, dto: NoteDto, user: SessionUser) {
    await this.visibleNote(applicationId, noteId, user, "edit");
    return this.prisma.client.candidateNote.update({
      where: { id: noteId },
      data: { body: dto.body.trim(), editedAt: new Date(), editedById: user.id },
      select: NOTE_FIELDS,
    });
  }

  async deleteNote(applicationId: string, noteId: string, user: SessionUser) {
    await this.visibleNote(applicationId, noteId, user, "delete");
    await this.prisma.client.candidateNote.delete({ where: { id: noteId } });
  }

  /** The note, if this user can see its candidate and may do this to it. */
  private async visibleNote(applicationId: string, noteId: string, user: SessionUser, action: "edit" | "delete") {
    const application = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id: applicationId },
      select: { candidateId: true },
    });
    const note = application
      ? await this.prisma.client.candidateNote.findFirst({
          where: { id: noteId, candidateId: application.candidateId },
          select: { authorId: true },
        })
      : null;
    if (!note) throw new NotFoundException("That note does not exist.");
    if (!canChangeNote(user, note, action)) {
      throw new ForbiddenException("Only the person who wrote this note or an admin can delete it.");
    }
  }

  async assign(applicationId: string, dto: AssignDto, user: SessionUser) {
    const application = await this.prisma.client.application.findFirst({
      where: { ...this.scope(user), id: applicationId },
      select: { id: true },
    });
    if (!application) throw new NotFoundException("That application does not exist.");

    if (dto.recruiterId) {
      const recruiter = await this.prisma.client.user.findFirst({
        where: { id: dto.recruiterId, isActive: true },
        select: { id: true },
      });
      if (!recruiter) throw new BadRequestException("That person cannot be assigned.");
    }
    return this.prisma.client.application.update({
      where: { id: applicationId },
      data: { assignedRecruiterId: dto.recruiterId ?? null },
      select: CARD_FIELDS,
    });
  }

  /**
   * Everything the dashboard shows, scoped like every other read: a recruiter's
   * numbers cover only what is assigned to them.
   */
  async dashboard(user: SessionUser) {
    const scope = this.scope(user);
    const since = new Date(Date.now() - 14 * 86_400_000);

    const [me, total, byStatus, bySource, byJob, recentDates, recent, activeJobs] = await Promise.all([
      this.prisma.client.user.findUnique({ where: { id: user.id }, select: { lastSeenApplicationsAt: true } }),
      this.prisma.client.application.count({ where: scope }),
      this.prisma.client.application.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      this.prisma.client.application.groupBy({ by: ["source"], where: scope, _count: { _all: true } }),
      this.prisma.client.application.groupBy({ by: ["jobOpeningId", "status"], where: scope, _count: { _all: true } }),
      // ponytail: bucketed in JS. Fine for thousands of applications a
      // fortnight; move to a date_trunc GROUP BY if it ever is not.
      this.prisma.client.application.findMany({
        where: { ...scope, appliedAt: { gte: since } },
        select: { appliedAt: true },
      }),
      this.prisma.client.application.findMany({
        where: scope,
        select: CARD_FIELDS,
        orderBy: { appliedAt: "desc" },
        take: 8,
      }),
      this.prisma.client.jobOpening.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: {
          id: true, jobId: true, title: true, openedAt: true, closesAt: true,
          applicationLinks: { select: { clickCount: true } },
        },
        orderBy: { openedAt: "desc" },
      }),
    ]);

    const lastSeenAt = me?.lastSeenApplicationsAt ?? null;
    const newSinceLastVisit = await this.prisma.client.application.count({
      where: { ...scope, ...(lastSeenAt ? { appliedAt: { gt: lastSeenAt } } : {}) },
    });

    const daily = dailyCounts(recentDates.map((r) => r.appliedAt), 14);
    const funnel = Object.fromEntries(byStatus.map((g) => [g.status, g._count._all]));

    return {
      totals: {
        applications: total,
        today: daily[daily.length - 1].count,
        last7Days: daily.slice(-7).reduce((sum, d) => sum + d.count, 0),
        awaitingReview: funnel.NEW ?? 0,
        newSinceLastVisit,
        activeJobs: activeJobs.length,
      },
      lastSeenAt,
      daily,
      funnel,
      sources: Object.fromEntries(bySource.map((g) => [g.source, g._count._all])),
      jobs: activeJobs.map((job) => {
        const rows = byJob.filter((g) => g.jobOpeningId === job.id);
        return {
          id: job.id,
          jobId: job.jobId,
          title: job.title,
          openedAt: job.openedAt,
          closesAt: job.closesAt,
          clicks: job.applicationLinks.reduce((sum, l) => sum + l.clickCount, 0),
          applications: rows.reduce((sum, g) => sum + g._count._all, 0),
          awaitingReview: rows.find((g) => g.status === "NEW")?._count._all ?? 0,
        };
      }),
      recent,
    };
  }

  async markSeen(user: SessionUser) {
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastSeenApplicationsAt: new Date() },
    });
    return { ok: true };
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
   * Resumes are never served by this API (ADR-0003). Short-lived signed URLs
   * are minted after the role check: one to view, one that saves to disk. They
   * differ only in Content-Disposition, and a single URL cannot do both.
   *
   * PDFs render in the browser's own viewer. Word files render in Microsoft's
   * Office viewer, which fetches the file from the signed URL once; they are
   * never rendered on our own origin (ADR-0009).
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
    const viewer = isPreviewable(mimeType) ? "pdf" : "office";

    const [previewUrl, downloadUrl] = await Promise.all([
      this.storage.createSignedUrl(storagePath),
      this.storage.createSignedUrl(storagePath, `${safeName}-${application.applicationReference}.${extension}`),
    ]);
    return { previewUrl, downloadUrl, viewer, mimeType, expiresInSeconds: 60 };
  }
}

function label(status: ApplicationStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}
