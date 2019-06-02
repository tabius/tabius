import {NgModule} from '@angular/core';
import {ServerModule, ServerTransferStateModule} from '@angular/platform-server';

import {AppModule} from './app.module';
import {AppComponent} from './components/app.component';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    ServerTransferStateModule,
  ],
  bootstrap: [AppComponent],
  providers: [
    //{provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptorService, multi: true}
  ]
})
export class AppServerModule {
}

