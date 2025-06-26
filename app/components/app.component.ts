import { AfterViewInit, ChangeDetectionStrategy, Component, HostListener, TemplateRef, ViewChild, inject } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { Observable } from 'rxjs';
import { HelpService } from '@app/services/help.service';
import { ShortcutsService } from '@app/services/shortcuts.service';
import { REQUEST } from '@app/express.tokens';
import { CatalogNavigationHistoryService } from '@app/services/catalog-navigation-history.service';
import type { Request } from 'express';

@Component({
    selector: 'gt-app',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AppComponent implements AfterViewInit {
  private readonly bss = inject(BrowserStateService);
  private readonly shortcutsService = inject(ShortcutsService);
  private readonly helpService = inject(HelpService);
  private readonly navigationHistoryService = inject(CatalogNavigationHistoryService);

  @ViewChild('keyboardShortcuts', { static: true }) keyboardShortcuts!: TemplateRef<void>;
  @ViewChild('navigationHistory', { static: true }) navigationHistory!: TemplateRef<void>;

  readonly printMode$: Observable<boolean>;

  constructor() {
    const bss = this.bss;
    const request = inject<Request>(REQUEST, { optional: true });

    bss.initWideScreenModeState(request);
    this.printMode$ = bss.getPrintMode();
  }

  ngAfterViewInit(): void {
    this.helpService.keyboardShortcutsTemplate = this.keyboardShortcuts;
    this.navigationHistoryService.navigationHistoryTemplate = this.navigationHistory;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    this.shortcutsService.handleKeyboardEvent(event);
  }

  @HostListener('window:resize', [])
  onWindowResize(): void {
    this.bss.updateWideScreenModeFromWindow();
  }
}
