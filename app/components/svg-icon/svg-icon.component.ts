import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'gt-svg-icon',
  styleUrls: ['./svg-icon.component.scss'],
  template: `
      <svg>
          <use [attr.xlink:href]="'/assets/symbol-defs.svg#' + icon"></use>
      </svg>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgIconComponent {
  @Input() icon!: string;
}
