import {Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {ArtistDbi} from './artist-dbi.service';
import {PlaylistDbi} from './playlist-dbi.service';
import {CrossEntityDbi} from '@server/db/cross-entity-dbi.service';

@Module({
  providers: [UserDbi, SongDbi, ArtistDbi, PlaylistDbi, CrossEntityDbi, DbService],
  exports: [UserDbi, SongDbi, ArtistDbi, PlaylistDbi, CrossEntityDbi]
})
export class ServerDbModule {
}
