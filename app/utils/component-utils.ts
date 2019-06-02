import {Subject, timer} from 'rxjs';

interface ComponentLike {
  indicatorIsAllowed$: Subject<boolean>;
  loaded: boolean;
}

/** Sends true to indicatorIsAllowed$ if component is not loaded after 800ms. */
export function throttleIndicator(component: ComponentLike): void {
  timer(800).subscribe(() => {
    if (!component.loaded) {
      component.indicatorIsAllowed$.next(true);
    }
  });
}
