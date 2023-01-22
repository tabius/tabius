import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Session} from '@nestjs/common';
import {Song, SongDetails} from '@common/catalog-model';
import {isNumericId, NewSongDetailsValidator, NewSongValidator, paramToArrayOfNumericIds, paramToId, SongDetailsValidator, SongValidator} from '@server/util/validators';
import {User} from '@common/user-model';
import {conformsTo, isBoolean, validate} from '@server/util/validation';
import {ServerAuthService} from '@server/service/server-auth.service';
import {AddSongToSecondaryCollectionRequest, AddSongToSecondaryCollectionResponse, DeleteSongResponse, FullTextSongSearchRequest, FullTextSongSearchResponse, RemoveSongFromSecondaryCollectionRequest, RemoveSongFromSecondaryCollectionResponse, UpdateSongRequest, UpdateSongResponse, UpdateSongSceneFlagRequest} from '@common/ajax-model';
import {canManageCollectionContent, isModerator, isValidId} from '@common/util/misc-utils';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';
import {CollectionDbi} from '@server/db/collection-dbi.service';

@Controller('/api/song')
export class SongController {

  constructor(private readonly songDbi: SongDbi,
              private readonly collectionDbi: CollectionDbi,
              private readonly fullTextSearchDbi: FullTextSearchDbi,
  ) {
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Get('/by-ids/:ids')
  async getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    console.log('SongController.getSongs', idsParam);
    const ids = paramToArrayOfNumericIds(idsParam);
    return await this.songDbi.getSongs(ids);
  }

  /** Returns list of songs in the collection. */
  @Get('/by-collection/:collectionId')
  async getSongsByCollectionId(@Param('collectionId') collectionIdParam: string): Promise<Song[]> {
    console.log('SongController.getSongsByCollectionId', collectionIdParam);
    const collectionId = paramToId(collectionIdParam);
    return await this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId);
  }

  /** Returns found song details by ids. The order of results is not specified. */
  @Get('/details-by-ids/:ids')
  async getSongDetails(@Param('ids') idsParam: string): Promise<SongDetails[]> {
    console.log('SongController.getSongDetails', idsParam);
    const ids = paramToArrayOfNumericIds(idsParam);
    return await this.songDbi.getSongsDetails(ids);
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Post('/by-text')
  async searchSongsByText(@Body() searchRequest: FullTextSongSearchRequest): Promise<FullTextSongSearchResponse> {
    console.log('SongController.searchSongsByText', searchRequest.text);
    const results = await this.fullTextSearchDbi.searchForSongsByText(searchRequest.text);
    return {
      results
    };
  }

  /** Creates song and returns updated song & details. */
  @Post()
  async create(@Session() session, @Body() request: UpdateSongRequest): Promise<UpdateSongResponse> {
    console.log('SongController.create', request);
    const user: User = ServerAuthService.getUserOrFail(session);
    const collection = await this.collectionDbi.getCollectionById(request.song.collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(request.song, conformsTo(NewSongValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }
    const vr2 = validate(request.details, conformsTo(NewSongDetailsValidator));
    if (!vr2.success) {
      throw new HttpException(vr2.toString(), HttpStatus.BAD_REQUEST);
    }
    const songId = await this.songDbi.create(request.song, request.details);
    if (!isValidId(songId)) {
      throw new HttpException(`Failed to create song: ${songId}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return await this.getSongUpdateResponse(songId, request.song.collectionId);
  }

  /** Updates song and returns updated song & details. */
  @Put()
  async update(@Session() session, @Body() request: UpdateSongRequest): Promise<UpdateSongResponse> {
    console.log('SongController.update', request);
    const user: User = ServerAuthService.getUserOrFail(session);
    const collection = await this.collectionDbi.getCollectionById(request.song.collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(request.song, conformsTo(SongValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }
    const vr2 = validate(request.details, conformsTo(SongDetailsValidator));
    if (!vr2.success) {
      throw new HttpException(vr2.toString(), HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.update(request.song, request.details);
    return this.getSongUpdateResponse(request.song.id, request.song.collectionId);
  }

  /** Updates song's 'scene' flag and returns updated song & details. */
  @Put('scene')
  async updateSceneFlag(@Session() session, @Body() request: UpdateSongSceneFlagRequest): Promise<UpdateSongResponse> {
    console.log('SongController.updateSceneFlag', request);
    const user: User = ServerAuthService.getUserOrFail(session);
    if (!isModerator(user)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songIdVr = validate(request.songId, isNumericId());
    if (!songIdVr.success) {
      throw new HttpException(songIdVr.toString(), HttpStatus.BAD_REQUEST);
    }
    const flagVr = validate(request.flag, isBoolean());
    if (!flagVr.success) {
      throw new HttpException(flagVr.toString(), HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.updateSceneFlag(request.songId, request.flag);
    return this.getSongUpdateResponse(request.songId, undefined);
  }

  private async getSongUpdateResponse(songId: number, collectionId: number|undefined): Promise<UpdateSongResponse> {
    const [songFromDb, detailsFromDb, songs] = await Promise.all([
      this.songDbi.getSongs([songId]),
      this.songDbi.getSongsDetails([songId]),
      collectionId !== undefined ? this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId) : Promise.resolve(undefined),
    ]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw new HttpException(`Failed to build response ${songId}/${collectionId}`, HttpStatus.BAD_REQUEST);
    }
    return {song: songFromDb[0], details: detailsFromDb[0], songs};
  }

  /** Deletes the song and returns updated collection details. */
  @Delete(':songId')
  async delete(@Session() session, @Param('songId') idParam: string): Promise<DeleteSongResponse> {
    console.log('SongController.delete', idParam);
    const user: User = ServerAuthService.getUserOrFail(session);
    if (!isModerator(user)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songId = +idParam;
    const songsArray = await this.songDbi.getSongs([songId]);
    if (songsArray.length === 0) {
      throw new HttpException(`Song is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    const allSongCollectionIds = await this.songDbi.getPrimaryAndSecondarySongCollectionIds(songId);
    await this.songDbi.delete(songId);
    const songs$$: Promise<Song[]>[] = allSongCollectionIds.map(collectionId => this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId));
    const songs: Song[][] = await Promise.all(songs$$); //same order with allSongCollectionIds
    return {
      updatedCollections: songs.map((songs, index) => ({collectionId: allSongCollectionIds[index], songs}))
    };
  }

  /** Adds song to secondary collection. */
  @Put('add-to-secondary-collection')
  async addSongToSecondaryCollection(@Session() session, @Body() request: AddSongToSecondaryCollectionRequest)
      : Promise<AddSongToSecondaryCollectionResponse> {
    console.log('SongController.addSongToCollection', request);
    const {songId, collectionId} = request;
    const user: User = ServerAuthService.getUserOrFail(session);
    //todo: check if song exists & is in the listed collection or is in the user collection.
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const currentSongIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collectionId);
    if (currentSongIds.includes(request.songId)) {
      throw new HttpException('Song is already added to the collection', HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.addSongToSecondaryCollection(songId, collectionId);
    const songIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collectionId);
    return {songIds};
  }

  /** Removes song to secondary collection. */
  @Put('remove-from-secondary-collection')
  async removeSongFromSecondaryCollection(@Session() session, @Body() request: RemoveSongFromSecondaryCollectionRequest)
      : Promise<RemoveSongFromSecondaryCollectionResponse> {
    console.log('SongController.removeSongFromSecondaryCollection', request);
    const {songId, collectionId} = request;
    const user: User = ServerAuthService.getUserOrFail(session);
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    await this.songDbi.removeSongFromSecondaryCollection(songId, collectionId);
    const songIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collectionId);
    return {songIds};
  }

  /** Returns random song from public collection. */
  @Get(['/random-song-id', '/random-song-id/:collectionId'])
  async getRandomSong(@Param('collectionId') collectionIdParam: string): Promise<number|undefined> {
    console.log('SongController.getRandomSong', collectionIdParam);
    if (collectionIdParam) {
      const collectionId = paramToId(collectionIdParam);
      return await this.songDbi.getRandomSongFromCollection(collectionId);
    }
    return await this.songDbi.getRandomSongFromPublicCatalog();
  }

  /** Returns song ID for the scene page. Returns the same result during the calendar day (UTC). */
  @Get('/scene-song-id')
  async getSceneSong(): Promise<number> {
    console.log('SongController.getSceneSong');
    return await this.songDbi.getSceneSongId();
  }
}
