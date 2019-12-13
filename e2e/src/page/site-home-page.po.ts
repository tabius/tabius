import {by, element} from 'protractor';

export class SiteHomePageHarness {

  getHeaderText(): Promise<string> {
    return element(by.css('h1')).getText() as Promise<string>;
  }

  getSignInSignOutButtonText(): Promise<string> {
    return element(by.tagName('gt-signin-signout-button')).getText() as Promise<string>;
  }
}

