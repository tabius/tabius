import {ChangeDetectorRef} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {I18N} from '@app/app-i18n';

interface PageWithNotFoundFlag {
  notFound: boolean;
  readonly cdr: ChangeDetectorRef;
  readonly response?: any;
  readonly title?: Title,
  readonly meta?: Meta,
}

export function switchToNotFoundMode(page: PageWithNotFoundFlag): void {
  page.notFound = true;
  addStatus404ToResponse(page.response);
  page.title?.setTitle(I18N.common.resourceNotFound);
  page.meta?.addTag({name: 'description', content: I18N.common.resourceNotFound});
  page.cdr.markForCheck();
}

export function addStatus404ToResponse(response: any): void {
  if (response) {
    response.statusCode = 404;
    response.statusMessage = 'The page was not found';
  }
}
