import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Subject} from 'rxjs';
import {UserDataService} from '@app/services/user-data.service';
import {AuthService} from '@app/services/auth.service';
import {takeUntil} from 'rxjs/operators';
import {Playlist} from '@common/user-model';
import {MOUNT_PLAYLIST_PREFIX} from '@common/mounts';
import {ToastService} from '@app/toast/toast.service';
import {MGS_PLAYLIST_NOT_FOUND, MSG_NETWORK_ERROR} from '@common/messages';

@Component({
  selector: 'gt-add-song-to-playlist',
  templateUrl: './add-song-to-playlist.component.html',
  styleUrls: ['./add-song-to-playlist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSongToPlaylistComponent implements OnInit, OnDestroy {

  @Input() songId!: number;

  playlists: Playlist[] = [];

  readonly playlistLinkPrefix = `/${MOUNT_PLAYLIST_PREFIX}`;

  readonly favPlaylistName = 'Избранное';

  private readonly destroyed$ = new Subject();

  constructor(private readonly uds: UserDataService,
              private readonly authService: AuthService,
              private readonly cd: ChangeDetectorRef,
              private readonly toastService: ToastService,
  ) {
  }

  ngOnInit() {
    this.uds.getUserPlaylists()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(playlists => {
          this.playlists = playlists;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  trackById(idx: number, playlist: Playlist): string {
    return playlist.id;
  }

  /** Returns true if current song is in the playlist. */
  isInPlaylist(p: Playlist|string): boolean {
    if (typeof p === 'object') {
      return p.songIds.includes(this.songId);
    }
    const playlist = this.playlists.find(pl => pl.id === p);
    return playlist !== undefined && playlist.songIds.includes(this.songId);
  }

  async togglePlaylist(playlistMount: string, checkboxElement: any = {}) {
    try {
      //todo: await this.authService.askUserToSignInOrFail();
      const playlist = this.playlists.find(p => p.id === playlistMount);
      if (!playlist) {
        this.toastService.warning(MGS_PLAYLIST_NOT_FOUND);
        return;
      }
      let newSongIds = [...playlist.songIds];
      if (playlist.songIds.includes(this.songId)) {
        newSongIds = playlist.songIds.filter(id => id != this.songId);
      } else {
        newSongIds.push(this.songId);
      }
      await this.uds.updateUserPlaylist({...playlist, songIds: newSongIds});
    } catch (err) {
      console.error(err);
      this.toastService.warning(err, MSG_NETWORK_ERROR);
      checkboxElement.checked = this.isInPlaylist(playlistMount); // enforce checkbox state.
    }
  }

  async toggleNewFavPlaylist(checkboxElement: any = {}): Promise<void> {
    try {
      //todo: await this.authService.askUserToSignInOrFail();

      // check for FAV list again if user has signed just now.
      const playlist = this.playlists.find(p => p.name === this.favPlaylistName);
      if (playlist) {
        if (!playlist.songIds.includes(this.songId)) {
          await this.togglePlaylist(playlist.id);
        }
        return;
      }
      const createPlaylistRequest = {name: this.favPlaylistName, shared: true, songIds: [this.songId]}; //todo: dedup!
      await this.uds.createUserPlaylist(createPlaylistRequest);
    } catch (err) {
      console.error(err);
      this.toastService.warning(err, MSG_NETWORK_ERROR);
      checkboxElement.checked = false;
    }
  }
}
