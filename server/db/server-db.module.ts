import {HttpModule, Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {CollectionDbi} from './collection-dbi.service';
import {PlaylistDbi} from './playlist-dbi.service';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';
import {NodeBBService} from '@server/db/node-bb.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    CollectionDbi,
    DbService,
    FullTextSearchDbi,
    NodeBBService,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ],
  exports: [
    CollectionDbi,
    FullTextSearchDbi,
    NodeBBService,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ]
})
export class ServerDbModule {
}
