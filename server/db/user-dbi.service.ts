import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {newDefaultUserSettings, User, UserSettings} from '@common/user-model';

@Injectable()
export class UserDbi {
  constructor(private readonly db: DbService) {
  }

  async updateOnLogin(user: User): Promise<void> {
    const userExist = await this.hasUserWithId(user.id);
    const now = new Date();
    if (userExist) {
      return this.db.pool.promise()
          .query('UPDATE user SET login_date = ? WHERE id = ? ', [now, user.id]);
    }
    return this.db.pool.promise()
        .query('INSERT INTO user(id, login_date, settings) VALUES (?,?,?) ON DUPLICATE KEY UPDATE login_date = ?',
            [user.id, now, '{}', now]);
  }

  private async hasUserWithId(userId: string): Promise<boolean> {
    return await this.db.pool.promise()
        .query('SELECT COUNT(id) AS n  FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows[0].n !== 0);
  }

  updateSettings(userId: string, userSettings: UserSettings): Promise<void> {
    const settingsWithoutMount = {...userSettings};
    const settingsJson = JSON.stringify(settingsWithoutMount);
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
                : {...newDefaultUserSettings(), ...JSON.parse(rows[0].settings), mount: rows[0].mount}
        );
  }
}
