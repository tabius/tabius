import { ChangeDetectionStrategy, Component } from '@angular/core';
import { I18N } from '@app/app-i18n';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { CatalogService } from '@app/services/catalog.service';
import { HelpService } from '@app/services/help.service';
import { environment } from '@app/environments/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    templateUrl: './scene-page.component.html',
    styleUrls: ['./scene-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ScenePageComponent extends ComponentWithLoadingIndicator {
  readonly i18n = I18N.scenePage;
  songId = -1;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly helpService: HelpService,
  ) {
    super();
    this.catalogService
      .getSceneSongId()
      .pipe(takeUntilDestroyed())
      .subscribe(songId => {
        console.debug('Loaded song of the day: ', songId);
        this.songId = songId;
        this.loaded = true;
        this.cdr.markForCheck();
      });
    this.updatePageMetadata({ ...this.i18n.meta, image: `${environment.url}/assets/site-logo.png` });
    this.helpService.setActiveHelpPage('song');
  }
}
