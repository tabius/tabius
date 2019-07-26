import {Controller, Get, Logger, Param} from '@nestjs/common';
import {Artist, ArtistDetails} from '@common/artist-model';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {isArtistMount, paramToArrayOfNumericIds, paramToId} from '@server/util/validators';

@Controller('/api/artist')
export class ArtistController {
  private readonly logger = new Logger(ArtistController.name);

  constructor(private readonly artistDbi: ArtistDbi) {
  }

  /** Returns list of all 'listed' artists. */
  @Get('/all-listed')
  getAllArtists(): Promise<Artist[]> {
    this.logger.log('all-listed');
    return this.artistDbi.getAllArtists(true);
  }

  /** Returns artist by mount. */
  @Get('/by-mount/:mount')
  getByMount(@Param('mount') mountParam: string): Promise<Artist|undefined> {
    this.logger.log('all');
    const vr = isArtistMount()(mountParam);
    if (!vr.success) {
      throw vr.toString();
    }
    return this.artistDbi.getByMount(mountParam);
  }

  @Get('/by-ids/:ids')
  getArtistsByIds(@Param('ids') idsParam: string): Promise<Artist[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const artistIds = paramToArrayOfNumericIds(idsParam);
    return this.artistDbi.getArtistsByIds(artistIds);
  }

  @Get('/details-by-id/:id')
  getArtistDetailsById(@Param('id') id: string): Promise<ArtistDetails|undefined> {
    this.logger.log(`details-by-id: ${id}`);
    const artistId = paramToId(id);
    return this.artistDbi.getArtistDetails(artistId);
  }
}

