import {HttpModule, Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {ArtistDbi} from './artist-dbi.service';
import {PlaylistDbi} from './playlist-dbi.service';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';
import {NodeBBService} from '@server/db/node-bb.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    ArtistDbi,
    DbService,
    FullTextSearchDbi,
    NodeBBService,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ],
  exports: [
    ArtistDbi,
    FullTextSearchDbi,
    NodeBBService,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ]
})
export class ServerDbModule {
}
