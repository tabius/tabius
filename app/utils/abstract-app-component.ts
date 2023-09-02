import {ReplaySubject} from 'rxjs';
import {ChangeDetectorRef, DestroyRef, inject, Injector, OnChanges, SimpleChanges} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Meta, Title} from '@angular/platform-browser';
import {PageMetadata, updatePageMetadata} from '@app/utils/seo-utils';
import {DeepReadonly} from '@common/typescript-extras';

/** Common base class for all components with a common reusable fields. */
export class AbstractAppComponent implements OnChanges {
  readonly isServer: boolean;
  readonly isBrowser: boolean;

  readonly cdr: ChangeDetectorRef;
  protected readonly destroyRef = inject(DestroyRef);

  protected readonly injector = inject(Injector);
  protected readonly changes$ = new ReplaySubject<SimpleChanges>(1);

  readonly pageTitle = inject(Title);
  readonly pageMeta = inject(Meta);

  constructor() {
    this.cdr = this.injector.get(ChangeDetectorRef);
    this.isServer = this.injector.get(BrowserStateService).isServer;
    this.isBrowser = !this.isServer;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changes$.next(changes);
  }

  protected updatePageMetadata(pageMetadata: DeepReadonly<PageMetadata>): void {
    updatePageMetadata(this.pageTitle, this.pageMeta, pageMetadata);
  }
}
