import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {User, UserGroup} from '@common/user-model';
import {Response} from 'express';

import {Db, MongoClient, MongoClientOptions} from 'mongodb';
import {NODE_BB_COOKIE_DOMAIN, NODE_BB_SESSION_COOKIE, NODE_BB_URL} from '@common/constants';
import {CollectionDbi} from '@server/db/collection-dbi.service';
import {isValidId} from '@common/util/misc-utils';
import {UserDbi} from '@server/db/user-dbi.service';
import {map} from 'rxjs/operators';
import {getConfigFilePath} from '@server/util/server-config-utils';
import cookieParser = require('cookie-parser');

const USER_SESSION_KEY = 'user';

interface SsoServiceConfig {
  useTestUser: boolean,
  testUser?: User,
  sessionCookieSecret?: string,
  mongo?: {
    url: string,
    db: string,
    user: string,
    password: string,
  }
}

interface NodeUser {
  uid: string,
  username: string,
  email: string,
  picture: string,
  groupTitle?: string[],
}

const ssoConfig: SsoServiceConfig = require(getConfigFilePath('sso-config.json'));

@Injectable()
export class ServerSsoService implements NestInterceptor {

  private readonly logger = new Logger(ServerSsoService.name);

  private nodeDb?: Db;
  private readonly sessionCookieSecret?: string;
  private readonly useTestUser: boolean;
  private readonly testUser?: User;

  constructor(private readonly userDbi: UserDbi,
              private readonly collectionDbi: CollectionDbi,
  ) {
    this.useTestUser = ssoConfig.useTestUser;
    this.sessionCookieSecret = ssoConfig.sessionCookieSecret;
    if (ssoConfig.useTestUser) {
      this.testUser = ssoConfig.testUser;
      this.logger.warn(`Using test user: ${JSON.stringify(this.testUser)}`);
    } else {
      const mongo = ssoConfig.mongo;
      if (!mongo) {
        throw new Error('Mongo config is not defined!');
      }
      if (!this.sessionCookieSecret) {
        throw new Error('Session cookie secret is not set!');
      }
      //TODO: move DB initialization do a separate injectable service & handle connection errors correctly!
      const options: MongoClientOptions = {auth: {user: mongo.user, password: mongo.password}, useNewUrlParser: true};
      MongoClient.connect(mongo.url, options)
          .then(client => {
            this.logger.log('Successfully connected to MongoDB');
            this.nodeDb = client.db(mongo.db);
          })
          .catch(err => this.logger.error('Failed to initialize connection to MongoDB: ' + JSON.stringify(err)));
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const ssoSessionCookie = req.cookies[NODE_BB_SESSION_COOKIE];
    await this.processSessionCookie(req.session, ssoSessionCookie); //todo: handle errors correctly.
    // process request and append user session info to it.
    return next.handle().pipe(
        map(response => {
          if (Array.isArray(response)) { //todo: remove all array responses.
            return response;
          }
          const user = ServerSsoService.getUserOrUndefined(req.session);
          return {...response, session: {userId: user && user.id}};
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

  private async processSessionCookie(session: Express.Session, ssoCookie?: string): Promise<void> {
    let user: User|undefined;
    if (this.useTestUser) {
      user = this.testUser;
    } else {
      const ssoSessionId = ssoCookie ? cookieParser.signedCookie(ssoCookie, this.sessionCookieSecret!) : undefined;
      if (ssoSessionId) {
        user = await this.getUserFromSsoSession(ssoSessionId);
      }
    }
    if (!user) {
      delete session[USER_SESSION_KEY];
    } else {
      const userInSession = session[USER_SESSION_KEY];
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
      session[USER_SESSION_KEY] = user;
    }
  }

  private async getUserFromSsoSession(ssoSessionId: string): Promise<User|undefined> {
    const sessions = this.nodeDb!.collection('sessions');
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
    const objects = this.nodeDb!.collection('objects');
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
      picture: NODE_BB_URL + nodeUser.picture,
      groups,
      collectionId: -1,
    };
  }

  static logout(res: Response): void {
    res.clearCookie(NODE_BB_SESSION_COOKIE, {domain: NODE_BB_COOKIE_DOMAIN});
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
