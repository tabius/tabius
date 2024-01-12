import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '@common/user-model';
import { CollectionDbi } from '../db/collection-dbi.service';
import { isValidId } from '@common/util/misc-utils';
import { UserDbi } from '../db/user-dbi.service';
import { AUTH0_WEB_CLIENT_AUDIENCE, INVALID_ID } from '@common/common-constants';
import * as Express from 'express-session';
import { AuthenticationClient, AuthenticationClientOptions } from 'auth0';
import { SERVER_CONFIG } from '../server-config';
import { Mutex } from 'async-mutex';
import { nanoid } from 'nanoid';

import { JwtRsaVerifier } from 'aws-jwt-verify';
import { JwtRsaVerifierProperties } from 'aws-jwt-verify/jwt-rsa';
import { truthy } from 'assertic';

const USER_SESSION_KEY = 'user';

let auth0ClientOptions: AuthenticationClientOptions = {
  domain: SERVER_CONFIG.auth.domain,
  clientId: SERVER_CONFIG.auth.clientId,
};
const auth0 = new AuthenticationClient(auth0ClientOptions);

interface Auth0UserProfile {
  sub: string;
  email: string;
  picture: string;
  nickname: string;
}

interface Auth0JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  aud: string[];
  azp: string;
  scope: string;
}

type Auth0JwtVerifier = JwtRsaVerifier<object, JwtRsaVerifierProperties<object>, boolean>;

@Injectable()
export class ServerAuthService implements NestInterceptor {
  private readonly jwtVerifier: Auth0JwtVerifier;

  constructor(private readonly userDbi: UserDbi, private readonly collectionDbi: CollectionDbi) {
    const domain = SERVER_CONFIG.auth.domain;
    this.jwtVerifier = JwtRsaVerifier.create({
      issuer: `https://${domain}/`,
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      audience: AUTH0_WEB_CLIENT_AUDIENCE,
    });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    // TODO: validate input data.

    let userIdFromAccessToken: string | undefined = undefined;

    let accessToken = req.headers['authorization']?.split(' ')[1];
    if (accessToken) {
      try {
        const jwtPayload = (await this.jwtVerifier.verify(accessToken)) as unknown as Auth0JwtPayload;
        userIdFromAccessToken = truthy(jwtPayload.sub, () => `Auth0JwtPayload has no sub: ${JSON.stringify(jwtPayload)}`);
        console.log(`Found user id in access token: ${userIdFromAccessToken}`);
      } catch (e) {
        console.log('Got bad access token. Access token is set to undefined!', accessToken, e);
        accessToken = undefined;
      }
    }

    console.log(`ServerAuthService[${req.path}] user: ${userIdFromAccessToken}, has token: ${!!accessToken}`);

    // Check if the current session is still valid for the user saved in the session.
    let user: User | undefined = req.session[USER_SESSION_KEY];
    if (user?.id !== userIdFromAccessToken) {
      console.log('Access token in session does not match access token in request. Resetting.');
      req.session[USER_SESSION_KEY] = undefined;
      user = undefined;
    }

    if (!user && userIdFromAccessToken) {
      const auth0Profile: Auth0UserProfile | undefined = await this.getAuth0UserProfileWithMutex(userIdFromAccessToken, accessToken);
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
      console.debug(`ServerAuthService.intercept: Found user in session: ${user.email}`);
    }
    if (user) {
      if (!isValidId(user.collectionId)) {
        // First auth service interception in the session: create or populate cached user structure.
        user.collectionId = (await this.getUserCollectionId(user.id)) || 0;
        if (!isValidId(user.collectionId)) {
          user.mount = nanoid(8);
          user.collectionId = await this.collectionDbi.createPrimaryUserCollection(user);
          await this.userDbi.createUser(user);
        } else {
          console.log('ServerAuthService.intercept: Filling user properties: ', user);
          user.mount = truthy(await this.userDbi.getUserMount(user.id));
          user.roles = truthy(await this.userDbi.getUserRoles(user.id));
        }
      }
      req.session[USER_SESSION_KEY] = user;
    } else {
      req.session[USER_SESSION_KEY] = undefined;
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

  static getUserOrUndefined(session: Express.Session): User | undefined {
    return session[USER_SESSION_KEY];
  }

  /** This mapping is immutable, so it is safe to cache */
  private readonly userIdToCollectionIdCache = new Map<string, number>();

  private async getUserCollectionId(userId: string): Promise<number | undefined> {
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

  private async getAuth0UserProfileWithMutex(userId: string, accessToken: string): Promise<Auth0UserProfile | undefined> {
    const cachedAuth0Profile1 = auth0ProfileByUserId.get(userId);
    console.debug(`ServerAuthService.getAuth0UserProfileWithMutex: Using cached info: ${!!cachedAuth0Profile1}`);
    if (cachedAuth0Profile1 || cachedAuth0Profile1 === null) {
      return cachedAuth0Profile1 || undefined;
    }
    const mutex = auth0MutexByUserId.get(userId) || new Mutex();
    auth0MutexByUserId.set(userId, mutex);
    return mutex.runExclusive(async () => {
      // Run DCL first.
      const cachedAuth0Profile2 = auth0ProfileByUserId.get(userId);
      if (cachedAuth0Profile2 !== undefined) {
        console.debug(
          `ServerAuthService.getAuth0UserProfileWithMutex: Found auth0 user profile info in cache after double checking`,
        );
        return cachedAuth0Profile2;
      }
      console.log('ServerAuthService.getAuth0UserProfileWithMutex: Fetching user profile from auth0 server');
      const auth0Profile = await auth0.getProfile(accessToken);
      auth0ProfileByUserId.set(userId, auth0Profile);
      return auth0Profile;
    });
  }
}

/**
 * Short living cache to handle multiple API-requests that require auth during web application startup in browser.
 * Once cached, the user information must be available from the request.session.
 */
const auth0ProfileByUserId = new Map<string, Auth0UserProfile | null>();
setInterval(() => auth0ProfileByUserId.clear(), 15_000);

/** Used to avoid running parallel requests to auth0 by the same access token. */
const auth0MutexByUserId = new Map<string, Mutex>();
