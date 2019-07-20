import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {User, UserGroup} from '@common/user-model';
import {Response} from 'express';

import {Db, MongoClient, MongoClientOptions} from 'mongodb';
import {NODE_BB_COOKIE_DOMAIN, NODE_BB_SESSION_COOKIE, NODE_BB_URL} from '@common/constants';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {isValidId} from '@common/util/misc-utils';
import {UserDbi} from '@server/db/user-dbi.service';
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
  groupTitle: string[],
}

const ssoConfig: SsoServiceConfig = require('/opt/tabius/sso-config.json');

@Injectable()
export class ServerSsoService implements NestInterceptor {

  private readonly logger = new Logger(ServerSsoService.name);

  private nodeDb?: Db;
  private readonly sessionCookieSecret?: string;
  private readonly useTestUser: boolean;
  private readonly testUser?: User;

  constructor(private readonly userDbi: UserDbi,
              private readonly artistDbi: ArtistDbi,
  ) {
    this.useTestUser = ssoConfig.useTestUser;
    this.sessionCookieSecret = ssoConfig.sessionCookieSecret;
    if (ssoConfig.useTestUser) {
      this.testUser = ssoConfig.testUser;
      this.logger.warn(`Using test user: ${JSON.stringify(this.testUser)}`);
    } else {
      const mongo = ssoConfig.mongo;
      if (!mongo) {
        throw 'Mongo config is not defined!';
      }
      if (!this.sessionCookieSecret) {
        throw 'Session cookie secret is not set!';
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
    return next.handle();
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

  private async processSessionCookie(session: Express.SessionData, ssoCookie?: string): Promise<void> {
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
    if (nodeUser.groupTitle.includes('Global Moderators') || nodeUser.uid === '1') {
      groups.push(UserGroup.Moderator);
    }

    let user: User = {
      id: nodeUser.uid,
      username: nodeUser.username,
      email: nodeUser.email,
      picture: NODE_BB_URL + nodeUser.picture,
      groups,
      artistId: await this.getUserArtistId(nodeUser.uid) || -1,
    };

    if (!isValidId(user.artistId)) {
      const artistId = await this.artistDbi.createArtistForUser(user);
      user = {...user, artistId};
      await this.userDbi.createUser(user);
    }
    return user;
  }

  static logout(res: Response): void {
    res.clearCookie(NODE_BB_SESSION_COOKIE, {domain: NODE_BB_COOKIE_DOMAIN});
  }

  /** This mapping is immutable, so it is safe to cache */
  private readonly userIdToArtistIdCache = new Map<string, number>();

  private async getUserArtistId(userId: string): Promise<number|undefined> {
    let artistId = this.userIdToArtistIdCache.get(userId);
    if (isValidId(artistId)) {
      return artistId;
    }
    artistId = await this.userDbi.getUserArtistId(userId);
    if (isValidId(artistId)) {
      this.userIdToArtistIdCache.set(userId, artistId);
    }
    return artistId;
  }
}
