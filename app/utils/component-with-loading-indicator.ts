import {BehaviorSubject, merge, Subject, timer} from 'rxjs';
import {ChangeDetectorRef, Injector} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {take, takeUntil} from 'rxjs/operators';

/**
 * Common base class for all components with a loading indicator.
 * Contains observable for loading state, automatically makes loading state visible after preconfigured timeout.
 * Also contains set of re-usable fields.
 */
export class ComponentWithLoadingIndicator {
  readonly destroyed$ = new Subject();
  readonly isLoadingIndicatorVisible$ = new BehaviorSubject<boolean>(false);
  readonly isServer: boolean;
  readonly isBrowser: boolean;
  readonly cd: ChangeDetectorRef;

  get loaded() {
    return this._loaded;
  }

  set loaded(loaded: boolean) {
    this._loaded = loaded;
    this.loaded$.next();
  }

  private readonly loaded$ = new Subject();
  private _loaded = false;

  constructor(injector: Injector, loadingTimeout = 800) {
    this.cd = injector.get(ChangeDetectorRef);
    this.isServer = injector.get(BrowserStateService).isServer;
    this.isBrowser = !this.isServer;
    if (this.isBrowser) { // loading indicator is not used during SSR.
      timer(loadingTimeout).pipe(
          take(1),
          takeUntil(merge(this.loaded$, this.destroyed$)),
      ).subscribe(() => {
        if (!this.loaded) { 
          this.isLoadingIndicatorVisible$.next(true);
        }
      });
    }
  }
}
