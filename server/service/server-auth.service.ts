import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {User} from '@common/user-model';
import {CollectionDbi} from '@server/db/collection-dbi.service';
import {isValidId, truthy} from '@common/util/misc-utils';
import {UserDbi} from '@server/db/user-dbi.service';
import {INVALID_ID} from '@common/common-constants';
import * as Express from 'express-session';
import {AuthenticationClient} from 'auth0';
import {SERVER_CONFIG} from '@server/server-config';
import {Mutex} from 'async-mutex';
import {nanoid} from 'nanoid';

const USER_SESSION_KEY = 'user';

const auth0 = new AuthenticationClient({
  domain: SERVER_CONFIG.auth.domain,
  clientId: SERVER_CONFIG.auth.clientId,
});

interface Auth0UserProfile {
  sub: string;
  email: string;
  picture: string;
  nickname: string;
}

@Injectable()
export class ServerAuthService implements NestInterceptor {

  private readonly logger = new Logger(ServerAuthService.name);

  constructor(private readonly userDbi: UserDbi,
              private readonly collectionDbi: CollectionDbi,
  ) {
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const accessToken = req.headers['authorization']?.split(' ')[1];
    let user: User|undefined = req.session[USER_SESSION_KEY];
    if (!user && accessToken) {
      const auth0Profile: Auth0UserProfile|undefined = await this.getAuth0UserProfileWithMutex(accessToken);
      if (auth0Profile) {
        user = {
          id: auth0Profile.sub,
          email: auth0Profile.email,
          picture: auth0Profile.picture,
          nickname: auth0Profile.nickname,
          collectionId: INVALID_ID,
          roles: [],
          mount: '',
        };
      }
    } else if (user) {
      this.logger.debug(`ServerAuthService: found user in session: ${user.email}`);
    }
    if (user) {
      if (!isValidId(user.collectionId)) {
        user.collectionId = await this.getUserCollectionId(user.id) || 0;
        if (!isValidId(user.collectionId)) {
          user.collectionId = await this.collectionDbi.createPrimaryUserCollection(user);
          user.mount = nanoid(8);
          this.logger.log(`Creating new user: ${user.email}`);
          await this.userDbi.createUser(user);
        } else {
          user.mount = truthy(await this.userDbi.getUserMount(user.id));
          user.roles = truthy(await this.userDbi.getUserRoles(user.id));
        }
      }
      (req.session)[USER_SESSION_KEY] = user;
    } else {
      delete (req.session)[USER_SESSION_KEY];
    }
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

  private async getAuth0UserProfileWithMutex(accessToken: string): Promise<Auth0UserProfile|undefined> {
    const cachedAuth0Profile1 = auth0ProfileByAccessToken.get(accessToken);
    this.logger.debug(`getAuth0UserProfileWithMutex: Using cached info: ${!!cachedAuth0Profile1}`);
    if (cachedAuth0Profile1 || cachedAuth0Profile1 === null) {
      return cachedAuth0Profile1 || undefined;
    }
    const mutex = auth0MutexByAccessToken.get(accessToken) || new Mutex();
    auth0MutexByAccessToken.set(accessToken, mutex);
    return mutex.runExclusive(async () => {
      // Run DCL first.
      const cachedAuth0Profile2 = auth0ProfileByAccessToken.get(accessToken);
      if (cachedAuth0Profile2 !== undefined) {
        this.logger.debug(`getAuth0UserProfileWithMutex: Found auth0 user profile info in cache after double checking`);
        return cachedAuth0Profile2;
      }
      this.logger.log('getAuth0UserProfileWithMutex: Fetching user profile from auth0 server');
      const auth0Profile = await auth0.getProfile(accessToken);
      auth0ProfileByAccessToken.set(accessToken, auth0Profile);
      return auth0Profile;
    });
  }
}

/**
 * Short living cache to handle multiple API-requests that require auth during web application startup in browser.
 * Once cached the user information must be available from the request.session.
 */
const auth0ProfileByAccessToken = new Map<string, Auth0UserProfile|null>();
setInterval(() => auth0ProfileByAccessToken.clear(), 15_000);

/** Used to avoid running parallel requests to auth0 by the same access token. */
const auth0MutexByAccessToken = new Map<string, Mutex>();
