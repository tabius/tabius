import {ChangeDetectionStrategy, Component} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {Playlist} from '@common/user-model';
import {Observable} from 'rxjs';
import {MOUNT_PLAYLIST_PREFIX} from '@common/mounts';
import {ToastService} from '@app/toast/toast.service';
import {MSG_NETWORK_ERROR} from '@common/messages';


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

  constructor(private uds: UserDataService,
              private readonly toastService: ToastService,
  ) {
    this.playlists$ = this.uds.getUserPlaylists();
  }

  createPlaylist(): void {
    const request = {name: this.newPlaylistName, songIds: [],};
    this.uds.createUserPlaylist(request)
        .catch(err => this.toastService.warning(err, MSG_NETWORK_ERROR));
  }

  deletePlaylist(id: number): void {
    this.uds.deleteUserPlaylist(id)
        .catch(err => this.toastService.warning(err, MSG_NETWORK_ERROR));
  }
}
