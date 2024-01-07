import { Injectable } from '@nestjs/common';
import { createPool, Pool } from 'mysql2';
import { SERVER_CONFIG } from '../server-config';

@Injectable()
export class DbService {
  public readonly pool: Pool;

  constructor() {
    const dbConfig = SERVER_CONFIG.dbConfig;
    console.log('DbService: connecting to database:', dbConfig.database);
    this.pool = createPool(dbConfig);
  }
}
