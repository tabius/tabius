import {ChangeDetectionStrategy, Component, Injector} from '@angular/core';
import {I18N} from '@app/app-i18n';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {CatalogService} from '@app/services/catalog.service';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

@Component({
  templateUrl: './scene-page.component.html',
  styleUrls: ['./scene-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScenePageComponent extends ComponentWithLoadingIndicator {
  readonly i18n = I18N.scenePage;

  songId$: Observable<number>;


  constructor(injector: Injector,
              private readonly catalogService: CatalogService,
  ) {
    super(injector);
    this.songId$ = this.catalogService.getSceneSongId().pipe(tap(() => this.loaded = true));
  }

}
