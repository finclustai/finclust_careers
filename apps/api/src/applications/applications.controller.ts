import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from "@nestjs/common";
import { ApplicationsService } from "./applications.service.js";
import { ChangeStatusDto, ListApplicationsQueryDto } from "./dto.js";
import { CurrentUser, type SessionUser } from "../auth/index.js";

@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@Query() query: ListApplicationsQueryDto, @CurrentUser() user: SessionUser) {
    return this.applications.list(query, user);
  }

  @Get("board/:jobOpeningId")
  board(
    @Param("jobOpeningId", ParseUUIDPipe) jobOpeningId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.board(jobOpeningId, user);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.applications.findOne(id, user);
  }

  @Put(":id/status")
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.changeStatus(id, dto, user);
  }

  @Get(":id/resume-url")
  resumeUrl(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.applications.resumeUrls(id, user);
  }
}
