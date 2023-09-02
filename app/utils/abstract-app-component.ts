import {ReplaySubject} from 'rxjs';
import {ChangeDetectorRef, DestroyRef, inject, Injector, OnChanges, SimpleChanges} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';

/** Common base class for all components with a common reusable fields. */
export class AbstractAppComponent implements OnChanges {
  readonly isServer: boolean;
  readonly isBrowser: boolean;

  readonly cdr: ChangeDetectorRef;
  protected readonly destroyRef = inject(DestroyRef);

  protected readonly injector = inject(Injector);
  protected readonly changes$ = new ReplaySubject<SimpleChanges>(1);

  constructor() {
    this.cdr = this.injector.get(ChangeDetectorRef);
    this.isServer = this.injector.get(BrowserStateService).isServer;
    this.isBrowser = !this.isServer;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.changes$.next(changes);
  }
}
