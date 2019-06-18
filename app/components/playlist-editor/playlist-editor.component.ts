import {ChangeDetectionStrategy, Component} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {Playlist} from '@common/user-model';
import {Observable} from 'rxjs';
import {MOUNT_PLAYLIST_PREFIX} from '@common/mounts';


@Component({
  selector: 'gt-playlist-editor',
  templateUrl: './playlist-editor.component.html',
  styleUrls: ['./playlist-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistEditorComponent {
  readonly playlistLink = `/${MOUNT_PLAYLIST_PREFIX}`;

  readonly playlists$: Observable<Playlist[]>;

  newPlaylistName = '';

  constructor(private uds: UserDataService) {
    this.playlists$ = this.uds.getUserPlaylists();
  }

  createPlaylist(): void {
    this.uds.createUserPlaylist({
      name: this.newPlaylistName,
      songIds: [],
    });
  }

  deletePlaylist(id: number): void {
    this.uds.deleteUserPlaylist(id);
  }
}
