import { AfterViewInit, ChangeDetectionStrategy, Component, HostListener, Inject, Optional, TemplateRef, ViewChild } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { Observable } from 'rxjs';
import { HelpService } from '@app/services/help.service';
import { ShortcutsService } from '@app/services/shortcuts.service';
import { REQUEST } from '@app/express.tokens';
import { CatalogNavigationHistoryService } from '@app/services/catalog-navigation-history.service';

@Component({
  selector: 'gt-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit {

  @ViewChild('keyboardShortcuts', { static: true }) keyboardShortcuts!: TemplateRef<{}>;
  @ViewChild('navigationHistory', { static: true }) navigationHistory!: TemplateRef<{}>;

  readonly printMode$: Observable<boolean>;

  constructor(private readonly bss: BrowserStateService,
              private readonly shortcutsService: ShortcutsService,
              private readonly helpService: HelpService,
              private readonly navigationHistoryService: CatalogNavigationHistoryService,
              @Optional() @Inject(REQUEST) request: any,
  ) {
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
