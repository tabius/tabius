import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {Artist, ArtistType} from '@common/artist-model';
import {toArrayOfInts} from '@common/util/misc_utils';

interface ArtistRow {
  id: number;
  name: string;
  type: ArtistType;
  mount: string;
  band_ids: string;
  version: number;
}

const SELECT_ARTIST_SQL = 'SELECT id, name, type, mount, band_ids, version FROM artist';

@Injectable()
export class ArtistDbi {

  constructor(private readonly db: DbService) {
  }

  getAllArtists(): Promise<Artist[]> {
    return this.db.pool.promise()
        .query(SELECT_ARTIST_SQL)
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtistListItem(row)));
  }

  getArtistsByIds(artistIds: number[]): Promise<(Artist)[]> {
    return this.db.pool.promise()
        .query(`${SELECT_ARTIST_SQL} WHERE id IN (${artistIds.join(',')})`)
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtistListItem(row)));
  }
}

function rowToArtistListItem(row: ArtistRow): Artist {
  return {id: row.id, name: row.name, type: row.type, mount: row.mount, bandIds: toArrayOfInts(row.band_ids, ','), version: row.version};
}
