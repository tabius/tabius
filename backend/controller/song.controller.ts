import { SongDbi } from '../db/song-dbi.service';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Req } from '@nestjs/common';
import { Song, SongDetails } from '@common/catalog-model';
import {
  isSongId,
  newSongAssertion,
  newSongDetailsAssertion,
  paramToArrayOfNumericIds,
  paramToId,
  songAssertion,
  songDetailsAssertion,
} from '../util/validators';
import { User } from '@common/user-model';
import { BackendAuthService } from '../service/backend-auth.service';
import {
  AddSongToSecondaryCollectionRequest,
  AddSongToSecondaryCollectionResponse,
  DeleteSongResponse,
  FullTextSongSearchRequest,
  FullTextSongSearchResponse,
  MoveSongToAnotherCollectionRequest,
  MoveSongToAnotherCollectionResponse,
  RemoveSongFromSecondaryCollectionRequest,
  RemoveSongFromSecondaryCollectionResponse,
  UpdateSongRequest,
  UpdateSongResponse,
  UpdateSongSceneFlagRequest,
} from '@common/ajax-model';
import { canManageCollectionContent, isModerator, isNumericId } from '@common/util/misc-utils';
import { FullTextSearchDbi } from '../db/full-text-search-dbi.service';
import { CollectionDbi } from '../db/collection-dbi.service';
import { assertTruthy, isBoolean, validateObject } from 'assertic';

@Controller('/api/song')
export class SongController {
  constructor(
    private readonly songDbi: SongDbi,
    private readonly collectionDbi: CollectionDbi,
    private readonly fullTextSearchDbi: FullTextSearchDbi,
  ) {}

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
      results,
    };
  }

  /** Creates song and returns updated song & details. */
  @Post()
  async create(@Req() req, @Body() request: UpdateSongRequest): Promise<UpdateSongResponse> {
    console.log('SongController.create', request);
    const user = BackendAuthService.getUserOrFail(req);
    const collection = await this.collectionDbi.getCollectionById(request.song.collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const error1 = validateObject(request.song, newSongAssertion);
    if (error1) {
      throw new HttpException(error1, HttpStatus.BAD_REQUEST);
    }
    const error2 = validateObject(request.details, newSongDetailsAssertion);
    if (error2) {
      throw new HttpException(error2, HttpStatus.BAD_REQUEST);
    }
    const songId = await this.songDbi.create(request.song, request.details);
    if (!isNumericId(songId)) {
      throw new HttpException(`Failed to create song: ${songId}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return await this.getSongUpdateResponse(songId, request.song.collectionId);
  }

  /** Updates song and returns updated song & details. */
  @Put()
  async update(@Req() req, @Body() request: UpdateSongRequest): Promise<UpdateSongResponse> {
    console.log('SongController.update', request);
    const user: User = BackendAuthService.getUserOrFail(req);
    const collection = await this.collectionDbi.getCollectionById(request.song.collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const error1 = validateObject(request.song, songAssertion);
    if (error1) {
      throw new HttpException(error1, HttpStatus.BAD_REQUEST);
    }
    const error2 = validateObject(request.details, songDetailsAssertion);
    if (error2) {
      throw new HttpException(error2, HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.update(request.song, request.details);
    return this.getSongUpdateResponse(request.song.id, request.song.collectionId);
  }

  /** Updates song's 'scene' flag and returns updated song & details. */
  @Put('scene')
  async updateSceneFlag(@Req() req, @Body() request: UpdateSongSceneFlagRequest): Promise<UpdateSongResponse> {
    console.log('SongController.updateSceneFlag', request);
    const user: User = BackendAuthService.getUserOrFail(req);
    if (!isModerator(user)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    if (!isSongId(request.songId)) {
      throw new HttpException(`Not a valid song id: ${request.songId}`, HttpStatus.BAD_REQUEST);
    }
    if (!isBoolean(request.flag)) {
      throw new HttpException(`Not a valid flag: ${request.flag}`, HttpStatus.BAD_REQUEST);
    }
    await this.songDbi.updateSceneFlag(request.songId, request.flag);
    return this.getSongUpdateResponse(request.songId, undefined);
  }

  private async getSongUpdateResponse(songId: number, collectionId: number | undefined): Promise<UpdateSongResponse> {
    const [songFromDb, detailsFromDb, songs] = await Promise.all([
      this.songDbi.getSongs([songId]),
      this.songDbi.getSongsDetails([songId]),
      collectionId !== undefined ? this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId) : Promise.resolve(undefined),
    ]);
    if (songFromDb.length === 0 || detailsFromDb.length === 0) {
      throw new HttpException(`Failed to build response ${songId}/${collectionId}`, HttpStatus.BAD_REQUEST);
    }
    return { song: songFromDb[0], details: detailsFromDb[0], songs };
  }

  /** Deletes the song and returns updated collection details. */
  @Delete(':songId/:collectionId')
  async delete(
    @Req() req,
    @Param('songId') idParam: string,
    @Param('collectionId') collectionIdParam: string,
  ): Promise<DeleteSongResponse> {
    console.log(`SongController.delete ${idParam}, collection: ${collectionIdParam}`);
    const user: User = BackendAuthService.getUserOrFail(req);
    const songId = +idParam;
    const collectionId = +collectionIdParam;
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException(`Song collection is not found ${collectionIdParam}`, HttpStatus.NOT_FOUND);
    }
    const canManage = canManageCollectionContent(user, collection);
    if (!canManage) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songsArray = await this.songDbi.getSongs([songId]);
    if (songsArray.length === 0) {
      throw new HttpException(`Song is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    const song = songsArray[0];
    let allAffectedCollectionIds: number[] = [];
    if (song.collectionId === collectionId) {
      // Deletes from all collections.
      allAffectedCollectionIds = await this.songDbi.getPrimaryAndSecondarySongCollectionIds(songId);
      await this.songDbi.delete(songId);
    } else {
      await this.songDbi.removeSongFromSecondaryCollection(songId, collectionId);
      allAffectedCollectionIds = [collectionId];
    }
    const songs$$: Promise<Song[]>[] = allAffectedCollectionIds.map(collectionId =>
      this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId),
    );
    const songs: Song[][] = await Promise.all(songs$$); //same order with allSongCollectionIds
    return {
      updatedCollections: songs.map((songs, index) => ({ collectionId: allAffectedCollectionIds[index], songs })),
    };
  }

  /** Adds song to secondary collection. */
  @Put('add-to-secondary-collection')
  async addSongToSecondaryCollection(
    @Req() req,
    @Body() request: AddSongToSecondaryCollectionRequest,
  ): Promise<AddSongToSecondaryCollectionResponse> {
    console.log('SongController.addSongToCollection', request);
    const { songId, collectionId } = request;
    const user: User = BackendAuthService.getUserOrFail(req);
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
    return { songIds };
  }

  /** Removes song to secondary collection. */
  @Put('remove-from-secondary-collection')
  async removeSongFromSecondaryCollection(
    @Req() req,
    @Body() request: RemoveSongFromSecondaryCollectionRequest,
  ): Promise<RemoveSongFromSecondaryCollectionResponse> {
    console.log('SongController.removeSongFromSecondaryCollection', request);
    const { songId, collectionId } = request;
    const user: User = BackendAuthService.getUserOrFail(req);
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    await this.songDbi.removeSongFromSecondaryCollection(songId, collectionId);
    const songIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collectionId);
    return { songIds };
  }

  /** Removes song from the source collection and adds it to the target collection. */
  @Put('move-to-another-collection')
  async moveSongToAnotherCollection(
    @Req() req,
    @Body() request: MoveSongToAnotherCollectionRequest,
  ): Promise<MoveSongToAnotherCollectionResponse> {
    console.log('moveSongToAnotherCollection', request);
    const { songId, sourceCollectionId, targetCollectionId } = request;

    // noinspection SuspiciousTypeOfGuard: TODO: use validators framework.
    assertTruthy(typeof songId === 'number' && typeof sourceCollectionId === 'number' && typeof targetCollectionId === 'number');

    const user: User = BackendAuthService.getUserOrFail(req);
    const song = await this.songDbi.getSong(songId);
    if (!song) {
      throw new HttpException('Song not found: ' + songId, HttpStatus.BAD_REQUEST);
    }
    const sourceCollection = await this.collectionDbi.getCollectionById(sourceCollectionId);
    if (!sourceCollection) {
      throw new HttpException('Source collection not found: ' + sourceCollectionId, HttpStatus.BAD_REQUEST);
    }
    const targetCollection = await this.collectionDbi.getCollectionById(targetCollectionId);
    if (!targetCollection) {
      throw new HttpException('Target collection not found: ' + sourceCollectionId, HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, sourceCollection)) {
      throw new HttpException('Insufficient rights for source collection', HttpStatus.FORBIDDEN);
    }
    if (!canManageCollectionContent(user, targetCollection)) {
      throw new HttpException('Insufficient rights for target collection', HttpStatus.FORBIDDEN);
    }
    if (sourceCollectionId === song.collectionId) {
      console.log(
        `moveSongToAnotherCollection: Update song primary collection: song-id: ${songId}, from: ${sourceCollectionId}, to: ${targetCollectionId}`,
      );
      song.collectionId = targetCollectionId;
      await this.songDbi.updateSongsPrimaryCollection([song.id], song.collectionId);
    } else if (targetCollectionId === song.collectionId) {
      console.log(
        `moveSongToAnotherCollection: Remove song from secondary collection, song-id: ${songId}, secondary collection: ${sourceCollectionId}`,
      );
      await this.songDbi.removeSongFromSecondaryCollection(songId, sourceCollectionId);
    } else {
      console.log(
        `moveSongToAnotherCollection: Update song secondary collection: song-id: ${songId}, from: ${sourceCollectionId}, to: ${targetCollectionId}`,
      );
      await this.songDbi.removeSongFromSecondaryCollection(songId, sourceCollectionId);
      await this.songDbi.addSongToSecondaryCollection(songId, targetCollectionId);
    }
    const sourceCollectionSongIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(sourceCollectionId);
    const targetCollectionSongIds = await this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(targetCollectionId);
    return { song, sourceCollectionSongIds, targetCollectionSongIds };
  }

  /** Returns random song from public collection. */
  @Get(['/random-song-id', '/random-song-id/:collectionId'])
  async getRandomSong(@Param('collectionId') collectionIdParam: string): Promise<number | undefined> {
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
