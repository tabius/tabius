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

  readonly version = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(2);

  constructor(readonly router: Router) {
  }

  getRandomizedFooterClass(): string {
    return 'c' + (1 + Date.now() % 5);
  }
}
