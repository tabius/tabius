import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Session } from '@nestjs/common';
import { Collection, CollectionDetails } from '@common/catalog-model';
import { CollectionDbi, generateCollectionMountForUser } from '../db/collection-dbi.service';
import {
  createListedCollectionRequestAssertion,
  createUserCollectionRequestAssertion,
  isCollectionMount,
  paramToArrayOfNumericIds,
  paramToId,
} from '../util/validators';
import {
  CreateListedCollectionRequest,
  CreateListedCollectionResponse,
  CreateUserCollectionRequest,
  CreateUserCollectionResponse,
  DeleteUserCollectionResponse,
  GetUserCollectionsResponse,
  UpdateCollectionRequest,
  UpdateCollectionResponse,
} from '@common/ajax-model';
import { User } from '@common/user-model';
import { BackendAuthService } from '../service/backend-auth.service';
import { canManageCollectionContent, isModerator, isValidUserId } from '@common/util/misc-utils';
import { SongDbi } from '../db/song-dbi.service';
import { AsyncFreshValue } from 'frescas';
import { validateObject } from 'assertic';

@Controller('/api/collection')
export class CollectionController {
  constructor(private readonly collectionDbi: CollectionDbi, private readonly songDbi: SongDbi) {}

  private allListedCollections = new AsyncFreshValue<Array<Collection>>({
    refreshPeriodMillis: 30 * 1000,
    load: async () => this.collectionDbi.getAllCollections('listed-only'),
  });

  /** Returns list of all 'listed' collections. */
  @Get('/all-listed')
  getAllListedCollections(): Promise<Array<Collection>> {
    console.log('CollectionController.getAllListedCollections');
    return this.allListedCollections.get();
  }

  /** Returns list of all user collections. */
  @Get('/user/:userId')
  async getAllUserCollections(@Param('userId') userId: string): Promise<GetUserCollectionsResponse> {
    console.log('CollectionController.getAllUserCollections', userId);
    if (!isValidUserId(userId)) {
      throw new HttpException(`Invalid user id: ${userId}`, HttpStatus.BAD_REQUEST);
    }
    const collections = await this.collectionDbi.getAllUserCollections(userId);
    const songIds: number[][] = await Promise.all(
      collections.map(collection => this.songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collection.id)),
    );
    return {
      collectionInfos: collections.map((collection, index) => ({
        collection,
        songIds: songIds[index],
      })),
    };
  }

  /** Returns collection by mount. */
  @Get('/by-mount/:mount')
  async getByMount(@Param('mount') mountParam: string): Promise<Collection> {
    console.log('CollectionController.getByMount', mountParam);
    if (!isCollectionMount(mountParam)) {
      throw new HttpException(`Bad collection mount: ${mountParam}`, HttpStatus.BAD_REQUEST);
    }
    const collection = await this.collectionDbi.getByMount(mountParam);
    if (!collection) {
      throw new HttpException(`Collection is not found ${mountParam}`, HttpStatus.NOT_FOUND);
    }
    return collection;
  }

  @Get('/by-ids/:ids')
  getCollectionsByIds(@Param('ids') idsParam: string): Promise<Collection[]> {
    // TODO: check permissions?
    console.log('CollectionController.getCollectionsByIds', idsParam);
    const collectionIds = paramToArrayOfNumericIds(idsParam);
    return this.collectionDbi.getCollectionsByIds(collectionIds);
  }

  @Get('/details-by-id/:id')
  async getCollectionDetailsById(@Param('id') idParam: string): Promise<CollectionDetails> {
    console.log('CollectionController.getCollectionDetailsById', idParam);
    const collectionId = paramToId(idParam);
    const details = await this.collectionDbi.getCollectionDetails(collectionId);
    if (!details) {
      throw new HttpException(`Collection is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    return details;
  }

  @Post()
  async createListedCollection(
    @Session() session,
    @Body() request: CreateListedCollectionRequest,
  ): Promise<CreateListedCollectionResponse> {
    console.log('CollectionController.createListedCollection', request);
    const user: User = BackendAuthService.getUserOrFail(session);
    if (!isModerator(user)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const error = validateObject(request, createListedCollectionRequestAssertion);
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }

    const existingCollection = await this.collectionDbi.getByMount(request.mount);
    if (existingCollection) {
      throw new HttpException(`Collection already exists: ${request.mount}`, HttpStatus.BAD_REQUEST);
    }
    const collectionId = await this.collectionDbi.createListedCollection(request.name, request.mount, request.type);
    if (collectionId <= 0) {
      console.error(`CollectionController.createListedCollection: failed to create collection: ${request.name}, ${request.mount}`);
      throw new HttpException('Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      collectionId,
      collections: await this.getAllListedCollections(),
    };
  }

  @Post('/user')
  async createUserCollection(
    @Session() session,
    @Body() request: CreateUserCollectionRequest,
  ): Promise<CreateUserCollectionResponse> {
    console.log('CollectionController.createUserCollection', request);
    const user = BackendAuthService.getUserOrFail(session);
    const error = validateObject(request, createUserCollectionRequestAssertion);
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    const userCollections = await this.collectionDbi.getAllUserCollections(user.id);
    if (userCollections.find(c => c.name === request.name)) {
      throw new HttpException('Collection with the same name already exists!', HttpStatus.BAD_REQUEST);
    }
    let mount = generateCollectionMountForUser(user, request.name);
    let mountIdx = 1;
    while (userCollections.find(c => c.mount === mount)) {
      mount = generateCollectionMountForUser(user, `${request.name} ${mountIdx++}`);
    }
    const collectionId = await this.collectionDbi.createSecondaryUserCollection(user.id, request.name, mount);
    if (collectionId <= 0) {
      throw new HttpException('Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      collectionId,
      collections: await this.collectionDbi.getAllUserCollections(user.id),
    };
  }

  /** Updates collection and returns updated song & details. */
  @Put('/user')
  async updateUserCollection(@Session() session, @Body() request: UpdateCollectionRequest): Promise<UpdateCollectionResponse> {
    console.log('CollectionController.updateUserCollection', request);
    const user: User = BackendAuthService.getUserOrFail(session);
    const collection = await this.collectionDbi.getCollectionById(request.id);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canManageCollectionContent(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    await this.collectionDbi.updateCollection(request.id, request.name, request.mount);
    return {
      collections: await this.collectionDbi.getAllUserCollections(user.id),
    };
  }

  /** Deletes collection and returns list of all user collection. */
  @Delete('/user/:collectionId')
  async deleteUserCollection(@Session() session, @Param('collectionId') idParam: string): Promise<DeleteUserCollectionResponse> {
    console.log('CollectionController.deleteUserCollection', idParam);
    const user: User = BackendAuthService.getUserOrFail(session);
    const collectionId = +idParam;
    if (collectionId === user.collectionId) {
      throw new HttpException(`Can't remove primary user collection`, HttpStatus.BAD_REQUEST);
    }
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (collection.userId !== user.id) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songs = await this.songDbi.getPrimaryAndSecondarySongsByCollectionId(collectionId);
    if (songs.length > 0) {
      const primarySongIds = songs.filter(s => s.collectionId === collectionId).map(s => s.id);
      const secondarySongIds = songs.filter(s => s.collectionId !== collectionId).map(s => s.id);
      if (primarySongIds.length > 0) {
        // Move primary songs to the primary user collection.
        await this.songDbi.updateSongsPrimaryCollection(primarySongIds, user.collectionId);
      }
      if (secondarySongIds.length > 0) {
        // Cleanup secondary collection records.
        await this.songDbi.removeAllSongsFromSecondaryCollection(collectionId);
      }
    }
    await this.collectionDbi.deleteCollection(collectionId);
    return {
      userId: user.id,
      collections: await this.collectionDbi.getAllUserCollections(user.id),
    };
  }
}
