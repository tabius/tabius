import {NgModule} from '@angular/core';
import {ServerModule, ServerTransferStateModule} from '@angular/platform-server';

import {AppModule} from './app.module';
import {AppComponent} from './components/app.component';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import {CachingInterceptor} from '@app/interceptors/caching.interceptor';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    ServerTransferStateModule,
  ],

  bootstrap: [AppComponent]
})
export class AppServerModule {
}

