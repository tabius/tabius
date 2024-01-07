import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { combineLatest } from 'rxjs';
import { CatalogService } from '@app/services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, throttleTime } from 'rxjs/operators';
import { MOUNT_COLLECTION_PREFIX, PARAM_COLLECTION_MOUNT, PARAM_PRIMARY_COLLECTION_MOUNT, PARAM_SONG_MOUNT } from '@common/mounts';
import { BrowserStateService } from '@app/services/browser-state.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  templateUrl: './song-print-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongPrintPageComponent {
  songId = 0;

  constructor(
    private readonly cds: CatalogService,
    cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly bss: BrowserStateService,
  ) {
    const params = this.activatedRoute.snapshot.params;
    const collectionMount = params[PARAM_COLLECTION_MOUNT];
    const primaryCollectionMount = params[PARAM_PRIMARY_COLLECTION_MOUNT] || collectionMount;
    const songMount = params[PARAM_SONG_MOUNT];

    const collectionId$ = this.cds.getCollectionIdByMount(collectionMount);
    const primaryCollectionId$ = this.cds.getCollectionIdByMount(primaryCollectionMount);
    const song$ = combineLatest([collectionId$, primaryCollectionId$]).pipe(
      switchMap(([collectionId, primaryCollectionId]) => this.cds.getSongByMount(collectionId, primaryCollectionId, songMount)),
    );

    song$.pipe(throttleTime(100, undefined, { leading: true, trailing: true }), takeUntilDestroyed()).subscribe(song => {
      if (song === undefined) {
        this.router.navigate([MOUNT_COLLECTION_PREFIX + collectionMount]).catch(err => console.error(err));
        return;
      }
      this.songId = song.id;
      cdr.markForCheck();
      if (this.bss.isBrowser) {
        setTimeout(() => {
          window.print();
          window.close();
        }, 2000);
      }
    });
  }
}
