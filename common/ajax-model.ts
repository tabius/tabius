import {Playlist, UserSettings} from '@common/user-model';
import {Artist, Song} from '@common/artist-model';

export interface LoginResponse {
  readonly settings: UserSettings;
  readonly playlists: Playlist[];
}

export interface ArtistDetailsResponse {
  readonly artist: Artist,
  readonly songs: Song[]
}

export interface CreatePlaylistRequest {
  readonly name: string;
  readonly songIds: number[];
}

export type CreatePlaylistResponse = Playlist[];
export type UpdatePlaylistResponse = Playlist[];
export type DeletePlaylistResponse = Playlist[];
