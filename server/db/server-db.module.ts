import {HttpModule, Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {CollectionDbi} from './collection-dbi.service';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';
import {ServerAuthService} from '@server/service/server-auth.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    CollectionDbi,
    DbService,
    FullTextSearchDbi,
    ServerAuthService,
    SongDbi,
    UserDbi,
  ],
  exports: [
    CollectionDbi,
    FullTextSearchDbi,
    ServerAuthService,
    SongDbi,
    UserDbi,
  ]
})
export class ServerDbModule {
}
