import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { JobsService } from "./jobs.service.js";
import { PublicLinksService } from "./public-links.service.js";
import {
  ChangeJobStatusDto, CreateJobOpeningDto, ListJobsQueryDto, ShareMessageDto, UpdateJobOpeningDto,
} from "./dto.js";
import { CurrentUser, Roles, type SessionUser } from "../auth/index.js";

@Controller("jobs")
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly links: PublicLinksService,
  ) {}

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateJobOpeningDto, @CurrentUser() user: SessionUser) {
    return this.jobs.create(dto, user.id);
  }

  @Get()
  list(@Query() query: ListJobsQueryDto) {
    return this.jobs.list(query);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const job = await this.jobs.findOne(id);
    return { ...job, share: this.links.buildShareKit(job) };
  }

  @Put(":id")
  @Roles("ADMIN")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateJobOpeningDto) {
    return this.jobs.update(id, dto);
  }

  @Put(":id/share-message")
  @Roles("ADMIN")
  setShareMessage(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ShareMessageDto) {
    return this.jobs.setShareMessage(id, dto.source, dto.message);
  }

  @Put(":id/status")
  @Roles("ADMIN")
  changeStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ChangeJobStatusDto) {
    return this.jobs.changeStatus(id, dto.status);
  }
}
