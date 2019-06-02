import {Component, Inject, OnInit, Optional} from '@angular/core';
import {RESPONSE} from '@nguniversal/express-engine/tokens';

@Component({
  selector: 'gt-page-404',
  template: `<p>Страница не найдена!</p>`,
})
export class Page404Component implements OnInit {

  constructor(@Optional() @Inject(RESPONSE) private response: any) {
  }

  ngOnInit() {
    if (this.response) {
      this.response.statusCode = 404;
      this.response.statusMessage = 'The page was not found';
    }
  }
}
