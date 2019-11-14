import {Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Post, Session} from '@nestjs/common';
import {Collection, CollectionDetails} from '@common/catalog-model';
import {CollectionDbi} from '@server/db/collection-dbi.service';
import {CreateCollectionRequestValidator, isCollectionMount, paramToArrayOfNumericIds, paramToId} from '@server/util/validators';
import {CreateCollectionRequest, CreateCollectionResponse} from '@common/ajax-model';
import {User, UserGroup} from '@common/user-model';
import {ServerSsoService} from '@server/service/server-sso.service';
import {conformsTo, validate} from 'typed-validation';

@Controller('/api/collection')
export class CollectionController {
  private readonly logger = new Logger(CollectionController.name);

  constructor(private readonly collectionDbi: CollectionDbi) {
  }

  /** Returns list of all 'listed' collections. */
  @Get('/all-listed')
  getAllListedCollections(): Promise<Collection[]> {
    this.logger.log('all-listed');
    return this.collectionDbi.getAllCollections(true);
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
  async createCollection(@Session() session, @Body() request: CreateCollectionRequest): Promise<CreateCollectionResponse> {
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    this.logger.log(`create-collection: ${request.name}, ${request.mount}`);
    const vr1 = validate(request, conformsTo(CreateCollectionRequestValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }

    const existingCollection = await this.collectionDbi.getByMount(request.mount);
    if (existingCollection) {
      throw new HttpException(`Collection already exists: ${request.mount}`, HttpStatus.BAD_REQUEST);
    }
    const collectionId = await this.collectionDbi.createCollection(request.name, request.mount, request.type);
    if (collectionId <= 0) {
      this.logger.error(`Failed to create collection: ${request.name}, ${request.mount}`);
      throw new HttpException('Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const collections = await this.getAllListedCollections();
    return {collections};
  }
}

