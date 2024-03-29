import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';
import { Collection, CollectionDetails, CollectionType } from '@common/catalog-model';
import { isNumericId, toArrayOfInts } from '@common/util/misc-utils';
import { User } from '@common/user-model';
import { USER_COLLECTION_MOUNT_SEPARATOR, USER_FAV_COLLECTION_SUFFIX } from '@common/common-constants';
import { getTranslitLowerCase } from '@common/util/seo-translit';
import { I18N } from '../backend-i18n';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { truthy } from 'assertic';

interface CollectionRow extends RowDataPacket {
  id: number;
  name: string;
  type: CollectionType;
  mount: string;
  band_ids: string;
  version: number;
  listed: number;
  user_id: string | null;
}

interface CollectionWithDetailsRow extends CollectionRow {
  band_ids: string;
  listed: number;
}

const SELECT_COLLECTION_SQL = 'SELECT id, name, type, mount, version, user_id, listed FROM collection';
const SELECT_COLLECTION_DETAILS_SQL = 'SELECT id, version, band_ids FROM collection';

@Injectable()
export class CollectionDbi {
  constructor(private readonly db: DbService) {}

  async getAllCollections(kind: 'listed-only' | 'all'): Promise<Array<Collection>> {
    const [rows] = await this.db.pool
      .promise()
      .query<CollectionRow[]>(SELECT_COLLECTION_SQL + (kind === 'listed-only' ? ' WHERE listed = 1' : ''));
    return rows.map(row => rowToCollection(row));
  }

  async getCollectionById(collectionId: number): Promise<Collection | undefined> {
    const result = await this.getCollectionsByIds([collectionId]);
    return result.length === 1 ? result[0] : undefined;
  }

  async getCollectionsByIds(collectionIds: readonly number[]): Promise<Collection[]> {
    const [rows] = await this.db.pool
      .promise()
      .query<CollectionRow[]>(`${SELECT_COLLECTION_SQL} WHERE id IN (${collectionIds.join(',')})`);
    return rows.map(row => rowToCollection(row));
  }

  async getCollectionDetails(collectionId: number): Promise<CollectionDetails | undefined> {
    const [rows] = await this.db.pool
      .promise()
      .query<CollectionWithDetailsRow[]>(`${SELECT_COLLECTION_DETAILS_SQL} WHERE id  = ?`, [collectionId]);
    return rows.length === 0 ? undefined : rowToCollectionDetails(rows[0]);
  }

  async getByMount(mount: string): Promise<Collection | undefined> {
    return this.db.pool
      .promise()
      .query<CollectionRow[]>(`${SELECT_COLLECTION_SQL} WHERE mount = ?`, mount)
      .then(([rows]) => (rows.length === 0 ? undefined : rowToCollection(rows[0])));
  }

  async createListedCollection(name: string, mount: string, type: CollectionType): Promise<number> {
    console.log(`CollectionDbi.createListedCollection: ${name}, ${mount}, ${type}`);
    const result = await this.db.pool
      .promise()
      .query<ResultSetHeader>('INSERT IGNORE INTO collection(name, type, mount, listed) VALUES (?,?,?,?)', [name, type, mount, 1])
      .then(([result]) => result);

    return result.insertId;
  }

  async createPrimaryUserCollection(user: User): Promise<number> {
    if (isNumericId(user.collectionId)) {
      throw new Error(`User already has valid primary collection id assigned: ${user.id}, collectionId: ${user.collectionId}`);
    }
    console.log(`CollectionDbi.createPrimaryUserCollection: ${user.email}`);

    const collectionMount = generateCollectionMountForUser(user, USER_FAV_COLLECTION_SUFFIX);
    const result = await this.db.pool
      .promise()
      .query<ResultSetHeader>('INSERT IGNORE INTO collection(name, type, mount, listed, user_id) VALUES (?,?,?,?,?)', [
        I18N.common.favoritesCollectionName,
        CollectionType.Compilation,
        collectionMount,
        0,
        user.id,
      ])
      .then(([result]) => result);

    let collectionId: number | undefined = result.insertId;
    if (collectionId > 0) {
      console.log(`CollectionDbi.createPrimaryUserCollection: successfully created: ${user.email}, collectionId: ${collectionId}`);
      return result.insertId;
    }

    collectionId = await this.db.pool
      .promise()
      .query<CollectionWithDetailsRow[]>(`${SELECT_COLLECTION_DETAILS_SQL} WHERE user_id  = ?`, [user.id])
      .then(([rows]) => (rows.length === 0 ? undefined : rows[0].id));

    console.log(
      `CollectionDbi.createPrimaryUserCollection: reusing existing collection record: ${user.email}, collectionId: ${collectionId}`,
    );
    return truthy(collectionId); //TODO: handle undefined!
  }

  async createSecondaryUserCollection(userId: string, name: string, mount: string): Promise<number> {
    console.log(`CollectionDbi.createSecondaryUserCollection: user: ${userId}, name: ${name}, mount: ${mount}`);
    const result = await this.db.pool
      .promise()
      .query<ResultSetHeader>('INSERT INTO collection(name, type, mount, listed, user_id) VALUES (?,?,?,?,?)', [
        name,
        CollectionType.Compilation,
        mount,
        0,
        userId,
      ])
      .then(([result]) => result);

    const collectionId = result.insertId;
    if (collectionId > 0) {
      console.log(
        `CollectionDbi.createSecondaryUserCollection: collection was successfully created! Name: ${userId}, name: ${name}, collectionId: ${collectionId}`,
      );
    }
    return collectionId;
  }

  async deleteCollection(collectionId: number): Promise<void> {
    await this.db.pool.promise().query('DELETE FROM collection WHERE id = ?', [collectionId]);
  }

  async updateCollection(id: number, name: string, mount: string): Promise<void> {
    await this.db.pool
      .promise()
      .query('UPDATE collection SET name = ?, mount = ?, version = version + 1 ' + 'WHERE id = ?', [name, mount, id]);
  }

  async getAllUserCollections(userId: string): Promise<Collection[]> {
    const [rows] = await this.db.pool.promise().query<CollectionRow[]>(`${SELECT_COLLECTION_SQL} WHERE user_id = ?`, [userId]);
    return rows.map(row => rowToCollection(row));
  }
}

export function generateCollectionMountForUser(user: User, nameForSuffix: string): string {
  return `${user.mount}${USER_COLLECTION_MOUNT_SEPARATOR}${getTranslitLowerCase(nameForSuffix)}`;
}

function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    mount: row.mount,
    version: row.version,
    userId: row.user_id || undefined,
    listed: row.listed === 1,
  };
}

function rowToCollectionDetails(row: CollectionRow): CollectionDetails {
  return {
    id: row.id,
    version: row.version,
    bandIds: toArrayOfInts(row.band_ids, ','),
  };
}
