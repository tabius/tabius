import {Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Post, Put, Session} from '@nestjs/common';
import {Collection, CollectionDetails} from '@common/catalog-model';
import {CollectionDbi} from '@server/db/collection-dbi.service';
import {CreateCollectionRequestValidator, isCollectionMount, paramToArrayOfNumericIds, paramToId} from '@server/util/validators';
import {CreateCollectionRequest, CreateCollectionResponse, DeleteCollectionResponse, GetUserCollectionsResponse, UpdateCollectionRequest, UpdateCollectionResponse} from '@common/ajax-model';
import {User, UserGroup} from '@common/user-model';
import {ServerSsoService} from '@server/service/server-sso.service';
import {conformsTo, validate} from 'typed-validation';
import {canEditCollection, isValidUserId} from '@common/util/misc-utils';
import {SongDbi} from '@server/db/song-dbi.service';

@Controller('/api/collection')
export class CollectionController {
  private readonly logger = new Logger(CollectionController.name);

  constructor(private readonly collectionDbi: CollectionDbi,
              private readonly songDbi: SongDbi) {
  }

  /** Returns list of all 'listed' collections. */
  @Get('/all-listed')
  getAllListedCollections(): Promise<Collection[]> {
    this.logger.log('all-listed');
    return this.collectionDbi.getAllCollections(true);
  }

  /** Returns list of all 'listed' collections. */
  @Get('/user/:userId')
  async getAllUserCollections(@Param('userId') userId: string): Promise<GetUserCollectionsResponse> {
    this.logger.log(`user/${userId}`);
    if (!isValidUserId(userId)) {
      throw new HttpException(`Invalid user id: ${userId}`, HttpStatus.BAD_REQUEST);
    }
    const collections = await this.collectionDbi.getAllUserCollections(userId);
    const songIds: number[][] = await Promise.all(collections.map(collection => this.songDbi.getSongIdsByCollection(collection.id)));
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
    this.logger.log(`by-mount: ${mountParam}`);
    const vr = isCollectionMount()(mountParam);
    if (!vr.success) {
      throw new HttpException(vr.toString(), HttpStatus.BAD_REQUEST);
    }
    const collection = await this.collectionDbi.getByMount(mountParam);
    if (!collection) {
      throw new HttpException(`Collection is not found ${mountParam}`, HttpStatus.NOT_FOUND);
    }
    return collection;
  }

  @Get('/by-ids/:ids')
  getCollectionsByIds(@Param('ids') idsParam: string): Promise<Collection[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const collectionIds = paramToArrayOfNumericIds(idsParam);
    return this.collectionDbi.getCollectionsByIds(collectionIds);
  }

  @Get('/details-by-id/:id')
  async getCollectionDetailsById(@Param('id') idParam: string): Promise<CollectionDetails> {
    this.logger.log(`details-by-id: ${idParam}`);
    const collectionId = paramToId(idParam);
    const details = await this.collectionDbi.getCollectionDetails(collectionId);
    if (!details) {
      throw new HttpException(`Collection is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    return details;
  }

  @Post()
  async createListedCollection(@Session() session, @Body() request: CreateCollectionRequest): Promise<CreateCollectionResponse> {
    this.logger.log(`create-collection: ${request.name}, ${request.mount}`);
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr1 = validate(request, conformsTo(CreateCollectionRequestValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }

    const existingCollection = await this.collectionDbi.getByMount(request.mount);
    if (existingCollection) {
      throw new HttpException(`Collection already exists: ${request.mount}`, HttpStatus.BAD_REQUEST);
    }
    const collectionId = await this.collectionDbi.createListedCollection(request.name, request.mount, request.type);
    if (collectionId <= 0) {
      this.logger.error(`Failed to create collection: ${request.name}, ${request.mount}`);
      throw new HttpException('Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      collectionId,
      collections: await this.getAllListedCollections()
    };
  }

  @Post('/secondary-user-collection')
  async createSecondaryUserCollection(@Session() session, @Body() request: CreateCollectionRequest): Promise<CreateCollectionResponse> {
    this.logger.log(`create-secondary-collection: ${request.name}, ${request.mount}`);
    const user = ServerSsoService.getUserOrFail(session);
    const userCollections = await this.collectionDbi.getAllUserCollections(user.id);
    if (userCollections.find((c) => c.name === request.name)) {
      throw new HttpException('Collection with the same name already exists!', HttpStatus.BAD_REQUEST);
    }
    if (userCollections.find((c) => c.mount === request.mount)) {
      throw new HttpException('Collection with the same mount already exists!', HttpStatus.BAD_REQUEST);
    }
    const vr = validate(request, conformsTo(CreateCollectionRequestValidator));
    if (!vr.success) {
      throw new HttpException(vr.toString(), HttpStatus.BAD_REQUEST);
    }
    const collectionId = await this.collectionDbi.createSecondaryUserCollection(user.id, request.name, request.mount);
    if (collectionId <= 0) {
      throw new HttpException('Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      collectionId,
      collections: await this.collectionDbi.getAllUserCollections(user.id),
    };
  }

  /** Updates collection and returns updated song & details. */
  @Put('/secondary-user-collection')
  async update(@Session() session, @Body() request: UpdateCollectionRequest): Promise<UpdateCollectionResponse> {
    this.logger.log('/update-collection');
    const user: User = ServerSsoService.getUserOrFail(session);
    const collection = await this.collectionDbi.getCollectionById(request.id);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (!canEditCollection(user, collection)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    await this.collectionDbi.updateCollection(request.id, request.name, request.mount);
    return {
      collections: await this.collectionDbi.getAllUserCollections(user.id),
    };
  }

  /** Deletes collection and returns list of all user collection. */
  @Delete('/secondary-user-collection/:collectionId')
  async delete(@Session() session, @Param('collectionId') idParam: string): Promise<DeleteCollectionResponse> {
    this.logger.log(`/delete secondary user collection ${idParam}`);
    const user: User = ServerSsoService.getUserOrFail(session);
    const collectionId = +idParam;
    if (collectionId === user.collectionId) {
      throw new HttpException('Can\'t remove primary user collection', HttpStatus.BAD_REQUEST);
    }
    const collection = await this.collectionDbi.getCollectionById(collectionId);
    if (!collection) {
      throw new HttpException('Collection not found', HttpStatus.BAD_REQUEST);
    }
    if (collection.userId !== user.id) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songs = await this.songDbi.getSongsByCollectionId(collectionId);
    if (songs.length > 0) {
      // Move primary songs to the primary user collection.
      const primarySongIds = songs.filter((s) => s.collectionId === collectionId).map((s) => s.id);
      if (primarySongIds.length > 0) {
        await this.songDbi.updateSongsPrimaryCollection(primarySongIds, user.collectionId);
        await this.songDbi.removeSongsFromSecondaryCollection(primarySongIds, user.collectionId);
      }
      // Delete songs from the secondary collections.
      const secondarySongIds = songs.filter((s) => s.collectionId !== collectionId).map((s) => s.id);
      if (secondarySongIds.length > 0) {
        await this.songDbi.removeSongsFromSecondaryCollection(secondarySongIds, collectionId);
      }
    }
    await this.collectionDbi.deleteCollection(collectionId);
    return {
      collections: await this.collectionDbi.getAllUserCollections(user.id)
    };
  }
}

