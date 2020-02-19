import {Injectable, Logger} from '@nestjs/common';
import {DbService} from './db.service';
import {newDefaultUserSettings, User, UserSettings} from '@common/user-model';

@Injectable()
export class UserDbi {

  private readonly logger = new Logger(UserDbi.name);

  constructor(private readonly db: DbService) {
  }

  async createUser(user: User): Promise<void> {
    this.logger.debug('Creating/updating user record: ' + user.email);

    const now = new Date();
    await this.db.pool.promise()
        .query('INSERT INTO user(id, collection_id, login_date, settings) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE collection_id = ?',
            [user.id, user.collectionId, now, '{}', user.collectionId]);

    this.logger.debug(`User record successfully created/updated: ${user.email}`);
  }

  async updateOnLogin(user: User): Promise<void> {
    const now = new Date();
    await this.db.pool.promise()
        .query('UPDATE user SET login_date = ? WHERE id = ? ', [now, user.id]);
  }

  //
  // async hasUserWithId(userId: string): Promise<boolean> {
  //   return await this.db.pool.promise()
  //       .query('SELECT COUNT(id) AS n  FROM user WHERE id = ?', [userId])
  //       .then(([rows]) => rows[0].n !== 0);
  // }

  updateSettings(userId: string, userSettings: UserSettings): Promise<void> {
    const settingsJson = JSON.stringify(userSettings);
    return this.db.pool.promise()
        .query('UPDATE user SET settings = ? WHERE id = ?',
            [settingsJson, userId]);
  }

  getSettings(userId: string): Promise<UserSettings|undefined> {
    return this.db.pool.promise()
        .query('SELECT settings FROM user WHERE id = ?', [userId])
        .then(([rows]: [{ settings: string }[]]) =>
            rows.length === 0 || rows[0].settings.length === 0
            ? undefined
            : {...newDefaultUserSettings(), ...JSON.parse(rows[0].settings)}
        );
  }

  getUserCollectionId(userId: string): Promise<number|undefined> {
    return this.db.pool.promise()
        .query('SELECT collection_id FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows.length === 0 ? undefined : rows[0]['collection_id']);
  }

  updateUserCollection(user: User): Promise<void> {
    return this.db.pool.promise()
        .query('UPDATE user SET collection_id = ? WHERE id = ?',
            [user.collectionId, user.id]);
  }
}
