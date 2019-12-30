import {ChangeDetectionStrategy, Component} from '@angular/core';
import {environment} from '@app/environments/environment';
import {Router} from '@angular/router';
import {I18N} from '@app/app-i18n';

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

  readonly twitterLink = environment.domain === 'tabius.ru' || environment.domain === 'localhost'
                         ? 'https://twitter.com/tratatabius'
                         : undefined;

  readonly githubLink = 'https://github.com/tabius/tabius/commits/master';

  readonly i18n = I18N.footer;

  constructor(readonly router: Router) {
  }
}
