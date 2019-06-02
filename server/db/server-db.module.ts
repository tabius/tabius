import {Module} from '@nestjs/common';
import {UserDbi} from './user-dbi.service';
import {SongDbi} from './song-dbi.service';
import {DbService} from './db.service';
import {ArtistDbi} from './artist-dbi.service';
import {PlaylistDbi} from './playlist-dbi.service';

@Module({
  providers: [UserDbi, SongDbi, ArtistDbi, PlaylistDbi, DbService],
  exports: [UserDbi, SongDbi, ArtistDbi, PlaylistDbi]
})
export class ServerDbModule {
}
