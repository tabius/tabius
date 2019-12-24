import {Injectable, Logger} from '@nestjs/common';
import {createPool, Pool} from 'mysql2';
import {SERVER_CONFIG} from '@server/util/server-config';

@Injectable()
export class DbService {

  private readonly logger = new Logger(DbService.name);

  public pool: Pool;

  constructor() {
    const dbConfig = SERVER_CONFIG.dbConfig;
    this.logger.log(`Connecting to database: ${dbConfig.database}`);
    this.pool = createPool(dbConfig);
  }

}
