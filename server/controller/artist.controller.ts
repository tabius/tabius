import {Controller, Get, HttpException, HttpStatus, Logger, Param} from '@nestjs/common';
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
  async getByMount(@Param('mount') mountParam: string): Promise<Artist> {
    this.logger.log(`by-mount: ${mountParam}`);
    const vr = isArtistMount()(mountParam);
    if (!vr.success) {
      throw vr.toString();
    }
    const artist = await this.artistDbi.getByMount(mountParam);
    if (!artist) {
      throw new HttpException(`Artist is not found ${mountParam}`, HttpStatus.NOT_FOUND);
    }
    return artist;
  }

  @Get('/by-ids/:ids')
  getArtistsByIds(@Param('ids') idsParam: string): Promise<Artist[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const artistIds = paramToArrayOfNumericIds(idsParam);
    return this.artistDbi.getArtistsByIds(artistIds);
  }

  @Get('/details-by-id/:id')
  async getArtistDetailsById(@Param('id') idParam: string): Promise<ArtistDetails> {
    this.logger.log(`details-by-id: ${idParam}`);
    const artistId = paramToId(idParam);
    const details = await this.artistDbi.getArtistDetails(artistId);
    if (!details) {
      throw new HttpException(`Artist is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    return details;
  }
}

