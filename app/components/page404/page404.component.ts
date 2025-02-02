import { ChangeDetectionStrategy, Component, Inject, Optional } from '@angular/core';
import { RESPONSE } from '@app/express.tokens';
import { addStatus404ToResponse } from '@app/utils/component-utils';
import { I18N } from '@app/app-i18n';
import type { Response } from 'express';

@Component({
    template: `<p>{{ i18n.message }}</p>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class Page404Component {
  readonly i18n = I18N.page404;

  constructor(@Optional() @Inject(RESPONSE) private readonly response: Response) {
    addStatus404ToResponse(this.response);
  }
}
