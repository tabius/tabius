import {Controller, Get, Logger, Param} from '@nestjs/common';
import {Artist} from '@common/artist-model';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {SongDbi} from '@server/db/song-dbi.service';
import {ArtistDetailsResponse} from '@common/ajax-model';

@Controller('/api/artist')
export class ArtistController {
  private readonly logger = new Logger(ArtistController.name);

  constructor(private readonly artistDbi: ArtistDbi, private readonly songsDbi: SongDbi) {
  }

  @Get('/all')
  getAllArtists(): Promise<Artist[]> {
    this.logger.log('all');
    return this.artistDbi.getAllArtists();
  }

  @Get('/by-ids/:ids')
  getArtistsByIds(@Param('ids') idsParam: string): Promise<(Artist)[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = idsParam.split(',').map(id => +id);
    return this.artistDbi.getArtistsByIds(ids);
  }

  @Get('/details-by-id/:id')
  getArtistDetailsById(@Param('id') id: string): Promise<ArtistDetailsResponse|undefined> {
    this.logger.log(`details-by-id: ${id}`);
    const ids = [+id];
    const artists$$ = this.artistDbi.getArtistsByIds(ids);
    const songs$$ = this.songsDbi.getSongsByArtistIds(ids);
    return Promise.all([artists$$, songs$$])
        .then(([artists, songs]) => {
          const artist = artists[0];
          return artist === undefined ? undefined : {artist, songs};
        });
  }
}
