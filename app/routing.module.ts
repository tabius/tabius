import {SiteHomePageComponent} from '@app/components/site-home-page/site-home-page.component';
import {Page404Component} from '@app/components/page404/page404.component';
import {ActivatedRouteSnapshot, DetachedRouteHandle, ExtraOptions, Resolve, RouteReuseStrategy, RouterModule, RouterStateSnapshot, Routes} from '@angular/router';
import {Inject, Injectable, NgModule} from '@angular/core';
import {TunerPageComponent} from '@app/components/tuner-page/tuner-page.component';
import {ArtistListPageComponent} from '@app/components/artist-list-page/artist-list-page.component';
import {ArtistPageComponent} from '@app/components/artist-page/artist-page.component';
import {SongPageComponent} from '@app/components/song-page/song-page.component';
import {NewsPageComponent} from '@app/components/news-page-component/news-page.component';
import {UserSettingsPageComponent} from '@app/components/user-settings-page/user-settings-page.component';
import {MOUNT_ARTISTS, MOUNT_NEWS, MOUNT_PAGE_NOT_FOUND, MOUNT_PLAYLIST, MOUNT_TUNER, MOUNT_USER_HOME, MOUNT_USER_PLAYLISTS, MOUNT_USER_SETTINGS} from '@common/mounts';
import {PlaylistListPageComponent} from '@app/components/playlist-list-page/playlist-list-page.component';
import {PlaylistPageComponent, PlaylistPageResolver} from '@app/components/playlist-page/playlist-page.component';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {BrowserStore} from '@app/store/browser-store';

//TODO: move to a separate file. Use for the most routes?
@Injectable({providedIn: 'root'})
export class BrowserStoreStateResolver implements Resolve<any> {

  constructor(@Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly artistStore: BrowserStore,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly userStore: BrowserStore) {
  }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {
    return Promise.all([this.artistStore.initialized$$, this.userStore.initialized$$]);
  }
}

const routes: Routes = [
  {path: '', component: SiteHomePageComponent, pathMatch: 'full'},
  {path: MOUNT_NEWS, component: NewsPageComponent},
  {path: MOUNT_TUNER, component: TunerPageComponent},
  {path: MOUNT_ARTISTS, component: ArtistListPageComponent, resolve: {storeFlag: BrowserStoreStateResolver}},
  //todo:
  {path: 'artist/:artistMount', component: ArtistPageComponent},
  {path: 'song/:artistMount/:songMount', component: SongPageComponent},
  {path: MOUNT_USER_HOME, redirectTo: MOUNT_USER_SETTINGS},
  {path: MOUNT_USER_SETTINGS, component: UserSettingsPageComponent},
  {path: MOUNT_USER_PLAYLISTS, component: PlaylistListPageComponent,},
  {path: MOUNT_PLAYLIST, component: PlaylistPageComponent, resolve: {input: PlaylistPageResolver}},
  // {path: 'my/song/:songId', component: SongPageComponent, canActivate: [AuthGuard]},
  {path: MOUNT_PAGE_NOT_FOUND, component: Page404Component},
  {path: '**', redirectTo: `/${MOUNT_PAGE_NOT_FOUND}`}
];

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
};

//TODO: Re-check this solution or fix ArtistPageComponent to handle route update from itself.
export class TabiusRouteReuseStrategy extends RouteReuseStrategy {
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && JSON.stringify(future.params) === JSON.stringify(curr.params);
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle): void {
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle|null {
    return null;
  }
}

@NgModule({
  imports: [
    RouterModule.forRoot(routes, routerOptions),
  ],
  exports: [RouterModule],
  providers: [
    {provide: RouteReuseStrategy, useClass: TabiusRouteReuseStrategy},
  ],
})
export class RoutingModule {
  constructor() {
  }
}

