import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '@common/user-model';
import { BackendAuthService } from '../service/backend-auth.service';
import { isModerator, isNumericId } from '@common/util/misc-utils';
import { getYoutubeVideoIdFromLink, isValidYoutubeId } from '@common/util/media-links-utils';
import { YoutubeLinkFixDbi } from '../db/youtube-link-fix-dbi.service';
import {
  ApproveYoutubeLinkFixRequest,
  GetYoutubeLinkFixQueueResponse,
  YoutubeLinkFixActionResponse,
  YoutubeLinkFixIdRequest,
} from '@common/api-model';

/** Queue page size (items per page). Kept small so a large queue never slows the page down. */
const PAGE_SIZE = 10;

/** Moderator-only review queue for replacing broken YouTube links (see scripts/find-youtube-replacements.ts). */
@Controller('/api/youtube-fix')
export class YoutubeLinkFixController {
  constructor(private readonly dbi: YoutubeLinkFixDbi) {}

  @Get('/queue')
  async getQueue(@Req() req: Request, @Query('page') pageParam?: string): Promise<GetYoutubeLinkFixQueueResponse> {
    assertModerator(req);
    const page = Math.max(0, Math.floor(Number(pageParam)) || 0);
    return await this.dbi.getQueue(PAGE_SIZE, page * PAGE_SIZE);
  }

  @Post('/approve')
  async approve(@Req() req: Request, @Body() request: ApproveYoutubeLinkFixRequest): Promise<YoutubeLinkFixActionResponse> {
    assertModerator(req);
    const id = assertFixId(request.id);
    // Accept either a bare video id or a pasted YouTube URL.
    const videoId = isValidYoutubeId(request.videoId) ? request.videoId : getYoutubeVideoIdFromLink(request.videoId);
    if (!videoId) {
      throw new HttpException(`Not a valid YouTube video id or URL: ${request.videoId}`, HttpStatus.BAD_REQUEST);
    }
    return await this.runAction(id, () => this.dbi.approve(id, videoId));
  }

  /** Removes the item from the queue until the next sweep (re-searched after the cool-down). */
  @Post('/skip')
  async skip(@Req() req: Request, @Body() request: YoutubeLinkFixIdRequest): Promise<YoutubeLinkFixActionResponse> {
    assertModerator(req);
    const id = assertFixId(request.id);
    return await this.runAction(id, () => this.dbi.skip(id));
  }

  private async runAction(id: number, action: () => Promise<YoutubeLinkFixActionResponse['status']>): Promise<YoutubeLinkFixActionResponse> {
    try {
      const status = await action();
      return { id, status };
    } catch (e) {
      throw new HttpException(e instanceof Error ? e.message : 'Action failed', HttpStatus.BAD_REQUEST);
    }
  }
}

function assertModerator(req: Request): void {
  const user: User = BackendAuthService.getUserOrFail(req);
  if (!isModerator(user)) {
    throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
  }
}

function assertFixId(id: number): number {
  if (!isNumericId(id)) {
    throw new HttpException(`Not a valid id: ${id}`, HttpStatus.BAD_REQUEST);
  }
  return id;
}
