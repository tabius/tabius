import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {BrowserModule, BrowserTransferStateModule} from '@angular/platform-browser';
import {AppComponent} from './components/app.component';
import {SiteHomePageComponent} from './components/site-home-page/site-home-page.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {FIREBASE_CLIENT_CONFIG} from './environments/firebase.prod';
import {AngularFireModule} from '@angular/fire';
import {AngularFireAuthModule} from '@angular/fire/auth';
import {Page404Component} from './components/page404/page404.component';
import {environment} from './environments/environment';
import {FirestoreSettingsToken} from '@angular/fire/firestore';
import {SongViewComponent} from './components/song-content/song-view.component';
import {ArtistPageComponent} from './components/artist-page/artist-page.component';
import {SongPageComponent} from './components/song-page/song-page.component';
import {NavbarComponent} from './components/navbar/navbar.component';
import {FooterComponent} from './components/footer/footer.component';
import {NewSongsComponent} from './components/new-songs/new-songs.component';
import {PlaylistPageComponent} from './components/playlist-page/playlist-page.component';
import {PlaylistEditorComponent} from './components/playlist-editor/playlist-editor.component';
import {ArtistListPageComponent} from './components/artist-list-page/artist-list-page.component';
import {AuthTokenInterceptor} from './interceptors/auth-token.interceptor';
import {ApiUrlInterceptor} from './interceptors/api-url.interceptor';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CookieService} from '@app/services/cookie.service';
import {RoutingModule} from '@app/routing.module';
import {SvgIconComponent} from './components/svg-icon/svg-icon.component';
import {TunerPageComponent} from './components/tuner-page/tuner-page.component';
import {LoadingIndicatorComponent} from './components/loading-indicator/loading-indicator.component';
import {ArtistBreadcrumbComponent} from './components/artist-breadcrumb/artist-breadcrumb.component';
import {SafeHtmlPipe, SafeResourceUrlPipe} from '@app/utils/safe.pipe';
import {NewsPageComponent} from './components/news-page-component/news-page.component';
import {InlineSongSettingsComponent} from './components/inline-song-settings/inline-song-settings.component';
import {UserSettingsPageComponent} from './components/user-settings-page/user-settings-page.component';
import {AppBrowserStore, ArtistsBrowserStore, UserBrowserStore} from '@app/store/browser-store';
import {APP_BROWSER_STORE_TOKEN, TABIUS_ARTISTS_BROWSER_STORE_TOKEN, TABIUS_BASE_API_URL, TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {UserSessionState} from '@app/store/user-session-state';
import {AddSongToPlaylistComponent} from './components/add-song-to-playlist/add-song-to-playlist.component';
import {PlaylistListPageComponent} from './components/playlist-list-page/playlist-list-page.component';
import {SigninSignoutButtonComponent} from './components/signin-signout-button/signin-signout-button.component';
import {PwaUpdaterService} from '@app/services/pwa-updater.service';

@NgModule({
  declarations: [
    AppComponent,
    SiteHomePageComponent,
    Page404Component,
    SongViewComponent,
    ArtistPageComponent,
    SongPageComponent,
    SongViewComponent,
    NavbarComponent,
    FooterComponent,
    NewSongsComponent,
    PlaylistPageComponent,
    PlaylistEditorComponent,
    ArtistListPageComponent,
    SvgIconComponent,
    TunerPageComponent,
    LoadingIndicatorComponent,
    ArtistBreadcrumbComponent,
    SafeResourceUrlPipe,
    SafeHtmlPipe,
    NewsPageComponent,
    InlineSongSettingsComponent,
    UserSettingsPageComponent,
    AddSongToPlaylistComponent,
    PlaylistListPageComponent,
    SigninSignoutButtonComponent,
  ],
  imports: [
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(FIREBASE_CLIENT_CONFIG),
    AngularFireAuthModule,
    BrowserModule.withServerTransition({appId: 'tabius'}),
    BrowserTransferStateModule,
    RoutingModule,
    //todo: why prod only?
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: environment.production})
    // ServiceWorkerModule.register('ngsw-worker.js')
  ],
  providers: [
    {provide: FirestoreSettingsToken, useValue: {}}, //  this line fixes Firebase warning about default persistence = true.
    {provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true},
    {provide: TABIUS_BASE_API_URL, useValue: environment.apiUrl},
    {provide: TABIUS_USER_BROWSER_STORE_TOKEN, useClass: UserBrowserStore},
    {provide: TABIUS_ARTISTS_BROWSER_STORE_TOKEN, useClass: ArtistsBrowserStore},
    {provide: APP_BROWSER_STORE_TOKEN, useClass: AppBrowserStore},
    CookieService,
    UserSessionState,
    PwaUpdaterService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(private readonly pwa: PwaUpdaterService) { // TODO: initiate update explicitly.
  }
}
