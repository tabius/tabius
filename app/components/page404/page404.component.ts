import {ChangeDetectionStrategy, Component, Inject, Optional} from '@angular/core';
import {RESPONSE} from '@nguniversal/express-engine/tokens';
import {addStatus404ToResponse} from '@app/utils/component-utils';
import {I18N} from '@app/app-i18n';

@Component({
  template: `<p>{{i18n.message}}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Page404Component {

  readonly i18n = I18N.page404;

  constructor(@Optional() @Inject(RESPONSE) private readonly response: any) {
    addStatus404ToResponse(this.response);
  }

}
