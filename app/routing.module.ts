import { SiteHomePageComponent } from '@app/components/site-home-page/site-home-page.component';
import { Page404Component } from '@app/components/page404/page404.component';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  ExtraOptions,
  Resolve,
  RouteReuseStrategy,
  RouterModule,
  Routes,
} from '@angular/router';
import { Injectable, NgModule, inject } from '@angular/core';
import { TunerPageComponent } from '@app/components/tuner-page/tuner-page.component';
import { CatalogPageComponent } from '@app/components/catalog-page/catalog-page.component';
import { CollectionPageComponent } from '@app/components/collection-page/collection-page.component';
import { SongPageComponent } from '@app/components/song-page/song-page.component';
import { SettingsPageComponent } from '@app/components/settings-page/settings-page.component';
import {
  MOUNT_CATALOG,
  MOUNT_COLLECTION,
  MOUNT_PAGE_NOT_FOUND,
  MOUNT_SCENE,
  MOUNT_SETTINGS,
  MOUNT_SONG,
  MOUNT_SONG_IN_SECONDARY_COLLECTION,
  MOUNT_SONG_PRINT,
  MOUNT_STUDIO,
  MOUNT_TUNER,
} from '@common/mounts';
import { TABIUS_CATALOG_BROWSER_STORE_TOKEN, TABIUS_USER_BROWSER_STORE_TOKEN } from '@app/app-constants';
import { ObservableStore } from '@app/store/observable-store';
import { StudioPageComponent } from '@app/components/studio-page/studio-page.component';
import { SongPrintPageComponent } from '@app/components/song-print-page/song-print-page.component';
import { ScenePageComponent } from '@app/components/scene-page/scene-page.component';

//TODO: move to a separate file. Use for the most routes?
@Injectable({ providedIn: 'root' })
export class BrowserStoreStateResolver implements Resolve<any> {
  private readonly catalogStore = inject<ObservableStore>(TABIUS_CATALOG_BROWSER_STORE_TOKEN);
  private readonly userStore = inject<ObservableStore>(TABIUS_USER_BROWSER_STORE_TOKEN);


  resolve(): Promise<any> {
    return Promise.all([this.catalogStore.initialized$$, this.userStore.initialized$$]);
  }
}

const routes: Routes = [
  { path: '', component: SiteHomePageComponent, pathMatch: 'full' },
  { path: MOUNT_TUNER, component: TunerPageComponent },
  { path: MOUNT_CATALOG, component: CatalogPageComponent, resolve: { storeFlag: BrowserStoreStateResolver } },
  { path: MOUNT_SCENE, component: ScenePageComponent },
  { path: MOUNT_COLLECTION, component: CollectionPageComponent },
  { path: MOUNT_SONG, component: SongPageComponent },
  { path: MOUNT_SONG_PRINT, component: SongPrintPageComponent }, // Note: print page must go before the secondary collection page
  { path: MOUNT_SONG_IN_SECONDARY_COLLECTION, component: SongPageComponent },
  { path: MOUNT_SETTINGS, component: SettingsPageComponent },
  { path: MOUNT_STUDIO, component: StudioPageComponent },
  { path: MOUNT_PAGE_NOT_FOUND, component: Page404Component },
  { path: '**', redirectTo: `/${MOUNT_PAGE_NOT_FOUND}` },
];

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
};

//TODO: Re-check this solution or fix CollectionPageComponent to handle route update from itself.

/**
 * Re-creates a page component on every router update. Check song prev/next navigation before removal.
 */
@Injectable()
export class TabiusRouteReuseStrategy extends RouteReuseStrategy {
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && JSON.stringify(future.params) === JSON.stringify(curr.params);
  }

  shouldDetach(): boolean {
    return false;
  }

  store(): void {}

  shouldAttach(): boolean {
    return false;
  }

  retrieve(): DetachedRouteHandle | null {
    return null;
  }
}

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
  providers: [{ provide: RouteReuseStrategy, useClass: TabiusRouteReuseStrategy }],
})
export class RoutingModule {}
