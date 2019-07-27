import {Component, Inject, Optional} from '@angular/core';
import {RESPONSE} from '@nguniversal/express-engine/tokens';
import {addStatus404ToResponse} from '@app/utils/component-utils';

@Component({
  selector: 'gt-page-404',
  template: `<p>Страница не найдена!</p>`,
})
export class Page404Component {

  constructor(@Optional() @Inject(RESPONSE) private readonly response: any) {
    addStatus404ToResponse(this.response);
  }

}
