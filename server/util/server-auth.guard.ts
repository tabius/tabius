import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Observable} from 'rxjs';

//TODO: remove this class or implement/use properly.
@Injectable()
export class ServerAuthGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean|Promise<boolean>|Observable<boolean> {
    return true;
  }
}
