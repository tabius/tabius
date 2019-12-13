import {App} from './app.po';
import {browser, logging} from 'protractor';
import {SiteHomePageHarness} from './page/site-home-page.po';

describe('Tabius App', () => {
  let page: App;

  beforeEach(() => {
    page = new App();
  });

  it('should display home page component', () => {
    page.navigateTo();
    expect(browser.getTitle()).toEqual('Табы для гитары');

    const siteHome = new SiteHomePageHarness();
    expect(siteHome.getHeaderText()).toEqual('tabius');
    expect(siteHome.getSignInSignOutButtonText()).toContain('Выход');
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
  });
});
