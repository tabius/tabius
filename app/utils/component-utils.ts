import {ChangeDetectorRef} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';

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
