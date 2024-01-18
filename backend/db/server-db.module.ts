import { Module } from '@nestjs/common';
import { UserDbi } from './user-dbi.service';
import { SongDbi } from './song-dbi.service';
import { DbService } from './db.service';
import { CollectionDbi } from './collection-dbi.service';
import { FullTextSearchDbi } from '../db/full-text-search-dbi.service';
import { BackendAuthService } from '../service/backend-auth.service';

@Module({
  imports: [],
  providers: [CollectionDbi, DbService, FullTextSearchDbi, BackendAuthService, SongDbi, UserDbi],
  exports: [CollectionDbi, FullTextSearchDbi, BackendAuthService, SongDbi, UserDbi],
})
export class ServerDbModule {}
