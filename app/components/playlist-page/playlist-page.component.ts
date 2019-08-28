import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Meta, Title} from '@angular/platform-browser';
import {Artist, Song} from '@common/artist-model';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {MOUNT_USER_STUDIO} from '@common/mounts';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {ArtistDataService} from '@app/services/artist-data.service';
import {Playlist, User} from '@common/user-model';
import {canEditArtist, defined, getArtistPageLink, getNameFirstFormArtistName, getSongForumTopicLink, getSongPageLink, hasValidForumTopic, playlistMountToId} from '@common/util/misc-utils';
import {SongComponentMode} from '@app/components/song/song.component';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {RefreshMode} from '@app/store/observable-store';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';

interface PlaylistSongModel {
  song: Song;
  artist: Artist;
  artistName: string;
  last: boolean;
}

@Component({
  selector: 'gt-playlist-page',
  templateUrl: './playlist-page.component.html',
  styleUrls: ['./playlist-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject();
  playlist!: Playlist;
  songItems: PlaylistSongModel[] = [];

  private user?: User;

  readonly mode: SongComponentMode = 'PlaylistMode';
  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;
  readonly playlistsLink = `/${MOUNT_USER_STUDIO}`;
  readonly getArtistPageLink = getArtistPageLink;
  readonly getSongPageLink = getSongPageLink;
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  private readonly songsWithOpenEditors = new Set<number>();

  loaded = false;
  notFound = false;

  constructor(readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);

    const playlistMount = this.route.snapshot.params['playlistMount'];
    const playlistId = playlistMountToId(playlistMount);
    const playlist$ = this.uds.getPlaylist(playlistId, RefreshMode.Refresh);
    const songs$: Observable<Song[]> = playlist$.pipe(
        flatMap(playlist => this.ads.getSongsByIds(playlist ? playlist.songIds : [])),
        map(songs => songs.filter(defined)),
    );
    const artists$: Observable<(Artist|undefined)[]> = songs$.pipe(
        flatMap(songs => this.ads.getArtistsByIds(songs.map(s => s.artistId)))
    );

    combineLatest([playlist$, songs$, artists$, this.uds.getUser()]).pipe(
        takeUntil(this.destroyed$),
        throttleTime(100, undefined, {leading: true, trailing: true}),
    ).subscribe(([playlist, songs, artists, user]) => {
      this.loaded = true;
      if (!playlist) {
        switchToNotFoundMode(this);
        return;
      }
      this.user = user;
      this.playlist = playlist;
      this.songItems = [];
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const artist = artists[i];
        if (artist) {
          this.songItems.push({
            song,
            artist,
            artistName: getNameFirstFormArtistName(artist),
            last: i === songs.length - 1,
          });
        }
      }
      this.updateMeta();
      this.cd.detectChanges();
      this.navHelper.restoreScrollPosition();
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    //todo: add user info?
    updatePageMetadata(this.title, this.meta, {
      title: `${this.playlist.name} - плейлист`,
      description: `Плейлист ${this.playlist.name}`,
      keywords: ['плейлист', 'аккорды', 'гитара'],
    });
  }

  isEditorOpen(songId: number): boolean {
    return this.songsWithOpenEditors.has(songId);
  }

  toggleEditor(songId: number): void {
    if (this.songsWithOpenEditors.has(songId) || !this.hasEditRight) {
      this.songsWithOpenEditors.delete(songId);
    } else {
      this.songsWithOpenEditors.add(songId);
    }
    this.cd.detectChanges();
  }

  hasEditRight(artistId: number): boolean {
    return canEditArtist(this.user, artistId);
  }
}
