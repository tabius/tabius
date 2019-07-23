import {Injectable} from '@nestjs/common';
import {DbService} from './db.service';
import {Artist, ArtistDetails, ArtistType} from '@common/artist-model';
import {isValidId, toArrayOfInts} from '@common/util/misc-utils';
import {User} from '@common/user-model';
import Hashids from 'hashids';

interface ArtistRow {
  id: number;
  name: string;
  type: ArtistType;
  mount: string;
  band_ids: string;
  version: number;
  listed: number;
}

interface ArtistWithDetailsRow extends ArtistRow {
  band_ids: string;
  listed: number;
}

const SELECT_ARTIST_SQL = 'SELECT id, name, type, mount, version FROM artist';
const SELECT_ARTIST_DETAILS_SQL = 'SELECT id, version, band_ids, listed FROM artist';

@Injectable()
export class ArtistDbi {

  constructor(private readonly db: DbService) {
  }

  getAllArtists(listedOnly: boolean): Promise<Artist[]> {
    return this.db.pool.promise()
        .query(SELECT_ARTIST_SQL + (listedOnly ? ' WHERE listed = 1' : ''))
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtist(row)));
  }

  getArtistsByIds(artistIds: readonly number[]): Promise<(Artist)[]> {
    return this.db.pool.promise()
        .query(`${SELECT_ARTIST_SQL} WHERE id IN (${artistIds.join(',')})`)
        .then(([rows]: [ArtistRow[]]) => rows.map(row => rowToArtist(row)));
  }

  getArtistDetails(artistId: number): Promise<ArtistDetails|undefined> {
    return this.db.pool.promise()
        .query(`${SELECT_ARTIST_DETAILS_SQL} WHERE id  = ?`, [artistId])
        .then(([rows]: [ArtistWithDetailsRow[]]) => {
          if (rows.length === 0) {
            return undefined;
          }
          return rowToArtistDetails(rows[0]);
        });
  }

  async createArtistForUser(user: User): Promise<number> {
    if (isValidId(user.artistId)) {
      throw `User already has valid artist id assigned: ${user.id}, artistId: ${user.artistId}`;
    }
    const artistMount = generateArtistMountForUser();
    return await this.db.pool.promise()
        .query('INSERT INTO artist(name, type, mount, listed, user_id) VALUES (?,?,?,?,?)',
            [user.username, ArtistType.Person, artistMount, 0, user.id])
        .then(([result]) => result.insertId);
  }
}

function generateArtistMountForUser(): string {
  const hashIds = new Hashids('salt', 5);
  return `u${hashIds.encode(Date.now())}`;
}

function rowToArtist(row: ArtistRow): Artist {
  return {id: row.id, name: row.name, type: row.type, mount: row.mount, version: row.version};
}

function rowToArtistDetails(row: ArtistRow): ArtistDetails {
  return {
    id: row.id,
    version: row.version,
    bandIds: toArrayOfInts(row.band_ids, ','),
    listed: row.listed === 1,
  };
}
