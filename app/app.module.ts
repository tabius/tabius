import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ErrorHandler, Injector, NgModule, Provider, inject } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { AppComponent } from '@app/components/app.component';
import { SiteHomePageComponent } from '@app/components/site-home-page/site-home-page.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { Page404Component } from '@app/components/page404/page404.component';
import { environment } from '@app/environments/environment';
import { SongTextComponent } from '@app/components/song-text/song-text.component';
import { CollectionPageComponent } from '@app/components/collection-page/collection-page.component';
import { SongPageComponent } from '@app/components/song-page/song-page.component';
import { NavbarComponent } from '@app/components/navbar/navbar.component';
import { FooterComponent } from '@app/components/footer/footer.component';
import { CatalogPageComponent } from '@app/components/catalog-page/catalog-page.component';
import { ApiUrlInterceptor } from '@app/interceptors/api-url.interceptor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RoutingModule } from '@app/routing.module';
import { SvgIconComponent } from '@app/components/svg-icon/svg-icon.component';
import { TunerPageComponent } from '@app/components/tuner-page/tuner-page.component';
import { LoadingIndicatorComponent } from '@app/components/loading-indicator/loading-indicator.component';
import { CollectionBreadcrumbComponent } from '@app/components/collection-breadcrumb/collection-breadcrumb.component';
import { SafeHtmlPipe, SafeResourceUrlPipe } from '@app/utils/safe.pipe';
import { SettingsPageComponent } from '@app/components/settings-page/settings-page.component';
import { APP_BROWSER_STORE_TOKEN, TABIUS_CATALOG_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN } from '@app/app-constants';
import { BrowserStateService } from '@app/services/browser-state.service';
import { SigninSignoutButtonComponent } from '@app/components/signin-signout-button/signin-signout-button.component';
import { PwaUpdaterService } from '@app/services/pwa-updater.service';
import { ChordImageComponent } from '@app/components/chord-image/chord-image.component';
import { SongChordsComponent } from '@app/components/song-chords/song-chords.component';
import { ToastModule } from '@app/toast';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SongComponent } from '@app/components/song/song.component';
import { SongHeaderComponent } from '@app/components/song-header/song-header.component';
import { SongVideoComponent } from '@app/components/song-video/song-video.component';
import { provideAuth0 } from '@auth0/auth0-angular';
import { SongEditorComponent } from '@app/components/song-editor/song-editor.component';
import { BatchRequestOptimizerInterceptor } from '@app/interceptors/batch-request-optimizer.interceptor';
import { CachingAndMultiplexingInterceptor } from '@app/interceptors/caching-and-multiplexing-interceptor.service';
import { ResourceNotFoundComponent } from '@app/components/resource-not-found/resource-not-found.component';
import { SongFullTextSearchResultsPanelComponent } from '@app/components/song-full-text-search-results-panel/song-full-text-search-results-panel.component';
import { StudioPageComponent } from '@app/components/studio-page/studio-page.component';
import { SongPrevNextNavigatorComponent } from '@app/components/song-prev-next-navigator/song-prev-next-navigator.component';
import { AppBrowserStore, CatalogBrowserStore, UserBrowserStore } from '@app/app-store';
import { SongPrintPageComponent } from '@app/components/song-print-page/song-print-page.component';
import { CollectionEditorComponent } from '@app/components/collection-editor/collection-editor.component';
import { SongListComponent } from '@app/components/song-list/song-list.component';
import { UserRegistrationPromptComponent } from '@app/components/user-registration-prompt/user-registration-prompt.component';
import { ModeratorPromptComponent } from '@app/components/moderator-prompt/moderator-prompt.component';
import { AddSongToCollectionComponent } from '@app/components/add-song-to-collection/add-song-to-collection.component';
import { UserCollectionsListComponent } from '@app/components/user-collections-list/user-collections-list.component';
import { UserCollectionEditorComponent } from '@app/components/user-collection-editor/user-collection-editor.component';
import { PopoverModule } from '@app/popover/popover.module';
import { KeyboardShortcutsPopupComponent } from '@app/components/keyboard-shortcuts-popup/keyboard-shortcuts-popup.component';
import { HelpService } from '@app/services/help.service';
import {
  CanonicalLinkHeadContributorComponent,
  HeadContributorComponent,
  LinkHeadContributorComponent,
  MetaHeadContributorComponent,
} from '@app/components/head-contributor/head-contributor.component';
import { ChordPopoverComponent } from '@app/components/chord-popover/chord-popover.component';
import { ShowChordPopoverOnClickDirective } from '@app/directives/show-chord-popover-on-click.directive';
import { JsonLdComponent } from '@app/components/json-ld/json-ld.component';
import { CatalogNavigationHistoryPopupComponent } from '@app/components/catalog-navigation-history-popup/catalog-navigation-history-popup.component';
import { ScenePageComponent } from './components/scene-page/scene-page.component';
import * as Sentry from '@sentry/angular';
import { MoveSongToCollectionComponent } from './components/move-song-to-collection/move-song-to-collection.component';
import { NgOptimizedImage } from '@angular/common';
import { TabiusAuthHttpInterceptor } from '@app/interceptors/auth.interceptor';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';

const interceptors: Array<Provider> = [
  { provide: HTTP_INTERCEPTORS, useClass: CachingAndMultiplexingInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: BatchRequestOptimizerInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true },
];

const userAgent = typeof window === 'object' ? window.navigator?.userAgent : undefined;
if (userAgent !== undefined && userAgent.length > 0) {
  interceptors.push({ provide: HTTP_INTERCEPTORS, useClass: TabiusAuthHttpInterceptor, multi: true });
} else {
  console.log('Running in SSR mode');
}

@NgModule({
  declarations: [
    AbstractAppComponent,
    AddSongToCollectionComponent,
    AppComponent,
    CanonicalLinkHeadContributorComponent,
    CatalogNavigationHistoryPopupComponent,
    CatalogPageComponent,
    ChordImageComponent,
    ChordPopoverComponent,
    CollectionBreadcrumbComponent,
    CollectionEditorComponent,
    CollectionPageComponent,
    FooterComponent,
    HeadContributorComponent,
    JsonLdComponent,
    KeyboardShortcutsPopupComponent,
    LinkHeadContributorComponent,
    LoadingIndicatorComponent,
    MetaHeadContributorComponent,
    ModeratorPromptComponent,
    MoveSongToCollectionComponent,
    NavbarComponent,
    Page404Component,
    ResourceNotFoundComponent,
    SafeHtmlPipe,
    SafeResourceUrlPipe,
    ScenePageComponent,
    SettingsPageComponent,
    ShowChordPopoverOnClickDirective,
    SigninSignoutButtonComponent,
    SiteHomePageComponent,
    SongChordsComponent,
    SongComponent,
    SongEditorComponent,
    SongFullTextSearchResultsPanelComponent,
    SongHeaderComponent,
    SongListComponent,
    SongPageComponent,
    SongPrevNextNavigatorComponent,
    SongPrintPageComponent,
    SongTextComponent,
    SongTextComponent,
    SongVideoComponent,
    StudioPageComponent,
    SvgIconComponent,
    TunerPageComponent,
    UserCollectionEditorComponent,
    UserCollectionsListComponent,
    UserRegistrationPromptComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    //TODO: HammerModule,
    ReactiveFormsModule,
    RoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    PopoverModule,
    ToastModule,
    NgOptimizedImage,
  ],
  providers: [
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler({ showDialog: false }) },
    ...interceptors,
    { provide: TABIUS_USER_BROWSER_STORE_TOKEN, useClass: UserBrowserStore },
    { provide: TABIUS_CATALOG_BROWSER_STORE_TOKEN, useClass: CatalogBrowserStore },
    { provide: APP_BROWSER_STORE_TOKEN, useClass: AppBrowserStore },
    BrowserStateService,
    HelpService,
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(),
    PwaUpdaterService,
    provideAuth0(environment.auth0Config),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor() {
    const injector = inject(Injector);

    injector.get(PwaUpdaterService); // TODO: initiate update explicitly?
  }
}
