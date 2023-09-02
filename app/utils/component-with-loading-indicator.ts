import {BehaviorSubject, Subject, timer} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractAppComponent} from '@app/utils/abstract-app-component';

/**
 * Common base class for all components with a loading indicator.
 * Contains observable for loading state, automatically makes loading state visible after preconfigured timeout.
 */
export class ComponentWithLoadingIndicator extends AbstractAppComponent {
  readonly isLoadingIndicatorVisible$ = new BehaviorSubject<boolean>(false);

  get loaded(): boolean {
    return this._loaded;
  }

  set loaded(loaded: boolean) {
    this._loaded = loaded;
    this.loaded$.next(true);
  }

  private readonly loaded$ = new Subject<boolean>();
  private _loaded = false;

  constructor(loadingTimeout = 800) {
    super();
    if (this.isBrowser) { // loading indicator is not used during SSR.
      timer(loadingTimeout).pipe(
          take(1),
          takeUntil(this.loaded$),
          takeUntilDestroyed(),
      ).subscribe(() => {
        if (!this.loaded) {
          this.isLoadingIndicatorVisible$.next(true);
        }
      });
    }
  }

}
