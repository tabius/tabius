import {SongDbi} from '@server/db/song-dbi.service';
import {Controller, Get, Logger, Param} from '@nestjs/common';
import {Song, SongDetails} from '@common/artist-model';
import {stringToArrayOfNumericIds} from '@server/util/validators';

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

}
