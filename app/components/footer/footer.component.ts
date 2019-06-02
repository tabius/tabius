import {ChangeDetectionStrategy, Component} from '@angular/core';
import {environment} from '@app/environments/environment';

@Component({
  selector: 'gt-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  version = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(2);

  getRandomizedFooterClass(): string {
    return 'c' + (1 + Date.now() % 5);
  }
}
