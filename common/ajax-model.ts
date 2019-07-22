import {Playlist, User, UserSettings} from '@common/user-model';
import {Artist, Song, SongDetails} from '@common/artist-model';

export interface LoginResponse {
  readonly user?: User;
  readonly settings: UserSettings;
  readonly playlists: Playlist[];
}

export interface ArtistDetailsResponse {
  readonly artist: Artist;
  readonly songs: Song[];
  readonly bandIds: number[];
  readonly listed: boolean;
}

export interface CreatePlaylistRequest {
  readonly name: string;
  readonly shared: boolean;
  readonly songIds: number[];
}

export type CreatePlaylistResponse = Playlist[];
export type UpdatePlaylistResponse = Playlist[];
export type DeletePlaylistResponse = Playlist[];


export interface SongUpdateRequest {
  song: Song;
  details: SongDetails;
}

export interface SongUpdateResponse {
  song: Song;
  details: SongDetails;
}
