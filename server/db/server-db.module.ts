import {HttpModule, Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {ArtistDbi} from './artist-dbi.service';
import {PlaylistDbi} from './playlist-dbi.service';
import {FullTextSearchDbi} from '@server/db/full-text-search-dbi.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    ArtistDbi,
    DbService,
    FullTextSearchDbi,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ],
  exports: [
    ArtistDbi,
    FullTextSearchDbi,
    PlaylistDbi,
    SongDbi,
    UserDbi,
  ]
})
export class ServerDbModule {
}
