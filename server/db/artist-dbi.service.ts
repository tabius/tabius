import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {Artist, ArtistType} from '@common/artist-model';
import {isValidId, toArrayOfInts} from '@common/util/misc-utils';
import {User} from '@common/user-model';

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

  getAllArtists(listedOnly: boolean): Promise<Artist[]> {
    return this.db.pool.promise()
        .query(SELECT_ARTIST_SQL + (listedOnly ? ' WHERE listed = 1' : ''))
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtistListItem(row)));
  }

  getArtistsByIds(artistIds: readonly number[]): Promise<(Artist)[]> {
    return this.db.pool.promise()
        .query(`${SELECT_ARTIST_SQL} WHERE id IN (${artistIds.join(',')})`)
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtistListItem(row)));
  }

  async createArtistForUser(user: User): Promise<number> {
    if (isValidId(user.artistId)) {
      throw `User already has valid artist id assigned: ${user.id}, artistId: ${user.artistId}`;
    }
    const con = this.db.pool.promise();
    await con.query('INSERT INTO artist(name, type, mount, listed) VALUES (?,?,?,?)',
        [user.username, ArtistType.Person, user.id, 0]);
    return await con.query('SELECT LAST_INSERT_ID() as id')
        .then(([rows]) => rows[0]['id']);
  }
}

function rowToArtistListItem(row: ArtistRow): Artist {
  return {id: row.id, name: row.name, type: row.type, mount: row.mount, bandIds: toArrayOfInts(row.band_ids, ','), version: row.version};
}
