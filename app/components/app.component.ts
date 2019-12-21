import {AfterViewInit, ChangeDetectionStrategy, Component, HostListener, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Observable} from 'rxjs';
import {isInputEvent} from '@common/util/misc-utils';
import {HelpService} from '@app/services/help.service';

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
    if (event.shiftKey && !isInputEvent(event)) {
      if (event.code === 'Slash') {
        this.helpService.showKeyboardShortcuts();
      }
    }
  }

}
