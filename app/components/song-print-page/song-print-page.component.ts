import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {combineLatest, mergeMap, Subject} from 'rxjs';
import {CatalogService} from '@app/services/catalog.service';
import {UserService} from '@app/services/user.service';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntil, throttleTime} from 'rxjs/operators';
import {MOUNT_COLLECTION_PREFIX, PARAM_COLLECTION_MOUNT, PARAM_PRIMARY_COLLECTION_MOUNT, PARAM_SONG_MOUNT} from '@common/mounts';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  templateUrl: './song-print-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrintPageComponent {
  readonly destroyed$ = new Subject<boolean>();
  songId = 0;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              readonly cd: ChangeDetectorRef,
              private readonly router: Router,
              private readonly activatedRoute: ActivatedRoute,
              private readonly bss: BrowserStateService,
  ) {
  }

  ngOnInit() {
    const params = this.activatedRoute.snapshot.params;
    const collectionMount = params[PARAM_COLLECTION_MOUNT];
    const primaryCollectionMount = params[PARAM_PRIMARY_COLLECTION_MOUNT] || collectionMount;
    const songMount = params[PARAM_SONG_MOUNT];

    const collectionId$ = this.cds.getCollectionIdByMount(collectionMount);
    const primaryCollectionId$ = this.cds.getCollectionIdByMount(primaryCollectionMount);
    const song$ = combineLatest([collectionId$, primaryCollectionId$])
        .pipe(mergeMap(([collectionId, primaryCollectionId]) => this.cds.getSongByMount(collectionId, primaryCollectionId, songMount)));

    song$
        .pipe(
            throttleTime(100, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroyed$),
        )
        .subscribe(song => {
          if (song === undefined) {
            this.router.navigate([MOUNT_COLLECTION_PREFIX + collectionMount]).catch(err => console.error(err));
            return;
          }
          this.songId = song.id;
          this.cd.detectChanges();
          if (this.bss.isBrowser) {
            setTimeout(() => {
              window.print();
              window.close();
            }, 2000);
          }
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
}
