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
    // create new user
    const mount = await this.generateUniqueMount(user.email);
    return this.db.pool.promise()
        .query('INSERT INTO user(id, name, picture, email, mount, login_date, settings) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE login_date = ?',
            [user.id, user.name, user.picture, user.email, mount, now, '{}', now]);
  }

  hasUserWithId(userId: string): Promise<boolean> {
    return this.db.pool.promise()
        .query('SELECT COUNT(id) AS n  FROM user WHERE id = ?', [userId])
        .then(([rows]) => rows[0].n !== 0);
  }

  hasUserWithMount(mount: string): Promise<boolean> {
    return this.db.pool.promise()
        .query('SELECT COUNT(mount) AS n  FROM user WHERE mount = ?', [mount])
        .then(([rows]) => rows[0].n !== 0);
  }

  async generateUniqueMount(email: string): Promise<string> {
    const userNamePart = email.substring(0, email.indexOf('@'));
    if (userNamePart.length < 3) { // fallback to autogenerated.
      return `${genNextRandomUserMount()}`;
    }
    const mountFromEmail = userNamePart.toLocaleLowerCase().replace('.', '_'); //todo: improve this algorithm
    const duplicate = await this.hasUserWithMount(mountFromEmail);
    return duplicate ? genNextRandomUserMount() : mountFromEmail;
  }

  updateUserSettings(userId: string, userSettings: UserSettings): Promise<void> {
    const settingsWithoutMount = {...userSettings};
    delete settingsWithoutMount.mount;
    const settingsJson = JSON.stringify(settingsWithoutMount);
    return this.db.pool.promise()
        .query('UPDATE user SET settings = ?, mount = ? WHERE id = ?', [settingsJson, userSettings.mount, userId]);
  }

  getSettings(userId: string): Promise<UserSettings|undefined> {
    return this.db.pool.promise()
        .query('SELECT mount, settings FROM user WHERE id = ?', [userId])
        .then(([rows]: [{ mount: string, settings: string }[]]) =>
            rows.length === 0 || rows[0].settings.length === 0
                ? undefined
                : {...newDefaultUserSettings(), ...JSON.parse(rows[0].settings), mount: rows[0].mount}
        );
  }
}

let lastIdForMount = 0;

function genNextRandomUserMount(): string {
  const mount = Math.max(lastIdForMount + 1, Date.now());
  lastIdForMount = mount;
  return `${mount}`;
}
