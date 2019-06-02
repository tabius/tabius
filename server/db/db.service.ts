import {Injectable} from '@nestjs/common';
import {createPool, Pool} from 'mysql2';
import {readDbConfig} from '@server/db/db-config';

@Injectable()
export class DbService {

  public pool: Pool;

  constructor() {
    const dbConfig = readDbConfig();
    this.pool = createPool(dbConfig);
  }

}
