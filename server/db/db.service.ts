import {Injectable, Logger} from '@nestjs/common';
import {createPool, Pool} from 'mysql2';
import {readDbConfig} from '@server/db/db-config';

@Injectable()
export class DbService {

  private readonly logger = new Logger(DbService.name);

  public pool: Pool;

  constructor() {
    const dbConfig = readDbConfig();
    this.logger.log(`Connecting to database: ${dbConfig.database}`);
    this.pool = createPool(dbConfig);
  }

}
