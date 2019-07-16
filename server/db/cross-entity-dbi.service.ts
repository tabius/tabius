import {Injectable} from '@nestjs/common';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {SongDbi} from '@server/db/song-dbi.service';
import {ArtistDetailsResponse} from '@common/ajax-model';
import {DbService} from '@server/db/db.service';

/** This is temp location for a complex reusable utility methods that use different database interfaces. */
@Injectable()
export class CrossEntityDbi {

  constructor(private readonly db: DbService, private readonly artistDbi: ArtistDbi, private readonly songDbi: SongDbi) {
  }

  getArtistDetailsResponse(artistId: number): Promise<ArtistDetailsResponse|undefined> {
    const artists$$ = this.artistDbi.getArtistsByIds([artistId]);
    const songs$$ = this.songDbi.getSongsByArtistIds([artistId]);
    return Promise.all([artists$$, songs$$])
        .then(([artists, songs]) => {
          const artist = artists[0];
          return artist === undefined ? undefined : {artist, songs};
        });
  }

  async deleteSongAndUpdateArtistVersion(songId: number, artistId: number): Promise<void> {
    await this.db.pool.promise().query('DELETE FROM song WHERE id = ?', [songId]);
    await this.db.pool.promise().query('UPDATE artist SET version = version + 1 WHERE id = ?', [artistId]);
  }

}
