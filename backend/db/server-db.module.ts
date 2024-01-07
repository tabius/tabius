import { Module } from '@nestjs/common';
import { UserDbi } from './user-dbi.service';
import { SongDbi } from './song-dbi.service';
import { DbService } from './db.service';
import { CollectionDbi } from './collection-dbi.service';
import { FullTextSearchDbi } from '../db/full-text-search-dbi.service';
import { ServerAuthService } from '../service/server-auth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [CollectionDbi, DbService, FullTextSearchDbi, ServerAuthService, SongDbi, UserDbi],
  exports: [CollectionDbi, FullTextSearchDbi, ServerAuthService, SongDbi, UserDbi],
})
export class ServerDbModule {}
