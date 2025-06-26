import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { I18N } from '@app/app-i18n';

@Component({
    selector: 'gt-resource-not-found',
    templateUrl: './resource-not-found.component.html',
    styleUrls: ['./resource-not-found.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ResourceNotFoundComponent {
  readonly bss = inject(BrowserStateService);

  @Input({ required: true }) message!: string;

  readonly i18n = I18N.resourceNotFoundComponent;
}
