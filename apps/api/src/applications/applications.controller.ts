import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApplicationsService } from "./applications.service.js";
import { AssignDto, ChangeStatusDto, ListApplicationsQueryDto, NoteDto } from "./dto.js";
import { CurrentUser, Roles, type SessionUser } from "../auth/index.js";

@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: SessionUser) {
    return this.applications.dashboard(user);
  }

  @Post("dashboard/seen")
  @HttpCode(200)
  markSeen(@CurrentUser() user: SessionUser) {
    return this.applications.markSeen(user);
  }

  @Get("applications")
  list(@Query() query: ListApplicationsQueryDto, @CurrentUser() user: SessionUser) {
    return this.applications.list(query, user);
  }

  // Declared before applications/:id, which would otherwise claim "board".
  @Get("applications/board")
  combinedBoard(@CurrentUser() user: SessionUser) {
    return this.applications.board(undefined, user);
  }

  @Get("applications/board/:jobOpeningId")
  board(
    @Param("jobOpeningId", ParseUUIDPipe) jobOpeningId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.board(jobOpeningId, user);
  }

  @Get("applications/:id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.applications.findOne(id, user);
  }

  @Put("applications/:id/status")
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.changeStatus(id, dto, user);
  }

  @Put("applications/:id/assignee")
  @Roles("ADMIN")
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.assign(id, dto, user);
  }

  @Post("applications/:id/notes")
  addNote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: NoteDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.applications.addNote(id, dto, user);
  }

  @Get("applications/:id/resume-url")
  resumeUrl(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.applications.resumeUrls(id, user);
  }
}
