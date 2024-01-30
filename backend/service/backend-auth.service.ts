import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '@common/user-model';
import { CollectionDbi } from '../db/collection-dbi.service';
import { isValidId } from '@common/util/misc-utils';
import { UserDbi } from '../db/user-dbi.service';
import { AUTH0_WEB_CLIENT_AUDIENCE, INVALID_ID } from '@common/common-constants';
import { SERVER_CONFIG } from '../backend-config';
import { nanoid } from 'nanoid';

import { JwtRsaVerifier } from 'aws-jwt-verify';
import { JwtRsaVerifierProperties } from 'aws-jwt-verify/jwt-rsa';
import { truthy } from 'assertic';

const TABIUS_REQUEST_DATA_FIELD_NAME = '_tabius';

interface TabiusRequestData {
  user: User | undefined;
}

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

  constructor(
    private readonly userDbi: UserDbi,
    private readonly collectionDbi: CollectionDbi,
  ) {
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
    let user: User | undefined;
    if (accessToken) {
      try {
        const jwtPayload = (await this.jwtVerifier.verify(accessToken)) as unknown as Auth0JwtPayload;
        userIdFromAccessToken = truthy(jwtPayload.sub, () => `Auth0JwtPayload has no sub: ${JSON.stringify(jwtPayload)}`);
        userEmailFromAccessToken = truthy(jwtPayload.email, () => `Auth0JwtPayload has no email: ${JSON.stringify(jwtPayload)}`);
        user = {
          id: userIdFromAccessToken,
          email: userEmailFromAccessToken,
          collectionId: INVALID_ID,
          roles: [],
          mount: '',
        };
        console.log(`Found user id in access token: ${userIdFromAccessToken}`);
      } catch (e) {
        console.log('Got bad access token. Access token is set to undefined!', accessToken, e);
        accessToken = undefined;
      }
    }

    console.log(`ServerAuthService[${req.path}] user: ${userIdFromAccessToken}, has token: ${!!accessToken}`);

    if (user) {
      if (!isValidId(user.collectionId)) {
        // TODO: optimize using `frescas` package.
        user.collectionId = (await this.getUserCollectionId(user.id)) || 0;
        if (!isValidId(user.collectionId)) {
          user.mount = nanoid(8);
          user.collectionId = await this.collectionDbi.createPrimaryUserCollection(user);
          await this.userDbi.createUser(user);
        } else {
          user.mount = truthy(await this.userDbi.getUserMount(user.id));
          user.roles = truthy(await this.userDbi.getUserRoles(user.id));
        }
      }
    }
    req[TABIUS_REQUEST_DATA_FIELD_NAME] = { user };
    return next.handle();
  }

  static getUserOrFail(request: Express.Request): User {
    const user = BackendAuthService.getUserOrUndefined(request);
    if (!user) {
      throw new HttpException('Request has no user data', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  static getUserOrUndefined(request: Express.Request): User | undefined {
    const { user } = (request[TABIUS_REQUEST_DATA_FIELD_NAME] || {}) as TabiusRequestData;
    return user;
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
