import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {User, UserGroup} from '@common/user-model';
import {Response} from 'express';

import {Db, MongoClient, MongoClientOptions} from 'mongodb';
import {CollectionDbi} from '@server/db/collection-dbi.service';
import {isValidId} from '@common/util/misc-utils';
import {UserDbi} from '@server/db/user-dbi.service';
import {map} from 'rxjs/operators';
import {SERVER_CONFIG} from '@server/server-config';
import cookieParser = require('cookie-parser');

const USER_SESSION_KEY = 'user';

type SsoMode = 'nodebb'|'mock-user'|'mock-no-user'

interface SsoServiceConfig {
  mode: SsoMode,
  value: NodeBbSsoConfig|MockUserSsoConfig;
}

interface MockUserSsoConfig extends User {
}

interface NodeBbSsoConfig {
  cookieName: string;
  cookieSecret: string;
  cookieDomain: string
  mongo: {
    url: string;
    db: string;
    user: string;
    password: string;
  },
}

interface NodeUser {
  uid: string,
  username: string,
  email: string,
  picture: string,
  groupTitle?: string[],
}

@Injectable()
export class ServerSsoService implements NestInterceptor {

  private readonly logger = new Logger(ServerSsoService.name);

  private mongoDb?: Db;
  private readonly mockUser?: MockUserSsoConfig;
  private readonly ssoConfig?: NodeBbSsoConfig;
  private readonly ssoMode!: SsoMode;

  constructor(private readonly userDbi: UserDbi,
              private readonly collectionDbi: CollectionDbi,
  ) {
    const {mode, value} = SERVER_CONFIG.ssoConfig as SsoServiceConfig;
    this.ssoMode = mode;
    if (mode === 'mock-user') {
      this.mockUser = value as MockUserSsoConfig;
      this.logger.warn(`Using test user: ${JSON.stringify(this.mockUser)}`);
    } else if (mode === 'mock-no-user') {
      this.logger.warn(`Using anonymous user account`);
    } else {
      this.ssoConfig = value as NodeBbSsoConfig;
      const {mongo} = this.ssoConfig;
      //TODO: move DB initialization do a separate injectable service & handle connection errors correctly!
      const options: MongoClientOptions = {
        auth: {
          user: mongo.user,
          password: mongo.password,
        },
        useNewUrlParser: true,
        reconnectTries: Number.MAX_VALUE,
      };
      MongoClient.connect(mongo.url, options)
          .then(client => {
            this.logger.log('Successfully connected to MongoDB');
            this.mongoDb = client.db(mongo.db);
          })
          .catch(err => this.logger.error(`Failed to initialize connection to MongoDB: ${JSON.stringify(err)}`));
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    let user = this.mockUser;
    if (this.ssoMode === 'nodebb') {
      const ssoConfig = this.ssoConfig!;
      const nodeBbSessionCookie = req.cookies[ssoConfig.cookieName];
      const ssoSessionId = nodeBbSessionCookie ? cookieParser.signedCookie(nodeBbSessionCookie, ssoConfig.cookieSecret) : undefined;
      if (ssoSessionId) {
        user = await this.getUserFromSsoSession(ssoSessionId);
      }
    }
    if (user) {
      const userInSession = (req.session)[USER_SESSION_KEY];
      if (userInSession && userInSession.id === user.id) {
        user = {...user, collectionId: userInSession.collectionId};
      } else {
        user = {...user, collectionId: await this.getUserCollectionId(user.id) || -1};
      }
      if (!isValidId(user.collectionId)) {
        const collectionId = await this.collectionDbi.createPrimaryUserCollection(user);
        user = {...user, collectionId};
        await this.userDbi.createUser(user);
      }
      (req.session)[USER_SESSION_KEY] = user;
    } else {
      delete (req.session)[USER_SESSION_KEY];
    }  //todo: handle errors correctly.

    // process request and append user session info to it.
    return next.handle().pipe(
        map(originalResponse => {
          const user = ServerSsoService.getUserOrUndefined(req.session);
          return {payload: originalResponse, session: {userId: user && user.id}};
        })
    );
  }

  static getUserOrFail(session: Express.Session): User {
    const user = session[USER_SESSION_KEY];
    if (!user) {
      throw new HttpException('Session has no user data', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  static getUserOrUndefined(session: Express.Session): User|undefined {
    return session[USER_SESSION_KEY];
  }

  private async getUserFromSsoSession(ssoSessionId: string): Promise<User|undefined> {
    const sessions = this.mongoDb!.collection('sessions');
    const sessionRecord = await sessions.findOne({_id: ssoSessionId});
    if (!sessionRecord) {
      this.logger.debug(`No SSO session found: ${ssoSessionId}`);
      return;
    }
    const session = JSON.parse(sessionRecord.session);
    const expirationDateMillis = Date.parse(session.cookie.expires);
    if (expirationDateMillis < Date.now()) {
      this.logger.debug(`SSO session is expired: ${ssoSessionId}`);
      return;
    }
    const passport = session.passport;
    if (!passport) {
      this.logger.debug(`SSO session has no passport: ${ssoSessionId}`);
      return;
    }
    const objects = this.mongoDb!.collection('objects');
    const userKey = `user:${passport.user}`;
    const nodeUser: NodeUser|undefined|null = await objects.findOne({_key: userKey});
    if (!nodeUser) {
      this.logger.error(`User is not found for SSO session: ${JSON.stringify(session)}`);
      return;
    }
    this.logger.debug(`Found valid user for SSO session: ${ssoSessionId}, user: ${nodeUser.username}/${nodeUser.email}`);
    const groups: UserGroup[] = [];
    const nodeGroups = nodeUser.groupTitle || [];
    if (nodeGroups.includes('Global Moderators') || nodeUser.uid === '1') {
      groups.push(UserGroup.Moderator);
    }

    return {
      id: nodeUser.uid,
      username: nodeUser.username,
      email: nodeUser.email,
      picture: nodeUser.picture || '',
      groups,
      collectionId: -1,
    };
  }

  logout(res: Response): void {
    if (this.ssoConfig) {
      res.clearCookie(this.ssoConfig.cookieName, {domain: this.ssoConfig.cookieDomain});
    }
  }

  /** This mapping is immutable, so it is safe to cache */
  private readonly userIdToCollectionIdCache = new Map<string, number>();

  private async getUserCollectionId(userId: string): Promise<number|undefined> {
    let collectionId = this.userIdToCollectionIdCache.get(userId);
    if (isValidId(collectionId)) {
      return collectionId;
    }
    collectionId = await this.userDbi.getUserCollectionId(userId);
    if (isValidId(collectionId)) {
      this.userIdToCollectionIdCache.set(userId, collectionId);
    }
    return collectionId;
  }
}
