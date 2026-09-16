import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { APPLICATION_SOURCES } from "@finclust/domain";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateJobOpeningDto, ListJobsQueryDto, UpdateJobOpeningDto } from "./dto.js";

const DEFAULT_PAGE_SIZE = 25;

// Counts leave out applications whose candidate is in Trash.
const LIVE_APPLICATION = { deletedAt: null, candidate: { deletedAt: null } } satisfies Prisma.ApplicationWhereInput;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobOpeningDto, createdById: string) {
    this.assertExperienceRange(dto);
    try {
      return await this.prisma.client.jobOpening.create({
        data: {
          jobId: dto.jobId.trim().toUpperCase(),
          title: dto.title.trim(),
          profileId: dto.profileId,
          description: dto.description,
          requiredSkills: dto.requiredSkills ?? [],
          client: dto.client,
          location: dto.location,
          workMode: dto.workMode,
          employmentType: dto.employmentType,
          minExperience: dto.minExperience,
          maxExperience: dto.maxExperience,
          openings: dto.openings ?? 1,
          closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
          candidateNoteEnabled: dto.candidateNoteEnabled ?? true,
          createdById,
        },
        include: { profile: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictException(`Job ID ${dto.jobId} is already in use.`);
        }
        if (error.code === "P2003") {
          throw new BadRequestException("That job profile does not exist.");
        }
      }
      throw error;
    }
  }

  async list(query: ListJobsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const search = query.search?.trim();

    const where: Prisma.JobOpeningWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { jobId: { contains: search, mode: "insensitive" } },
              { client: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // ponytail: offset pagination. Degrades past ~10k rows; recruiters need
    // numbered pages, which keyset cannot give. Revisit if job count explodes.
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.jobOpening.findMany({
        where,
        include: { profile: true, _count: { select: { applications: { where: LIVE_APPLICATION } } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.jobOpening.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const job = await this.prisma.client.jobOpening.findFirst({
      where: { id, deletedAt: null },
      include: {
        profile: true,
        applicationLinks: { orderBy: { source: "asc" } },
        _count: { select: { applications: { where: LIVE_APPLICATION } } },
      },
    });
    if (!job) throw new NotFoundException("That job opening does not exist.");
    return job;
  }

  async update(id: string, dto: UpdateJobOpeningDto) {
    this.assertExperienceRange(dto);
    await this.findOne(id);
    return this.prisma.client.jobOpening.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        profileId: dto.profileId,
        description: dto.description,
        requiredSkills: dto.requiredSkills,
        client: dto.client,
        location: dto.location,
        workMode: dto.workMode,
        employmentType: dto.employmentType,
        minExperience: dto.minExperience,
        maxExperience: dto.maxExperience,
        openings: dto.openings,
        closesAt: dto.closesAt === undefined ? undefined : dto.closesAt ? new Date(dto.closesAt) : null,
        candidateNoteEnabled: dto.candidateNoteEnabled,
        shareMessage: dto.shareMessage === undefined ? undefined : dto.shareMessage?.trim() || null,
      },
      include: { profile: true },
    });
  }

  /**
   * Activating a job creates its Application Links, one per Source, in the same
   * transaction. Idempotent: re-activating a job that already has links reuses
   * them, so a recruiter cannot invalidate a link they have already shared.
   */
  async changeStatus(id: string, status: CreateStatus) {
    const job = await this.findOne(id);

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.jobOpening.update({
        where: { id },
        data: {
          status,
          openedAt: status === "ACTIVE" && !job.openedAt ? new Date() : undefined,
          closedAt: status === "CLOSED" ? new Date() : null,
        },
      });

      if (status === "ACTIVE") {
        await tx.applicationLink.createMany({
          data: APPLICATION_SOURCES.map((source) => ({ jobOpeningId: id, source })),
          skipDuplicates: true,
        });
      }

      return tx.jobOpening.findUniqueOrThrow({
        where: { id: updated.id },
        include: { profile: true, applicationLinks: { orderBy: { source: "asc" } } },
      });
    });
  }

  private assertExperienceRange(dto: { minExperience?: number; maxExperience?: number }) {
    const { minExperience: min, maxExperience: max } = dto;
    if (min !== undefined && max !== undefined && min > max) {
      throw new BadRequestException("Minimum experience cannot exceed maximum experience.");
    }
  }
}

type CreateStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";
