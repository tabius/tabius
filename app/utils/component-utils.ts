import {ChangeDetectorRef} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {I18N} from '@app/app-i18n';

interface PageWithNotFoundFlag {
  notFound: boolean;
  readonly cd: ChangeDetectorRef;
  readonly response?: any;
  readonly title?: Title,
  readonly meta?: Meta,
}

export function switchToNotFoundMode(page: PageWithNotFoundFlag): void {
  page.notFound = true;
  addStatus404ToResponse(page.response);
  if (page.title) {
    page.title.setTitle(I18N.common.resourceNotFound);
  }
  if (page.meta) {
    page.meta.addTag({name: 'description', content: I18N.common.resourceNotFound});
  }
  page.cd.detectChanges();
}

export function addStatus404ToResponse(response: any): void {
  if (response) {
    response.statusCode = 404;
    response.statusMessage = 'The page was not found';
  }
}
