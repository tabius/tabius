import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Post, Put, Session} from '@nestjs/common';
import {Song, SongDetails} from '@common/catalog-model';
import {NewSongDetailsValidator, NewSongValidator, paramToArrayOfNumericIds, paramToId, SongDetailsValidator, SongValidator} from '@server/util/validators';
import {User, UserGroup} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {ServerSsoService} from '@server/service/server-sso.service';
import {DeleteSongResponse, FullTextSongSearchRequest, FullTextSongSearchResponse, UpdateSongRequest, UpdateSongResponse} from '@common/ajax-model';
import {canEditCollection, isValidId} from '@common/util/misc-utils';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';
import {NodeBBService} from '@server/db/node-bb.service';

@Controller('/api/song')
export class SongController {

  private readonly logger = new Logger(SongController.name);

  constructor(private readonly songDbi: SongDbi,
              private readonly fullTextSearchDbi: FullTextSearchDbi,
              private readonly nodeBBService: NodeBBService,
  ) {
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Get('/by-ids/:ids')
  getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = paramToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongs(ids);
  }

  /** Returns list of songs in the collection. */
  @Get('/by-collection/:collectionId')
  async getSongsByCollection(@Param('collectionId') collectionIdParam: string): Promise<Song[]> {
    this.logger.log(`by-collection: ${collectionIdParam}`);
    const collectionId = paramToId(collectionIdParam);
    const [primarySongs, secondarySongs] = await Promise.all([
        this.songDbi.getSongsByCollectionId(collectionId),
        this.songDbi.getSongsBySecondaryCollectionId(collectionId),
    ]);
    return [...primarySongs, ...secondarySongs];
  }

  /** Returns found song details by ids. The order of results is not specified. */
  @Get('/details-by-ids/:ids')
  getSongDetails(@Param('ids') idsParam: string): Promise<SongDetails[]> {
    this.logger.log(`details-by-ids: ${idsParam}`);
    const ids = paramToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongsDetails(ids);
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Post('/by-text')
  async searchSongsByText(@Body() searchRequest: FullTextSongSearchRequest): Promise<FullTextSongSearchResponse> {
    this.logger.log(`by-text:` + searchRequest.text);
    const results = await this.fullTextSearchDbi.searchForSongsByText(searchRequest.text);
    return {
      results
    };
  }

  /** Creates song and returns updated song & details. */
  @Post()
  async create(@Session() session, @Body() updateRequest: UpdateSongRequest): Promise<UpdateSongResponse> {
    this.logger.log('/create-song' + JSON.stringify(updateRequest));
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!canEditCollection(user, updateRequest.song.collectionId)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(updateRequest.song, conformsTo(NewSongValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }
    const vr2 = validate(updateRequest.details, conformsTo(NewSongDetailsValidator));
    if (!vr2.success) {
      throw new HttpException(vr2.toString(), HttpStatus.BAD_REQUEST);
    }
    const songId = await this.songDbi.create(updateRequest.song, updateRequest.details);
    if (!isValidId(songId)) {
      throw new HttpException(`Failed to create song: ${songId}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return await this.getSongUpdateResponse(songId, updateRequest.song.collectionId);
  }

  /** Updates song and returns updated song & details. */
  @Put()
  async update(@Session() session, @Body() updateRequest: UpdateSongRequest): Promise<UpdateSongResponse> {
    this.logger.log('/update-song');
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!canEditCollection(user, updateRequest.song.collectionId)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(updateRequest.song, conformsTo(SongValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }
    const vr2 = validate(updateRequest.details, conformsTo(SongDetailsValidator));
    if (!vr2.success) {
      throw new HttpException(vr2.toString(), HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.update(updateRequest.song.title, updateRequest.details);
    return this.getSongUpdateResponse(updateRequest.song.id, updateRequest.song.collectionId);
  }

  private async getSongUpdateResponse(songId: number, collectionId: number): Promise<UpdateSongResponse> {
    const [songFromDb, detailsFromDb, songs] = await Promise.all([
      this.songDbi.getSongs([songId]),
      this.songDbi.getSongsDetails([songId]),
      this.songDbi.getSongsByCollectionId(collectionId),
    ]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw new HttpException(`Failed to build response ${songId}/${collectionId}`, HttpStatus.BAD_REQUEST);
    }
    return {song: songFromDb[0], details: detailsFromDb[0], songs};
  }

  /** Deletes the song and returns updated collection details. */
  @Delete(':songId')
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
    const song = songsArray[0];
    const collectionId = song.collectionId;

    try {
      await this.nodeBBService.deleteTopic(song.tid);
    } catch (e) {
      this.logger.error(e);
    }

    await this.songDbi.delete(songId);
    const songs = await this.songDbi.getSongsByCollectionId(collectionId);
    return {
      collectionId: collectionId,
      songs,
    };
  }

}
