import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {AuthService} from '@app/services/auth.service';

@Component({
  selector: 'gt-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {

  constructor(private readonly authService: AuthService) {
  }

  ngOnInit(): void {
    this.authService.connectToFirebase();
  }
}
