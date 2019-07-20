import {Controller, Get, Logger, Param} from '@nestjs/common';
import {Artist} from '@common/artist-model';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {ArtistDetailsResponse} from '@common/ajax-model';
import {stringToArrayOfNumericIds} from '@server/util/validators';
import {CrossEntityDbi} from '@server/db/cross-entity-dbi.service';

@Controller('/api/artist')
export class ArtistController {
  private readonly logger = new Logger(ArtistController.name);

  constructor(private readonly artistDbi: ArtistDbi, private readonly crossDbi: CrossEntityDbi) {
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
  getArtistDetailsById(@Param('id') id: string): Promise<ArtistDetailsResponse|undefined> {
    this.logger.log(`details-by-id: ${id}`);
    const artistIds = stringToArrayOfNumericIds(id);
    if (artistIds.length != 1) {
      throw `Expecting only 1 artist id as input: ${id}`;
    }
    return this.crossDbi.getArtistDetailsResponse(artistIds[0]);
  }
}

