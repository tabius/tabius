import { provideHttpClient, withFetch } from '@angular/common/http';
import { inject, NgModule, REQUEST as NG_REQUEST } from '@angular/core';
import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';
import { AppModule } from '@app/app.module';
import { AppComponent } from '@app/components/app.component';
import { REQUEST, RESPONSE } from '@app/express.tokens';
import type { Request, Response } from 'express';

/**
 * The new @angular/ssr node engine provides Angular's Web-API `REQUEST` token, but the app
 * components inject the Express-shaped `@app/express.tokens`. Bridge them here so the old
 * (CommonEngine-era) component code keeps working without changes.
 */
function provideExpressRequestShim(): Request | null {
  const webRequest = inject(NG_REQUEST, { optional: true });
  if (!webRequest) {
    return null;
  }
  const userAgent = webRequest.headers.get('user-agent') ?? undefined;
  // Only `headers['user-agent']` is read from the request across the app.
  return { headers: { 'user-agent': userAgent } } as unknown as Request;
}

@NgModule({
  imports: [AppModule],
  providers: [
    provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }])),
    provideHttpClient(withFetch()),
    { provide: REQUEST, useFactory: provideExpressRequestShim },
    // Status code set here (e.g. 404) is not propagated by the node engine; kept as a no-op shim
    // so component code that mutates the response does not crash during SSR.
    { provide: RESPONSE, useFactory: (): Response => ({ statusCode: 200, statusMessage: '' }) as unknown as Response },
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
