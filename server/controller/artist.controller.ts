import {Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Post, Session} from '@nestjs/common';
import {Artist, ArtistDetails} from '@common/artist-model';
import {ArtistDbi} from '@server/db/artist-dbi.service';
import {CreateArtistRequestValidator, isArtistMount, paramToArrayOfNumericIds, paramToId} from '@server/util/validators';
import {CreateArtistRequest, CreateArtistResponse} from '@common/ajax-model';
import {User, UserGroup} from '@common/user-model';
import {ServerSsoService} from '@server/service/server-sso.service';
import {conformsTo, validate} from 'typed-validation';

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
      throw new HttpException(vr.toString(), HttpStatus.BAD_REQUEST);
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

  @Post()
  async createArtist(@Session() session, @Body() request: CreateArtistRequest): Promise<CreateArtistResponse> {
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    this.logger.log(`create-artist: ${request.name}, ${request.mount}`);
    const vr1 = validate(request, conformsTo(CreateArtistRequestValidator));
    if (!vr1.success) {
      throw new HttpException(vr1.toString(), HttpStatus.BAD_REQUEST);
    }

    const existingArtist = await this.artistDbi.getByMount(request.mount);
    if (existingArtist) {
      throw new HttpException(`Artist already exists: ${request.mount}`, HttpStatus.BAD_REQUEST);
    }
    const artistId = await this.artistDbi.createArtist(request.name, request.mount, request.type);
    if (artistId <= 0) {
      this.logger.error(`Failed to create artist: ${request.name}, ${request.mount}`);
      throw new HttpException('Failed to create artist', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const artists = await this.getAllArtists();
    return {artists};
  }
}

