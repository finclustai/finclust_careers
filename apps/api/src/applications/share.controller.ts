import {
  BadRequestException, Body, Controller, Get, NotFoundException, Post, Put,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import {
  DEFAULT_SHARE_TEMPLATE, buildShareEmail, parseEmailList, stageAfterSharing, type ShareTemplate,
} from "@finclust/domain";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { ApplicationsService } from "./applications.service.js";
import { ZohoMail } from "./zoho-mail.js";
import { CurrentUser, Roles, type SessionUser } from "../auth/index.js";

// ponytail: Zoho does not publish the free plan's attachment limit; paid plans
// allow 30 MB. Kept under that. Raise once a bigger send is proven to work.
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const TEMPLATE_KEY = "share_template";

class CreateShareDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20, { message: "Share at most 20 CVs in one email." })
  @IsUUID("all", { each: true })
  applicationIds!: string[];

  @IsString() @MaxLength(2000) to!: string;
  @IsOptional() @IsString() @MaxLength(2000) cc?: string;
}

class TemplateDto {
  @IsString() @MinLength(3) @MaxLength(300) subject!: string;
  @IsString() @MinLength(3) @MaxLength(5000) body!: string;
}

/**
 * Share CVs with people outside the app (ADR-0012). The result is a draft in
 * the company Zoho mailbox with the CVs attached; a person reviews and sends it.
 */
@Controller()
export class ShareController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly applications: ApplicationsService,
    private readonly zoho: ZohoMail,
  ) {}

  @Get("shares/setup")
  async setup() {
    return {
      enabled: this.zoho.configured,
      mailbox: this.zoho.configured ? await this.zoho.mailbox.catch(() => null) : null,
      recipients: await this.recentRecipients(),
      template: await this.template(),
    };
  }

  @Post("shares")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() dto: CreateShareDto, @CurrentUser() user: SessionUser) {
    const to = parseEmailList(dto.to);
    const cc = parseEmailList(dto.cc ?? "");
    const invalid = [...to.invalid, ...cc.invalid];
    if (invalid.length) throw new BadRequestException(`Not an email address: ${invalid.join(", ")}`);
    if (to.valid.length === 0) throw new BadRequestException("Add at least one recipient.");

    const ids = [...new Set(dto.applicationIds)];
    const applications = await this.prisma.client.application.findMany({
      where: { ...this.applications.scope(user), id: { in: ids } },
      select: {
        id: true,
        status: true,
        applicationReference: true,
        jobOpeningId: true,
        jobOpening: { select: { jobId: true, title: true } },
        candidate: { select: { name: true, totalExperience: true, location: true, noticePeriod: true, expectedSalary: true } },
        resume: { select: { storagePath: true, originalFileName: true, fileSize: true } },
      },
      orderBy: { appliedAt: "asc" },
    });
    if (applications.length !== ids.length) throw new NotFoundException("Some of those applications no longer exist.");
    if (new Set(applications.map((a) => a.jobOpeningId)).size > 1) {
      throw new BadRequestException("Share CVs for one job at a time.");
    }
    const withoutCv = applications.filter((a) => !a.resume).map((a) => a.candidate.name);
    if (withoutCv.length) throw new BadRequestException(`No CV on file for ${withoutCv.join(", ")}.`);
    const totalBytes = applications.reduce((sum, a) => sum + a.resume!.fileSize, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new BadRequestException("Those CVs are too large for one email. Share fewer at a time.");
    }

    const job = applications[0].jobOpening;
    const email = buildShareEmail(
      await this.template(),
      job,
      applications.map((a) => ({ ...a.candidate, totalExperience: a.candidate.totalExperience?.toString() ?? null })),
      user.name,
    );

    // A few at a time: fast, without opening a burst of connections to Zoho.
    const attachments = [];
    for (let i = 0; i < applications.length; i += 3) {
      attachments.push(
        ...(await Promise.all(
          applications.slice(i, i + 3).map(async (a) => {
            const extension = /\.(pdf|docx|doc)$/i.exec(a.resume!.originalFileName)?.[1]?.toLowerCase() ?? "pdf";
            const name = `${a.candidate.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-${a.applicationReference}.${extension}`;
            return this.zoho.uploadAttachment(await this.storage.download(a.resume!.storagePath), name);
          }),
        )),
      );
    }
    const draft = await this.zoho.createDraft({ to: to.valid, cc: cc.valid, subject: email.subject, html: email.html, attachments });

    // Recorded once the draft exists. Whether it is then sent happens in Zoho.
    const comment = `CV shared with ${to.valid.join(", ")}`;
    const moved = await this.prisma.client.$transaction(async (tx) => {
      await tx.cvShare.create({
        data: {
          jobOpeningId: applications[0].jobOpeningId,
          toAddresses: to.valid,
          ccAddresses: cc.valid,
          subject: email.subject,
          zohoMessageId: draft.messageId,
          createdById: user.id,
          items: { create: applications.map((a) => ({ applicationId: a.id })) },
        },
      });
      let count = 0;
      for (const a of applications) {
        const next = stageAfterSharing(a.status);
        if (!next) continue;
        await tx.application.update({ where: { id: a.id }, data: { status: next } });
        await tx.applicationStatusHistory.create({
          data: { applicationId: a.id, previousStatus: a.status, newStatus: next, changedById: user.id, comment },
        });
        count++;
      }
      return count;
    });

    return { draftsUrl: this.zoho.draftsUrl, shared: applications.length, moved };
  }

  @Put("shares/template")
  @Roles("ADMIN")
  async saveTemplate(@Body() dto: TemplateDto) {
    const value = { subject: dto.subject.trim(), body: dto.body.trim() };
    await this.prisma.client.setting.upsert({
      where: { key: TEMPLATE_KEY },
      create: { key: TEMPLATE_KEY, value },
      update: { value },
    });
    return value;
  }

  private async template(): Promise<ShareTemplate> {
    const row = await this.prisma.client.setting.findUnique({ where: { key: TEMPLATE_KEY } });
    return (row?.value as unknown as ShareTemplate) ?? DEFAULT_SHARE_TEMPLATE;
  }

  /** Addresses used before, most recent first, for suggestions. */
  private async recentRecipients() {
    const shares = await this.prisma.client.cvShare.findMany({
      select: { toAddresses: true, ccAddresses: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return [...new Set(shares.flatMap((s) => [...s.toAddresses, ...s.ccAddresses]))].slice(0, 30);
  }
}
