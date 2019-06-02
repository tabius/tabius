import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'gt-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingIndicatorComponent {
}
