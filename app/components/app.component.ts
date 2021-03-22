import {AfterViewInit, ChangeDetectionStrategy, Component, HostListener, Inject, OnInit, Optional, TemplateRef, ViewChild} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Observable} from 'rxjs';
import {HelpService} from '@app/services/help.service';
import {ShortcutsService} from '@app/services/shortcuts.service';
import {REQUEST} from '@nguniversal/express-engine/tokens';
import {CatalogNavigationHistoryService} from '@app/services/catalog-navigation-history.service';

@Component({
  selector: 'gt-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('keyboardShortcuts', {static: true}) keyboardShortcuts!: TemplateRef<{}>;
  @ViewChild('navigationHistory', {static: true}) navigationHistory!: TemplateRef<{}>;

  readonly printMode$: Observable<boolean>;

  constructor(private readonly authService: AuthService,
              private readonly bss: BrowserStateService,
              private readonly shortcutsService: ShortcutsService,
              private readonly helpService: HelpService,
              private readonly navigationHistoryService: CatalogNavigationHistoryService,
              @Optional() @Inject(REQUEST) private request: any,
  ) {
    bss.initWideScreenModeState(request);
    this.printMode$ = bss.getPrintMode();
  }

  ngOnInit(): void {
    this.authService.updateSignInState().catch(err => console.warn(err));
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
