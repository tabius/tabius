import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {newDefaultUserSettings, User, UserSettings} from '@common/user-model';

@Injectable()
export class UserDbi {
  constructor(private readonly db: DbService) {
  }

  async createUser(user: User): Promise<void> {
    const now = new Date();
    await this.db.pool.promise()
        .query('INSERT INTO user(id, artist_id, login_date, settings) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE artist_id = ?',
            [user.id, user.artistId, now, '{}', user.artistId]);
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

  getUserArtistId(userId: string): Promise<number|undefined> {
    return this.db.pool.promise()
        .query('SELECT artist_id FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows.length === 0 ? undefined : rows[0]['artist_id']);
  }
}
