import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {BrowserModule, BrowserTransferStateModule} from '@angular/platform-browser';
import {AppComponent} from '@app/components/app.component';
import {SiteHomePageComponent} from '@app/components/site-home-page/site-home-page.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {Page404Component} from '@app/components/page404/page404.component';
import {environment} from '@app/environments/environment';
import {SongTextComponent} from '@app/components/song-text/song-text.component';
import {CollectionPageComponent} from '@app/components/collection-page/collection-page.component';
import {SongPageComponent} from '@app/components/song-page/song-page.component';
import {NavbarComponent} from '@app/components/navbar/navbar.component';
import {FooterComponent} from '@app/components/footer/footer.component';
import {CatalogPageComponent} from '@app/components/catalog-page/catalog-page.component';
import {ApiUrlInterceptor} from '@app/interceptors/api-url.interceptor';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RoutingModule} from '@app/routing.module';
import {SvgIconComponent} from '@app/components/svg-icon/svg-icon.component';
import {TunerPageComponent} from '@app/components/tuner-page/tuner-page.component';
import {LoadingIndicatorComponent} from '@app/components/loading-indicator/loading-indicator.component';
import {CollectionBreadcrumbComponent} from '@app/components/collection-breadcrumb/collection-breadcrumb.component';
import {SafeHtmlPipe, SafeResourceUrlPipe} from '@app/utils/safe.pipe';
import {InlineSongSettingsComponent} from '@app/components/inline-song-settings/inline-song-settings.component';
import {SettingsPageComponent} from '@app/components/settings-page/settings-page.component';
import {APP_BROWSER_STORE_TOKEN, TABIUS_CATALOG_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN} from '@app/app-constants';
import {BrowserStateService} from '@app/services/browser-state.service';
import {SigninSignoutButtonComponent} from '@app/components/signin-signout-button/signin-signout-button.component';
import {PwaUpdaterService} from '@app/services/pwa-updater.service';
import {ChordImageComponent} from '@app/components/chord-image/chord-image.component';
import {SongChordsComponent} from '@app/components/song-chords/song-chords.component';
import {ToastModule} from '@app/toast';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SongComponent} from '@app/components/song/song.component';
import {SongHeaderComponent} from '@app/components/song-header/song-header.component';
import {SongVideoComponent} from '@app/components/song-video/song-video.component';
import {SongEditorComponent} from '@app/components/song-editor/song-editor.component';
import {BatchRequestOptimizerInterceptor} from '@app/interceptors/batch-request-optimizer.interceptor';
import {ErrorsInterceptor} from '@app/interceptors/errors.interceptor';
import {CachingInterceptor} from '@app/interceptors/caching.interceptor';
import {ResourceNotFoundComponent} from '@app/components/resource-not-found/resource-not-found.component';
import {SongFullTextSearchResultsPanelComponent} from '@app/components/song-full-text-search-results-panel/song-full-text-search-results-panel.component';
import {StudioPageComponent} from '@app/components/studio-page/studio-page.component';
import {SongPrevNextNavigatorComponent} from '@app/components/song-prev-next-navigator/song-prev-next-navigator.component';
import {SessionStateInterceptor} from '@app/interceptors/session-state-interceptor.service';
import {AppBrowserStore, CatalogBrowserStore, UserBrowserStore} from '@app/store/stores';
import {SongPrintPageComponent} from '@app/components/song-print-page/song-print-page.component';
import {CollectionEditorComponent} from '@app/components/collection-editor/collection-editor.component';
import {SongListComponent} from '@app/components/song-list/song-list.component';
import {UserRegistrationPromptComponent} from '@app/components/user-registration-prompt/user-registration-prompt.component';
import {ModeratorPromptComponent} from '@app/components/moderator-prompt/moderator-prompt.component';
import {AddSongToCollectionComponent} from '@app/components/add-song-to-collection/add-song-to-collection.component';
import {UserCollectionsListComponent} from '@app/components/user-collections-list/user-collections-list.component';
import {UserCollectionEditorComponent} from '@app/components/user-collection-editor/user-collection-editor.component';
import {PopoverModule} from '@app/popover/popover.module';
import {KeyboardShortcutsPopupComponent} from './components/keyboard-shortcuts-popup/keyboard-shortcuts-popup.component';

@NgModule({
  declarations: [
    AppComponent,
    CollectionBreadcrumbComponent,
    CatalogPageComponent,
    CollectionPageComponent,
    ChordImageComponent,
    FooterComponent,
    InlineSongSettingsComponent,
    LoadingIndicatorComponent,
    NavbarComponent,
    Page404Component,
    ResourceNotFoundComponent,
    SafeHtmlPipe,
    SafeResourceUrlPipe,
    SettingsPageComponent,
    SigninSignoutButtonComponent,
    SiteHomePageComponent,
    SongChordsComponent,
    SongComponent,
    SongEditorComponent,
    SongFullTextSearchResultsPanelComponent,
    SongHeaderComponent,
    SongPageComponent,
    SongPrevNextNavigatorComponent,
    SongPrintPageComponent,
    SongTextComponent,
    SongTextComponent,
    SongVideoComponent,
    StudioPageComponent,
    SvgIconComponent,
    TunerPageComponent,
    CollectionEditorComponent,
    SongListComponent,
    UserRegistrationPromptComponent,
    ModeratorPromptComponent,
    AddSongToCollectionComponent,
    UserCollectionsListComponent,
    UserCollectionEditorComponent,
    KeyboardShortcutsPopupComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule.withServerTransition({appId: 'tabius'}),
    BrowserTransferStateModule,
    RoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production}),
    PopoverModule,
    ToastModule,
  ],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: ErrorsInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: CachingInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: BatchRequestOptimizerInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: SessionStateInterceptor, multi: true},
    {provide: TABIUS_USER_BROWSER_STORE_TOKEN, useClass: UserBrowserStore},
    {provide: TABIUS_CATALOG_BROWSER_STORE_TOKEN, useClass: CatalogBrowserStore},
    {provide: APP_BROWSER_STORE_TOKEN, useClass: AppBrowserStore},
    BrowserStateService,
    PwaUpdaterService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  // noinspection JSUnusedLocalSymbols
  constructor(private readonly pwa: PwaUpdaterService) { // TODO: initiate update explicitly.
  }
}
