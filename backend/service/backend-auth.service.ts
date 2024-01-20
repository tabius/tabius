import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '@common/user-model';
import { CollectionDbi } from '../db/collection-dbi.service';
import { isValidId } from '@common/util/misc-utils';
import { UserDbi } from '../db/user-dbi.service';
import { AUTH0_WEB_CLIENT_AUDIENCE, INVALID_ID } from '@common/common-constants';
import * as Express from 'express-session';
import { SERVER_CONFIG } from '../backend-config';
import { nanoid } from 'nanoid';

import { JwtRsaVerifier } from 'aws-jwt-verify';
import { JwtRsaVerifierProperties } from 'aws-jwt-verify/jwt-rsa';
import { truthy } from 'assertic';

const USER_SESSION_KEY = 'user';

interface Auth0JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  aud: string[];
  azp: string;
  scope: string;
  // Custom fields added to AT by tabius actions in Auth0 login flow.
  email: string;
}

type Auth0JwtVerifier = JwtRsaVerifier<object, JwtRsaVerifierProperties<object>, boolean>;

@Injectable()
export class BackendAuthService implements NestInterceptor {
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
    let userEmailFromAccessToken: string | undefined = undefined;

    let accessToken = req.headers['authorization']?.split(' ')[1];
    if (accessToken) {
      try {
        const jwtPayload = (await this.jwtVerifier.verify(accessToken)) as unknown as Auth0JwtPayload;
        userIdFromAccessToken = truthy(jwtPayload.sub, () => `Auth0JwtPayload has no sub: ${JSON.stringify(jwtPayload)}`);
        userEmailFromAccessToken = truthy(jwtPayload.email, () => `Auth0JwtPayload has no email: ${JSON.stringify(jwtPayload)}`);
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
      console.log('User id from session does not match user id from request access token. Resetting.');
      req.session[USER_SESSION_KEY] = undefined;
      user = undefined;
    }

    if (!user && userIdFromAccessToken && userEmailFromAccessToken) {
      user = {
        id: userIdFromAccessToken,
        email: userEmailFromAccessToken,
        collectionId: INVALID_ID,
        roles: [],
        mount: '',
      };
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
}
