import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {Subject} from 'rxjs';
import {CatalogService} from '@app/services/catalog.service';
import {UserService} from '@app/services/user.service';
import {ActivatedRoute, Router} from '@angular/router';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {MOUNT_COLLECTION_PREFIX, PARAM_COLLECTION_MOUNT, PARAM_SONG_MOUNT} from '@common/mounts';

@Component({
  selector: 'gt-song-print-page-component',
  templateUrl: './song-print-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrintPageComponent {
  readonly destroyed$ = new Subject();
  songId = 0;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              readonly cd: ChangeDetectorRef,
              private readonly router: Router,
              private readonly activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.uds.syncSessionStateAsync();

    const params = this.activatedRoute.snapshot.params;
    const collectionMount = params[PARAM_COLLECTION_MOUNT];
    const songMount = params[PARAM_SONG_MOUNT];

    const collectionId$ = this.cds.getCollectionIdByMount(collectionMount);
    const song$ = collectionId$.pipe(flatMap(collectionId => this.cds.getSongByMount(collectionId, songMount)));

    song$
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(song => {
          if (song === undefined) {
            this.router.navigate([MOUNT_COLLECTION_PREFIX + collectionMount]).catch(err => console.error(err));
            return;
          }
          this.songId = song.id;
          this.cd.detectChanges();
          setTimeout(() => {
            window.print();
            window.close();
          }, 2000);

        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }
}
