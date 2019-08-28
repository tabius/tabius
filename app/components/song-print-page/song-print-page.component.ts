import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {ArtistDataService} from '@app/services/artist-data.service';
import {UserDataService} from '@app/services/user-data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {MOUNT_ARTIST_PREFIX} from '@common/mounts';
import {getSongPageLink} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-print-page-component',
  templateUrl: './song-print-page.component.html',
  styleUrls: ['./song-print-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrintPageComponent {
  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  songId?: number;
  loaded = false;

  constructor(private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
              private readonly router: Router,
              private readonly route: ActivatedRoute,
              readonly title: Title,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const params = this.route.snapshot.params;
    const artistMount = params['artistMount'];
    const songMount = params['songMount'];

    const artistId$ = this.ads.getArtistIdByMount(artistMount);
    const song$ = artistId$.pipe(flatMap(artistId => this.ads.getSongByMount(artistId, songMount)));

    song$
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(song => {
          this.loaded = true;
          if (song === undefined) {
            this.router.navigate([MOUNT_ARTIST_PREFIX + artistMount]).catch(err => console.error(err));
            return;
          }
          this.songId = song.id;
          this.cd.detectChanges();
          setTimeout(() => {
            window.print();
            this.router.navigate([getSongPageLink(artistMount, songMount)]).catch(err => console.error(err));
          }, 2000);

        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }
}
