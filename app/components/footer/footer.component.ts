import {ChangeDetectionStrategy, Component} from '@angular/core';
import {environment} from '@app/environments/environment';
import {Router} from '@angular/router';
import {I18N} from '@app/app-i18n';
import {NODE_BB_URL} from '@app/app-constants';
import {LINK_CATALOG, LINK_SETTINGS, LINK_STUDIO, LINK_TUNER} from '@common/mounts';
import {LocationStrategy} from '@angular/common';
import {BrowserStateService} from '@app/services/browser-state.service';
import {ContextMenuAction, ContextMenuActionService} from '@app/services/context-menu-action.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'gt-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {

  readonly month = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(4, 6);
  readonly day = new Date(environment.buildInfo.buildDate).toISOString().split('T')[0].replace(/-/g, '').substring(6, 8);

  readonly footerClass = `c${1 + Date.now() % 5}`;

  readonly domain = environment.domain;

  readonly twitterLink = environment.domain === 'tabius.ru' || environment.domain === 'localhost'
                         ? 'https://twitter.com/tratatabius'
                         : undefined;

  readonly githubLink = 'https://github.com/tabius/tabius/commits/master';
  readonly forumLink = NODE_BB_URL;
  readonly catalogLink = LINK_CATALOG;
  readonly studioLink = LINK_STUDIO;
  readonly tunerLink = LINK_TUNER;
  readonly settingsLink = LINK_SETTINGS;


  readonly i18n = I18N.footer;
  readonly i18nNav = I18N.navbar;//TODO:

  opened = false;
  actions$: Observable<ContextMenuAction[]>;
  readonly defaultMenuIconSize = 24;

  constructor(readonly router: Router,
              private readonly location: LocationStrategy,
              private readonly bss: BrowserStateService,
              contextMenuActionService: ContextMenuActionService,
  ) {
    this.actions$ = contextMenuActionService.footerActions$;
    this.location.onPopState(() => {
      // Closes opened navbar on back button on mobile device.
      if (this.opened) {
        this.close();
        window.history.go(1);
      }
    });

  }

  open() {
    this.opened = true;
  }

  close() {
    this.opened = false;
  }

  toggleNoSleep(): void {
    this.bss.toggleNoSleepMode();
  }

  activateAction(action: ContextMenuAction): void {
    action.activate();
  }
}
