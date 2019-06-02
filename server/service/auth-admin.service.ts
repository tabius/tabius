import {Injectable} from '@nestjs/common';
import * as admin from 'firebase-admin';

const serviceAccount = require('/opt/tabius/tabius-firebase-admin.json');

@Injectable()
export class AuthAdminService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      //todo: duplicated in FIREBASE_CLIENT_CONFIG
      databaseURL: 'https://tabius-ru.firebaseio.com'
    });
  }
}
