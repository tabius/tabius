import {SiteHomePageComponent} from '@app/components/site-home-page/site-home-page.component';
import {Page404Component} from '@app/components/page404/page404.component';
import {ActivatedRouteSnapshot, DetachedRouteHandle, ExtraOptions, Resolve, RouteReuseStrategy, RouterModule, Routes} from '@angular/router';
import {Inject, Injectable, NgModule} from '@angular/core';
import {TunerPageComponent} from '@app/components/tuner-page/tuner-page.component';
import {ArtistListPageComponent} from '@app/components/artist-list-page/artist-list-page.component';
import {ArtistPageComponent} from '@app/components/artist-page/artist-page.component';
import {SongPageComponent} from '@app/components/song-page/song-page.component';
import {UserSettingsPageComponent} from '@app/components/user-settings-page/user-settings-page.component';
import {MOUNT_ARTIST, MOUNT_ARTISTS, MOUNT_PAGE_NOT_FOUND, MOUNT_PLAYLIST, MOUNT_SONG, MOUNT_TUNER, MOUNT_USER_SETTINGS, MOUNT_USER_STUDIO} from '@common/mounts';
import {PlaylistPageComponent} from '@app/components/playlist-page/playlist-page.component';
import {TABIUS_ARTISTS_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN} from '@common/constants';
import {ObservableStore} from '@app/store/observable-store';
import {StudioPageComponent} from '@app/components/studio-page/studio-page.component';

//TODO: move to a separate file. Use for the most routes?
@Injectable({providedIn: 'root'})
export class BrowserStoreStateResolver implements Resolve<any> {

  constructor(@Inject(TABIUS_ARTISTS_BROWSER_STORE_TOKEN) private readonly artistStore: ObservableStore,
              @Inject(TABIUS_USER_BROWSER_STORE_TOKEN) private readonly userStore: ObservableStore) {
  }

  resolve(): Promise<any> {
    return Promise.all([this.artistStore.initialized$$, this.userStore.initialized$$]);
  }
}

const routes: Routes = [
  {path: '', component: SiteHomePageComponent, pathMatch: 'full'},
  {path: MOUNT_TUNER, component: TunerPageComponent},
  {path: MOUNT_ARTISTS, component: ArtistListPageComponent, resolve: {storeFlag: BrowserStoreStateResolver}},
  {path: MOUNT_ARTIST, component: ArtistPageComponent},
  {path: MOUNT_SONG, component: SongPageComponent},
  {path: MOUNT_USER_SETTINGS, component: UserSettingsPageComponent},
  {path: MOUNT_USER_STUDIO, component: StudioPageComponent,},
  {path: MOUNT_PLAYLIST, component: PlaylistPageComponent},
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

  shouldDetach(): boolean {
    return false;
  }

  store(): void {
  }

  shouldAttach(): boolean {
    return false;
  }

  retrieve(): DetachedRouteHandle|null {
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

