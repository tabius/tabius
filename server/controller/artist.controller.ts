import {Controller, Get, Logger, Param} from '@nestjs/common';
import {Artist, ArtistDetails} from '@common/artist-model';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {stringToArrayOfNumericIds, stringToId} from '@server/util/validators';

@Controller('/api/artist')
export class ArtistController {
  private readonly logger = new Logger(ArtistController.name);

  constructor(private readonly artistDbi: ArtistDbi) {
  }

  /** Returns list of all 'listed' artists. */
  @Get('/all')
  getAllArtists(): Promise<Artist[]> {
    this.logger.log('all');
    return this.artistDbi.getAllArtists(true);
  }

  @Get('/by-ids/:ids')
  getArtistsByIds(@Param('ids') idsParam: string): Promise<Artist[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const artistIds = stringToArrayOfNumericIds(idsParam);
    return this.artistDbi.getArtistsByIds(artistIds);
  }

  @Get('/details-by-id/:id')
  getArtistDetailsById(@Param('id') id: string): Promise<ArtistDetails|undefined> {
    this.logger.log(`details-by-id: ${id}`);
    const artistId = stringToId(id);
    return this.artistDbi.getArtistDetails(artistId);
  }
}

