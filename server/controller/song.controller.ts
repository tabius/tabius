import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Post, Put, Session, UseGuards} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {NewSongDetailsValidator, NewSongValidator, SongDetailsValidator, SongValidator, stringToArrayOfNumericIds, stringToId} from '@server/util/validators';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {User, UserGroup} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {ServerSsoService} from '@server/service/server-sso.service';
import {DeleteSongResponse, UpdateSongRequest, UpdateSongResponse} from '@common/ajax-model';
import {canEditArtist, isValidId} from '@common/util/misc-utils';

@Controller('/api/song')
export class SongController {

  private readonly logger = new Logger(SongController.name);

  constructor(private readonly songDbi: SongDbi) {
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Get('/by-ids/:ids')
  getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongs(ids);
  }

  /** Returns list of artist songs. */
  @Get('/by-artist/:artistId')
  async getSongsByArtist(@Param('artistId') artistIdParam: string): Promise<Song[]> {
    this.logger.log(`by-artist: ${artistIdParam}`);
    const artistId = stringToId(artistIdParam);
    return await this.songDbi.getSongsByArtistId(artistId);
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
  async create(@Session() session, @Body() updateRequest: UpdateSongRequest): Promise<UpdateSongResponse> {
    this.logger.log('/create-song' + JSON.stringify(updateRequest));
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
    const songId = await this.songDbi.create(updateRequest.song, updateRequest.details);
    if (!isValidId(songId)) {
      throw `Failed to create song: ${songId}`;
    }
    return await this.getSongUpdateResponse(songId, updateRequest.song.artistId);
  }

  /** Updates song and returns updated song & details. */
  @Put()
  @UseGuards(ServerAuthGuard)
  async update(@Session() session, @Body() updateRequest: UpdateSongRequest): Promise<UpdateSongResponse> {
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
    await this.songDbi.update(updateRequest.song.title, updateRequest.details);
    return this.getSongUpdateResponse(updateRequest.song.id, updateRequest.song.artistId);
  }

  private async getSongUpdateResponse(songId: number, artistId: number): Promise<UpdateSongResponse> {
    const [songFromDb, detailsFromDb, songs] = await Promise.all([
      this.songDbi.getSongs([songId]),
      this.songDbi.getSongsDetails([songId]),
      this.songDbi.getSongsByArtistId(artistId),
    ]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw `Failed to build response ${songId}/${artistId}`;
    }
    return {song: songFromDb[0], details: detailsFromDb[0], songs};
  }


  /** Deletes the song and returns updated artist details. */
  //TODO: update playlists!
  @Delete(':songId')
  @UseGuards(ServerAuthGuard)
  async delete(@Session() session, @Param('songId') idParam: string): Promise<DeleteSongResponse> {
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
    await this.songDbi.delete(songId);
    const songs = await this.songDbi.getSongsByArtistId(artistId);
    return {
      artistId,
      songs,
    };
  }
}
