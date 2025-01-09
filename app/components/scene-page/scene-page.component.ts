import { ChangeDetectionStrategy, Component } from '@angular/core';
import { I18N } from '@app/app-i18n';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { CatalogService } from '@app/services/catalog.service';
import { HelpService } from '@app/services/help.service';
import { environment } from '@app/environments/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContextMenuActionService } from '@app/services/context-menu-action.service';
import { UserService } from '@app/services/user.service';
import { decFontSize, incFontSize } from '@app/components/song-page/song-page.component';
import { getToneWithH4SiFix, TONES_COUNT } from '@common/util/chords-renderer';
import { switchMap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, firstValueFrom, Observable } from 'rxjs';
import { getSongKey } from '@common/util/key-detector';
import { getTransposeActionKey, updateUserSongSetting } from '@app/components/song-chords/song-chords.component';
import { UserSongSettings } from '@common/user-model';

@Component({
  templateUrl: './scene-page.component.html',
  styleUrls: ['./scene-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ScenePageComponent extends ComponentWithLoadingIndicator {
  readonly i18n = I18N.scenePage;
  songId = -1;

  private readonly songSettings$: Observable<UserSongSettings>;
  transposeMenuActionText$ = new BehaviorSubject<string | undefined>(undefined);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly helpService: HelpService,
    private readonly userDataService: UserService,
    private readonly contextMenuActionService: ContextMenuActionService,
  ) {
    super();
    const songId$ = this.catalogService.getSceneSongId().pipe();
    songId$.pipe(takeUntilDestroyed()).subscribe(songId => {
      this.songId = songId;
      this.loaded = true;
      this.cdr.markForCheck();
    });

    const h4Si$ = this.userDataService.getH4SiFlag();
    const favoriteKey$ = this.userDataService.getFavoriteKey();
    this.songSettings$ = songId$.pipe(switchMap(songId => userDataService.getUserSongSettings(songId)));
    const songDetails$ = songId$.pipe(switchMap(songId => catalogService.getSongDetailsById(songId)));
    combineLatest([songDetails$, this.songSettings$, h4Si$, favoriteKey$])
      .pipe(takeUntilDestroyed())
      .subscribe(([songDetails, songSettings, h4Si, favoriteKey]) => {
        if (!songDetails) {
          return;
        }
        const originalSongKey = getSongKey(songDetails);
        const transposeActionKey = getTransposeActionKey(originalSongKey, favoriteKey, songSettings.transpose);
        this.transposeMenuActionText$.next(transposeActionKey ? `${getToneWithH4SiFix(h4Si, transposeActionKey)}m` : undefined);
      });

    this.updatePageMetadata({ ...this.i18n.meta, image: `${environment.url}/assets/site-logo.png` });
    this.helpService.setActiveHelpPage('song');
    this.setupContextMenuActions();
  }

  private setupContextMenuActions(): void {
    this.contextMenuActionService.footerActions$.next([
      {
        icon: 'note',
        target: [
          { icon: 'arrow-down', target: () => this.transpose(-1), style: { 'width.px': 18 } },
          { icon: 'arrow-up', target: () => this.transpose(1), style: { 'width.px': 18 } },
          { icon: 'reset', target: () => this.transpose(0), style: { 'width.px': 18 } },
          { text$: this.transposeMenuActionText$, target: () => this.transposeToKey(), textStyle: { 'font-size.px': 16 } },
        ],
        style: { 'width.px': 18 },
      },
      { icon: 'minus', target: () => void decFontSize(this.userDataService), style: { 'width.px': 18 } },
      { icon: 'plus', target: () => void incFontSize(this.userDataService), style: { 'width.px': 18 } },
    ]);
  }

  async transpose(steps: number): Promise<void> {
    const songSettings = await firstValueFrom(this.songSettings$);
    const transpose = steps === 0 ? 0 : (songSettings.transpose + steps) % TONES_COUNT;
    await this.userDataService.setUserSongSettings({ ...songSettings, transpose });
  }

  async transposeToKey(): Promise<void> {
    const favoriteKey = await this.userDataService.favoriteKey$$;
    const songDetails = await this.catalogService.getSongDetailsById$$(this.songId);
    const songSettings = await this.userDataService.getUserSongSettings$$(this.songId);
    const h4Si = await this.userDataService.h4SiFlag$$;
    const originalSongKey = getSongKey(songDetails);
    const transposeActionKey = getTransposeActionKey(originalSongKey, favoriteKey, songSettings.transpose);
    this.transposeMenuActionText$.next(transposeActionKey ? `${getToneWithH4SiFix(h4Si, transposeActionKey)}m` : undefined);
    updateUserSongSetting(originalSongKey, transposeActionKey, songSettings, this.userDataService);
  }
}
