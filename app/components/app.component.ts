import {AfterViewInit, ChangeDetectionStrategy, Component, HostListener, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Observable} from 'rxjs';
import {HelpService} from '@app/services/help.service';
import {ShortcutsService} from '@app/services/shortcuts.service';

@Component({
  selector: 'gt-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('keyboardShortcuts', {static: true}) keyboardShortcuts!: TemplateRef<{}>;

  readonly printMode$: Observable<boolean>;

  constructor(private readonly authService: AuthService,
              bss: BrowserStateService,
              private readonly shortcutsService: ShortcutsService,
              private readonly helpService: HelpService,
  ) {
    this.printMode$ = bss.getPrintMode();
  }

  ngOnInit(): void {
    this.authService.updateSignInState().catch(err => console.warn(err));
  }

  ngAfterViewInit(): void {
    this.helpService.keyboardShortcutsTemplate = this.keyboardShortcuts;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.shortcutsService.handleKeyboardEvent(event);
  }

}
