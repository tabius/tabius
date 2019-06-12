import {Playlist, UserSettings} from '@common/user-model';
import {Artist, Song} from '@common/artist-model';

export interface LoginResponse {
  settings: UserSettings;
  playlists: Playlist[];
}

export interface ArtistDetailsResponse {
  artist: Artist,
  songs: Song[]
}

export interface CreatePlaylistRequest {
  name: string;
  songIds: number[];
}
