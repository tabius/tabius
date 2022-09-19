import {Injectable, Logger} from '@nestjs/common';
import {DbService} from './db.service';
import {newDefaultUserSettings, User, UserRole, UserSettings} from '@common/user-model';
import {RowDataPacket} from 'mysql2';

@Injectable()
export class UserDbi {

  private readonly logger = new Logger(UserDbi.name);

  constructor(private readonly db: DbService) {
  }

  async createUser(user: User): Promise<void> {
    this.logger.debug(`Creating/updating user record: ${user.email}`);

    const now = new Date();
    await this.db.pool.promise()
        .query('INSERT INTO user(id, email, nickname, collection_id, mount, login_date, settings) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE collection_id = ?',
            [user.id, user.email, user.nickname, user.collectionId, user.mount, now, '{}', user.collectionId]);

    this.logger.debug(`User record successfully created/updated: ${user.email}`);
  }

  async updateOnLogin(user: User): Promise<void> {
    const now = new Date();
    await this.db.pool.promise()
        .query('UPDATE user SET login_date = ? WHERE id = ? ', [now, user.id]);
  }

  updateSettings(userId: string, userSettings: UserSettings): Promise<unknown> {
    const settingsJson = JSON.stringify(userSettings);
    return this.db.pool.promise()
        .query('UPDATE user SET settings = ? WHERE id = ?',
            [settingsJson, userId]);
  }

  getSettings(userId: string): Promise<UserSettings|undefined> {
    return this.db.pool.promise()
        .query<RowDataPacket[]>('SELECT settings FROM user WHERE id = ?', [userId])
        .then(([rows]) =>
            rows.length === 0
            ? undefined
            : {...newDefaultUserSettings(), ...JSON.parse(rows[0]['settings'])}
        );
  }

  getUserCollectionId(userId: string): Promise<number|undefined> {
    return this.db.pool.promise()
        .query<RowDataPacket[]>('SELECT collection_id FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows.length === 0 ? undefined : rows[0]['collection_id']);
  }

  getUserMount(userId: string): Promise<string|undefined> {
    return this.db.pool.promise()
        .query<RowDataPacket[]>('SELECT mount FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows.length === 0 ? undefined : rows[0]['mount']);
  }

  getUserRoles(userId: string): Promise<Array<UserRole>> {
    return this.db.pool.promise()
        .query<RowDataPacket[]>('SELECT roles FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows.length === 0 ? undefined : rows[0]['roles'].split(',').map(v => v.trim()));
  }
}
