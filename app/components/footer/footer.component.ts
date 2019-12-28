import {ChangeDetectionStrategy, Component} from '@angular/core';
import {environment} from '@app/environments/environment';
import {Router} from '@angular/router';

@Component({
  selector: 'gt-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {

  readonly month = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(4, 6);
  readonly day = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(6, 8);

  readonly footerClass = `c${1 + Date.now() % 5}`;

  readonly domain = environment.domain;

  constructor(readonly router: Router) {
  }
}
