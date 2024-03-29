import { Body, Controller, Delete, HttpException, HttpStatus, Param, Post, Put, Req } from '@nestjs/common';
import { CollectionDbi, generateCollectionMountForUser } from '../db/collection-dbi.service';
import { createListedCollectionRequestAssertion, createUserCollectionRequestAssertion } from '../util/validators';
import {
  CreateListedCollectionRequest,
  CreateListedCollectionResponse,
  CreateUserCollectionRequest,
  CreateUserCollectionResponse,
  DeleteUserCollectionResponse,
  UpdateCollectionRequest,
  UpdateCollectionResponse,
} from '@common/api-model';
import { User } from '@common/user-model';
import { BackendAuthService } from '../service/backend-auth.service';
import { canManageCollectionContent, isModerator } from '@common/util/misc-utils';
import { SongDbi } from '../db/song-dbi.service';
import { validateObject } from 'assertic';
import { allListedCollections } from '@backend/handlers/collection.handler';

@Controller('/api/collection')
export class CollectionController {
  constructor(
    private readonly collectionDbi: CollectionDbi,
    private readonly songDbi: SongDbi,
  ) {}

  @Post()
  async createListedCollection(@Req() req, @Body() request: CreateListedCollectionRequest): Promise<CreateListedCollectionResponse> {
    console.log('CollectionController.createListedCollection', request);
    const user: User = BackendAuthService.getUserOrFail(req);
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
      collections: await allListedCollections.get(),
    };
  }

  @Post('/user')
  async createUserCollection(@Req() req, @Body() request: CreateUserCollectionRequest): Promise<CreateUserCollectionResponse> {
    console.log('CollectionController.createUserCollection', request);
    const user = BackendAuthService.getUserOrFail(req);
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
  async updateUserCollection(@Req() req, @Body() request: UpdateCollectionRequest): Promise<UpdateCollectionResponse> {
    console.log('CollectionController.updateUserCollection', request);
    const user: User = BackendAuthService.getUserOrFail(req);
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
  async deleteUserCollection(@Req() req, @Param('collectionId') idParam: string): Promise<DeleteUserCollectionResponse> {
    console.log('CollectionController.deleteUserCollection', idParam);
    const user: User = BackendAuthService.getUserOrFail(req);
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
