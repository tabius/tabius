import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  selector: 'gt-resource-not-found',
  templateUrl: './resource-not-found.component.html',
  styleUrls: ['./resource-not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceNotFoundComponent {

  @Input() message!: string;

  constructor(readonly bss: BrowserStateService) {
  }

}
