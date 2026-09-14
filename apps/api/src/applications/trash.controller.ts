import { Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { Roles } from "../auth/index.js";

/**
 * Deleting is two steps (ADR-0011). Delete moves a job or candidate to Trash,
 * where everything about it is hidden but kept and can be restored. Only from
 * Trash can it be erased, and erasing removes the stored CVs too.
 */
@Controller()
@Roles("ADMIN")
export class TrashController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get("trash")
  async list() {
    const [jobs, candidates] = await Promise.all([
      this.prisma.client.jobOpening.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, jobId: true, title: true, deletedAt: true, _count: { select: { applications: true } } },
        orderBy: { deletedAt: "desc" },
      }),
      this.prisma.client.candidate.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true, name: true, phone: true, deletedAt: true,
          applications: { select: { jobOpening: { select: { jobId: true } } } },
        },
        orderBy: { deletedAt: "desc" },
      }),
    ]);
    return { jobs, candidates };
  }

  @Delete("jobs/:id")
  @HttpCode(204)
  async trashJob(@Param("id", ParseUUIDPipe) id: string) {
    const job = await this.prisma.client.jobOpening.findFirst({
      where: { id, deletedAt: null },
      select: { status: true },
    });
    if (!job) throw new NotFoundException("That job opening does not exist.");
    await this.prisma.client.jobOpening.update({
      where: { id },
      // Paused as well, so restoring it later never silently starts taking
      // applications again.
      data: { deletedAt: new Date(), status: job.status === "ACTIVE" ? "ON_HOLD" : undefined },
    });
  }

  @Post("jobs/:id/restore")
  @HttpCode(204)
  async restoreJob(@Param("id", ParseUUIDPipe) id: string) {
    const { count } = await this.prisma.client.jobOpening.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (!count) throw new NotFoundException("That job is not in Trash.");
  }

  @Delete("jobs/:id/permanent")
  @HttpCode(204)
  async eraseJob(@Param("id", ParseUUIDPipe) id: string) {
    const job = await this.prisma.client.jobOpening.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { applications: { select: { candidateId: true, resume: { select: { storagePath: true } } } } },
    });
    if (!job) throw new NotFoundException("Only a job in Trash can be deleted permanently.");

    const candidateIds = [...new Set(job.applications.map((a) => a.candidateId))];
    await this.prisma.client.$transaction([
      this.prisma.client.resume.deleteMany({ where: { application: { jobOpeningId: id } } }),
      // Status history cascades with the application, links with the job.
      this.prisma.client.application.deleteMany({ where: { jobOpeningId: id } }),
      this.prisma.client.jobOpening.delete({ where: { id } }),
      // A person who applied only to this job has nothing left; notes cascade.
      this.prisma.client.candidate.deleteMany({ where: { id: { in: candidateIds }, applications: { none: {} } } }),
    ]);
    await this.removeFiles(job.applications.map((a) => a.resume?.storagePath));
  }

  @Delete("candidates/:id")
  @HttpCode(204)
  async trashCandidate(@Param("id", ParseUUIDPipe) id: string) {
    const { count } = await this.prisma.client.candidate.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!count) throw new NotFoundException("That candidate does not exist.");
  }

  @Post("candidates/:id/restore")
  @HttpCode(204)
  async restoreCandidate(@Param("id", ParseUUIDPipe) id: string) {
    const { count } = await this.prisma.client.candidate.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (!count) throw new NotFoundException("That candidate is not in Trash.");
  }

  @Delete("candidates/:id/permanent")
  @HttpCode(204)
  async eraseCandidate(@Param("id", ParseUUIDPipe) id: string) {
    const candidate = await this.prisma.client.candidate.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { resumes: { select: { storagePath: true } } },
    });
    if (!candidate) throw new NotFoundException("Only a candidate in Trash can be deleted permanently.");

    await this.prisma.client.$transaction([
      this.prisma.client.resume.deleteMany({ where: { candidateId: id } }),
      this.prisma.client.application.deleteMany({ where: { candidateId: id } }),
      this.prisma.client.candidate.delete({ where: { id } }),
    ]);
    await this.removeFiles(candidate.resumes.map((r) => r.storagePath));
  }

  // After the database commit: a stray file in a private bucket is harmless,
  // a record pointing at a file that is gone is not.
  private async removeFiles(paths: (string | undefined)[]) {
    const present = paths.filter((p): p is string => Boolean(p));
    if (present.length) await this.storage.removeMany(present);
  }
}
