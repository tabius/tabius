import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'gt-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {

  readonly printMode$: Observable<boolean>;

  constructor(private readonly authService: AuthService,
              bss: BrowserStateService,
  ) {
    this.printMode$ = bss.getPrintMode();
  }

  ngOnInit(): void {
    this.authService.updateSignInState().catch(err => console.warn(err));
  }
}
