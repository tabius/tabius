import {SongDbi} from '@server/db/song-dbi.service';
import {Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Put, Session, UseGuards} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {SongDetailsValidator, stringToArrayOfNumericIds} from '@server/util/validators';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
import {User, UserGroup} from '@common/user-model';
import {conformsTo, validate} from 'typed-validation';
import {ServerSsoService} from '@server/service/server-sso.service';

@Controller('/api/song')
export class SongController {

  private readonly logger = new Logger(SongController.name);

  constructor(private readonly songDbi: SongDbi) {
  }

  @Get('/by-ids/:ids')
  getSongs(@Param('ids') idsParam: string): Promise<Song[]> {
    this.logger.log(`by-ids: ${idsParam}`);
    const ids = stringToArrayOfNumericIds(idsParam);
    return this.songDbi.getSongs(ids);
  }

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
      throw new HttpException('Insufficient rights', HttpStatus.UNAUTHORIZED);
    }
    const vr = validate(songDetails, conformsTo(SongDetailsValidator));
    if (!vr.success) {
      throw vr.toString();
    }
    return await this.songDbi.updateDetails(songDetails);
  }


}
