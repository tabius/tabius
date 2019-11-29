import {Injectable, Logger} from '@nestjs/common';
import {DbService} from './db.service';
import {Collection, CollectionDetails, CollectionType} from '@common/catalog-model';
import {isValidId, toArrayOfInts} from '@common/util/misc-utils';
import {User} from '@common/user-model';
import Hashids from 'hashids';

interface CollectionRow {
  id: number;
  name: string;
  type: CollectionType;
  mount: string;
  band_ids: string;
  version: number;
  listed: number;
  user_id: string|undefined;
}

interface CollectionWithDetailsRow extends CollectionRow {
  band_ids: string;
  listed: number;
}

const SELECT_COLLECTION_SQL = 'SELECT id, name, type, mount, version, user_id FROM collection';
const SELECT_COLLECTION_DETAILS_SQL = 'SELECT id, version, band_ids, listed FROM collection';

@Injectable()
export class CollectionDbi {

  private readonly logger = new Logger(CollectionDbi.name);

  constructor(private readonly db: DbService) {
  }

  getAllCollections(listedOnly: boolean): Promise<Collection[]> {
    return this.db.pool.promise()
        .query(SELECT_COLLECTION_SQL + (listedOnly ? ' WHERE listed = 1' : ''))
        .then(([rows]: [CollectionRow[]]) => rows.map(row => rowToCollection(row)));
  }

  async getCollectionById(collectionId: number): Promise<Collection|undefined> {
    const result = await this.getCollectionsByIds([collectionId]);
    return result.length === 1 ? result[0] : undefined;
  }

  getCollectionsByIds(collectionIds: readonly number[]): Promise<Collection[]> {
    return this.db.pool.promise()
        .query(`${SELECT_COLLECTION_SQL} WHERE id IN (${collectionIds.join(',')})`)
        .then(([rows]: [CollectionRow[]]) => rows.map(row => rowToCollection(row)));
  }

  getCollectionDetails(collectionId: number): Promise<CollectionDetails|undefined> {
    return this.db.pool.promise()
        .query(`${SELECT_COLLECTION_DETAILS_SQL} WHERE id  = ?`, [collectionId])
        .then(([rows]: [CollectionWithDetailsRow[]]) => rows.length === 0 ? undefined : rowToCollectionDetails(rows[0]));
  }

  async getByMount(mount: string): Promise<Collection|undefined> {
    return this.db.pool.promise()
        .query(`${SELECT_COLLECTION_SQL} WHERE mount = ?`, mount)
        .then(([rows]: [CollectionRow[]]) => rows.length === 0 ? undefined : rowToCollection(rows[0]));
  }

  async createListedCollection(name: string, mount: string, type: CollectionType): Promise<number> {
    this.logger.debug(`Creating new collection: ${name}, ${mount}, ${type}`);
    const result = await this.db.pool.promise()
        .query('INSERT IGNORE INTO collection(name, type, mount, listed) VALUES (?,?,?,?)',
            [name, type, mount, 1])
        .then(([result]) => result);

    let collectionId = result.insertId;
    if (collectionId <= 0) {
      this.logger.debug(`Listed collection was successfully created! Name: ${name}, collection-id: ${collectionId}`);
    }
    return collectionId;
  }

  async createPrimaryUserCollection(user: User): Promise<number> {
    if (isValidId(user.collectionId)) {
      throw new Error(`User already has valid collection id assigned: ${user.id}, collectionId: ${user.collectionId}`);
    }
    this.logger.debug(`Creating collection record for user: ${user.email}`);

    const collectionMount = generateCollectionMountForUser();
    const result = await this.db.pool.promise()
        .query('INSERT IGNORE INTO collection(name, type, mount, listed, user_id) VALUES (?,?,?,?,?)',
            [user.username, CollectionType.Compilation, collectionMount, 0, user.id])
        .then(([result]) => result);

    let collectionId = result.insertId;
    if (collectionId > 0) {
      this.logger.debug(`Primary collection was successfully created: ${user.email}, collection-id: ${collectionId}`);
      return result.insertId;
    }

    collectionId = await this.db.pool.promise()
        .query(`${SELECT_COLLECTION_DETAILS_SQL} WHERE user_id  = ?`, [user.id])
        .then(([rows]: [CollectionWithDetailsRow[]]) => rows.length === 0 ? undefined : rows[0].id);

    this.logger.debug(`Reusing existing collection record: ${user.email}, collection-id: ${collectionId}`);
    return collectionId;
  }

  async createSecondaryUserCollection(userId: string, name: string, mount: string): Promise<number> {
    this.logger.debug(`Creating collection record for user: ${userId}`);
    const result = await this.db.pool.promise()
        .query('INSERT INTO collection(name, type, mount, listed, user_id) VALUES (?,?,?,?,?)',
            [name, CollectionType.Compilation, mount, 0, userId])
        .then(([result]) => result);

    let collectionId = result.insertId;
    if (collectionId > 0) {
      this.logger.debug(`Secondary collection was successfully created! Name: ${userId}, name: ${name}, collection-id: ${collectionId}`);
    }
    return collectionId;
  }

  async deleteCollection(collectionId: number): Promise<void> {
    await this.db.pool.promise().query('DELETE FROM collection WHERE id = ?', [collectionId]);
  }

  async updateCollection(id: number, name: string, mount: string): Promise<void> {
    await this.db.pool.promise().query('UPDATE collection SET name = ?, mount = ?, version = version + 1 ' +
        'WHERE id = ?', [name, mount, id]);
  }

  getAllUserCollections(userId: string): Promise<Collection[]> {
    return this.db.pool.promise()
        .query(`${SELECT_COLLECTION_SQL} WHERE user_id = ?`, [userId])
        .then(([rows]: [CollectionRow[]]) => rows.map(row => rowToCollection(row)));
  }
}

function generateCollectionMountForUser(): string {
  const hashIds = new Hashids('salt', 5);
  return `u${hashIds.encode(Date.now())}`;
}

function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    mount: row.mount,
    version: row.version,
    userId: row.user_id,
  };
}

function rowToCollectionDetails(row: CollectionRow): CollectionDetails {
  return {
    id: row.id,
    version: row.version,
    bandIds: toArrayOfInts(row.band_ids, ','),
    listed: row.listed === 1,
  };
}
