import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RESPONSE } from '@app/express.tokens';
import { addStatus404ToResponse } from '@app/utils/component-utils';
import { I18N } from '@app/app-i18n';
import type { Response } from 'express';

@Component({
  template: `<p>{{ i18n.message }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class Page404Component {
  private readonly response: Response | null = inject<Response>(RESPONSE, { optional: true });

  readonly i18n = I18N.page404;

  constructor() {
    addStatus404ToResponse(this.response || undefined);
  }
}
