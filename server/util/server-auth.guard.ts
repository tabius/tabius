import {CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {Observable} from 'rxjs';
import * as admin from 'firebase-admin';
import {AUTH_TOKEN_COOKIE_NAME, User} from '@common/user-model';
import {decodedIdToken2User} from '@common/util/misc-utils';

const USER_SESSION_KEY = 'user';

@Injectable()
export class ServerAuthGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean|Promise<boolean>|Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const authToken = req.cookies[AUTH_TOKEN_COOKIE_NAME];
    if (authToken) {
      return admin.auth().verifyIdToken(authToken)
          .then((decodedToken: admin.auth.DecodedIdToken) => {
            req.session[USER_SESSION_KEY] = decodedIdToken2User(decodedToken);
            return true;
          });
    }
    delete req.session[USER_SESSION_KEY];
    throw new HttpException('No auth token provided.', HttpStatus.FORBIDDEN);
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
}
