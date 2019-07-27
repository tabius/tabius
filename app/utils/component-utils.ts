import {Subject, timer} from 'rxjs';
import {ChangeDetectorRef} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';

interface ComponentWithLoadingIndicator {
  indicatorIsAllowed$: Subject<boolean>;
  loaded: boolean;
}

/** Sends true to indicatorIsAllowed$ if component is not loaded after 800ms. */
export function enableLoadingIndicator(component: ComponentWithLoadingIndicator): void {
  timer(800).subscribe(() => {
    if (!component.loaded) {
      component.indicatorIsAllowed$.next(true);
    }
  });
}

interface PageWithNotFoundFlag {
  notFound: boolean;
  readonly cd: ChangeDetectorRef;
  readonly response?: any;
  readonly title?: Title,
  readonly meta?: Meta,
}

export function switchToNotFoundMode(page: PageWithNotFoundFlag) {
  page.notFound = true;
  addStatus404ToResponse(page.response);
  if (page.title) {
    page.title.setTitle('Ресурс не найден');
  }
  if (page.meta) {
    page.meta.addTag({name: 'description', content: 'Ресурс не найден'});
  }
  page.cd.detectChanges();
}

export function addStatus404ToResponse(response: any): void {
  if (response) {
    response.statusCode = 404;
    response.statusMessage = 'The page was not found';
  }
}
