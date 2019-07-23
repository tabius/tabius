import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Post, Put, Session, UseGuards} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {NewSongDetailsValidator, NewSongValidator, SongDetailsValidator, SongValidator, stringToArrayOfNumericIds} from '@server/util/validators';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {User, UserGroup} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {ServerSsoService} from '@server/service/server-sso.service';
import {ArtistDetailsResponse, SongUpdateRequest, SongUpdateResponse} from '@common/ajax-model';
import {CrossEntityDbi} from '@server/db/cross-entity-dbi.service';
import {canEditArtist} from '@common/util/misc-utils';

@Controller('/api/song')
export class SongController {

  private readonly logger = new Logger(SongController.name);

  constructor(private readonly songDbi: SongDbi, private readonly crossDbi: CrossEntityDbi) {
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Get('/by-ids/:ids')
  getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongs(ids);
  }

  /** Returns found song details by ids. The order of results is not specified. */
  @Get('/details-by-ids/:ids')
  getSongDetails(@Param('ids') idsParam: string): Promise<SongDetails[]> {
    this.logger.log(`details-by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongsDetails(ids);
  }

  /** Creates song and returns updated song & details. */
  @Post()
  @UseGuards(ServerAuthGuard)
  async create(@Session() session, @Body() updateRequest: SongUpdateRequest): Promise<SongUpdateResponse> {
    this.logger.log('/create-song'+ JSON.stringify(updateRequest));
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!canEditArtist(user, updateRequest.song.artistId)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(updateRequest.song, conformsTo(NewSongValidator));
    if (!vr1.success) {
      throw vr1.toString();
    }
    const vr2 = validate(updateRequest.details, conformsTo(NewSongDetailsValidator));
    if (!vr2.success) {
      throw vr2.toString();
    }
    return await this.songDbi.create(updateRequest.song, updateRequest.details);
  }

  /** Updates song and returns updated song & details. */
  @Put()
  @UseGuards(ServerAuthGuard)
  async update(@Session() session, @Body() updateRequest: SongUpdateRequest): Promise<SongUpdateResponse> {
    this.logger.log('/update-song');
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!canEditArtist(user, updateRequest.song.artistId)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(updateRequest.song, conformsTo(SongValidator));
    if (!vr1.success) {
      throw vr1.toString();
    }
    const vr2 = validate(updateRequest.details, conformsTo(SongDetailsValidator));
    if (!vr2.success) {
      throw vr2.toString();
    }
    return await this.songDbi.update(updateRequest.song.title, updateRequest.details);
  }

  /** Deletes the song and returns updated artist details. */
  @Delete(':songId')
  @UseGuards(ServerAuthGuard)
  async delete(@Session() session, @Param('songId') idParam: string): Promise<ArtistDetailsResponse|undefined> {
    this.logger.log(`/delete song ${idParam}`);
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songId = +idParam;
    const songsArray = await this.songDbi.getSongs([songId]);
    if (songsArray.length === 0) {
      throw new HttpException(`Song is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    const artistId = songsArray[0].artistId;
    await this.crossDbi.deleteSongAndUpdateArtistVersion(songId, artistId);
    return this.crossDbi.getArtistDetailsResponse(artistId);
  }
}
