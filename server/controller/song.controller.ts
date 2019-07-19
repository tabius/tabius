import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Put, Session, UseGuards} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {SongDetailsValidator, stringToArrayOfNumericIds} from '@server/util/validators';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {User, UserGroup} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {ServerSsoService} from '@server/service/server-sso.service';
import {ArtistDetailsResponse} from '@common/ajax-model';
import {CrossEntityDbi} from '@server/db/cross-entity-dbi.service';

@Controller('/api/song')
export class SongController {

  private readonly logger = new Logger(SongController.name);

  constructor(private readonly songDbi: SongDbi, private readonly crossDbi: CrossEntityDbi) {
  }

  /** Returns found songs  by ids. The order of results is not specified. */
  @Get('/by-ids/:ids')
  getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongs(ids);
  }

  /** Returns found song details by ids. The order of results is not specified. */
  @Get('/details-by-ids/:ids')
  getSongDetails(@Param('ids') idsParam: string): Promise<SongDetails[]> {
    this.logger.log(`details-by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongsDetails(ids);
  }

  /** Updates song details playlist and returns updated details. */
  @Put('/update-details')
  @UseGuards(ServerAuthGuard)
  async update(@Session() session, @Body() songDetails: SongDetails): Promise<SongDetails> {
    this.logger.log('/update-details');
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const vr = validate(songDetails, conformsTo(SongDetailsValidator));
    if (!vr.success) {
      throw vr.toString();
    }
    return await this.songDbi.updateDetails(songDetails);
  }

  /** Deletes the song and returns updated artist details. */
  @Delete(':songId')
  @UseGuards(ServerAuthGuard)
  async delete(@Session() session, @Param('songId') idParam: string): Promise<ArtistDetailsResponse|undefined> {
    this.logger.log(`/delete song ${idParam}`);
    const user: User = ServerSsoService.getUserOrFail(session);
    if (!user.groups.includes(UserGroup.Moderator)) {
      throw new HttpException('Insufficient rights', HttpStatus.FORBIDDEN);
    }
    const songId = +idParam;
    const songsArray = await this.songDbi.getSongs([songId]);
    if (songsArray.length === 0) {
      throw new HttpException(`Song is not found ${idParam}`, HttpStatus.NOT_FOUND);
    }
    const artistId = songsArray[0].artistId;
    await this.crossDbi.deleteSongAndUpdateArtistVersion(songId, artistId);
    return this.crossDbi.getArtistDetailsResponse(artistId);
  }
}
