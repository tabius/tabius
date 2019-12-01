import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {BrowserModule, BrowserTransferStateModule} from '@angular/platform-browser';
import {AppComponent} from './components/app.component';
import {SiteHomePageComponent} from './components/site-home-page/site-home-page.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {Page404Component} from './components/page404/page404.component';
import {environment} from './environments/environment';
import {SongTextComponent} from './components/song-text/song-text.component';
import {CollectionPageComponent} from './components/collection-page/collection-page.component';
import {SongPageComponent} from './components/song-page/song-page.component';
import {NavbarComponent} from './components/navbar/navbar.component';
import {FooterComponent} from './components/footer/footer.component';
import {CatalogPageComponent} from './components/catalog-page/catalog-page.component';
import {ApiUrlInterceptor} from './interceptors/api-url.interceptor';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RoutingModule} from '@app/routing.module';
import {SvgIconComponent} from './components/svg-icon/svg-icon.component';
import {TunerPageComponent} from './components/tuner-page/tuner-page.component';
import {LoadingIndicatorComponent} from './components/loading-indicator/loading-indicator.component';
import {CollectionBreadcrumbComponent} from './components/collection-breadcrumb/collection-breadcrumb.component';
import {SafeHtmlPipe, SafeResourceUrlPipe} from '@app/utils/safe.pipe';
import {InlineSongSettingsComponent} from './components/inline-song-settings/inline-song-settings.component';
import {SettingsPageComponent} from './components/settings-page/settings-page.component';
import {APP_BROWSER_STORE_TOKEN, TABIUS_BASE_API_URL, TABIUS_CATALOG_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {BrowserStateService} from '@app/services/browser-state.service';
import {SigninSignoutButtonComponent} from './components/signin-signout-button/signin-signout-button.component';
import {PwaUpdaterService} from '@app/services/pwa-updater.service';
import {ChordImageComponent} from './components/chord-image/chord-image.component';
import {SongChordsComponent} from './components/song-chords/song-chords.component';
import {ToastModule} from '@app/toast';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SongComponent} from './components/song/song.component';
import {SongHeaderComponent} from './components/song-header/song-header.component';
import {SongVideoComponent} from './components/song-video/song-video.component';
import {SongEditorComponent} from './components/song-editor/song-editor.component';
import {BatchRequestOptimizerInterceptor} from '@app/interceptors/batch-request-optimizer.interceptor';
import {ErrorsInterceptor} from '@app/interceptors/errors.interceptor';
import {CachingInterceptor} from '@app/interceptors/caching.interceptor';
import {ResourceNotFoundComponent} from './components/resource-not-found/resource-not-found.component';
import {SongFullTextSearchResultsPanelComponent} from './components/song-full-text-search-results-panel/song-full-text-search-results-panel.component';
import {StudioPageComponent} from '@app/components/studio-page/studio-page.component';
import {SongPrevNextNavigatorComponent} from './components/song-prev-next-navigator/song-prev-next-navigator.component';
import {SessionStateInterceptor} from '@app/interceptors/session-state-interceptor.service';
import {AppBrowserStore, CatalogBrowserStore, UserBrowserStore} from '@app/store/stores';
import {SongPrintPageComponent} from './components/song-print-page/song-print-page.component';
import {CollectionEditorComponent} from './components/collection-editor/collection-editor.component';
import {SongListComponent} from './components/song-list/song-list.component';
import {UserRegistrationPromptComponent} from './components/user-registration-prompt/user-registration-prompt.component';
import {ModeratorPromptComponent} from './components/moderator-prompt/moderator-prompt.component';
import {AddSongToCollectionComponent} from './components/add-song-to-collection/add-song-to-collection.component';
import {UserCollectionsListComponent} from '@app/components/user-collections-list/user-collections-list.component';
import {UserCollectionEditorComponent} from './components/user-collection-editor/user-collection-editor.component';

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
    ToastModule,
  ],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: ErrorsInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: CachingInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: BatchRequestOptimizerInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: SessionStateInterceptor, multi: true},
    {provide: TABIUS_BASE_API_URL, useValue: environment.apiUrl},
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
