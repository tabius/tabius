import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {User} from '@common/user-model';

import {Db, MongoClient, MongoClientOptions} from 'mongodb';
import {NODE_BB_SESSION_COOKIE} from '@common/constants';
import cookieParser = require('cookie-parser');

const USER_SESSION_KEY = 'user';

interface SsoServiceConfig {
  useTestUser: boolean,
  testUser?: {
    id: string,
    name: string,
    email: string,
    picture: string,
  },
  sessionCookieSecret?: string,
  mongo?: {
    url: string,
    db: string,
    user: string,
    password: string,
  }
}

const ssoConfig: SsoServiceConfig = require('/opt/tabius/sso-config.json');

@Injectable()
export class ServerSsoService implements NestInterceptor {

  private readonly logger = new Logger(ServerSsoService.name);

  private db?: Db;
  private readonly sessionCookieSecret?: string;
  private readonly useTestUser: boolean;
  private readonly testUser?: User;

  constructor() {
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
            this.db = client.db(mongo.db);
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
    const sessions = this.db!.collection('sessions');
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
    const objects = this.db!.collection('objects');
    const userKey = `user:${passport.user}`;
    const user = await objects.findOne({_key: userKey});
    if (!user) {
      this.logger.error(`User is not found for SSO session: ${JSON.stringify(session)}`);
      return;
    }
    this.logger.debug(`Found valid user for SSO session: ${ssoSessionId}, user: ${user.username}/${user.email}`);
    return {
      id: user.uid,
      name: user.username,
      email: user.email,
      picture: user.picture,
    };
  }
}
