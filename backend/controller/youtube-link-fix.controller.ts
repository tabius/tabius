import { Body, Controller, Get, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
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

/** Max queue items returned to the admin UI in one call. */
const QUEUE_LIMIT = 300;

/** Moderator-only review queue for replacing broken YouTube links (see scripts/find-youtube-replacements.ts). */
@Controller('/api/youtube-fix')
export class YoutubeLinkFixController {
  constructor(private readonly dbi: YoutubeLinkFixDbi) {}

  @Get('/queue')
  async getQueue(@Req() req: Request): Promise<GetYoutubeLinkFixQueueResponse> {
    assertModerator(req);
    return await this.dbi.getQueue(QUEUE_LIMIT);
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

  @Post('/reject')
  async reject(@Req() req: Request, @Body() request: YoutubeLinkFixIdRequest): Promise<YoutubeLinkFixActionResponse> {
    assertModerator(req);
    const id = assertFixId(request.id);
    return await this.runAction(id, () => this.dbi.reject(id));
  }

  @Post('/dismiss')
  async dismiss(@Req() req: Request, @Body() request: YoutubeLinkFixIdRequest): Promise<YoutubeLinkFixActionResponse> {
    assertModerator(req);
    const id = assertFixId(request.id);
    return await this.runAction(id, () => this.dbi.dismiss(id));
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
