import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {environment} from '@app/environments/environment';

@Component({
  selector: 'gt-svg-icon',
  styleUrls: ['./svg-icon.component.scss'],
  template: `
      <svg>
          <use [attr.xlink:href]="'/assets/symbol-defs.svg?'+version+'#' + icon"></use>
      </svg>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgIconComponent {
  @Input({required: true}) icon!: string;

  readonly version = environment.buildInfo.buildDate;
}
