require('zone.js/dist/zone-node');
const domino = require('domino-ext'); // // eslint-disable-line @typescript-eslint/no-var-requires
applyDomino();

import {environment} from '@app/environments/environment';
import {ngExpressEngine} from '@nguniversal/express-engine';
import * as express from 'express';
import {join} from 'path';

import {APP_BASE_HREF} from '@angular/common';
import {existsSync} from 'fs';
import {enableProdMode} from '@angular/core';
import {AppServerModule} from '@app/app.ssr.module';

console.log('Initializing Angular SSR backend');

if (environment.production) {
  enableProdMode();
}

const app = express();
const distFolder = join(process.cwd(), 'dist/browser');
const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

// Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html',
    ngExpressEngine({
      bootstrap: AppServerModule,
    })
);

app.set('view engine', 'html');
app.set('views', distFolder);

// Serve static files from /browser
app.get('*.*', express.static(distFolder, {maxAge: '1y'}));

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render(indexHtml, {req, providers: [{provide: APP_BASE_HREF, useValue: req.baseUrl}]});
});

const port = process.env.PORT || 12101;

// Start up the Node server
app.listen(port, () => {
  console.log(`Express server is listening on http://localhost:${port}`);
});


function applyDomino(): void {
  console.log('Setting app Domino polyfills');

  global['Element'] = (domino as any).impl.Element; // eslint-disable-line @typescript-eslint/no-explicit-any.
  const dominoWindow = domino.createWindow('<body></body>');

  global['window'] = dominoWindow as Window&typeof globalThis;
  Object.defineProperty(dominoWindow.document.body.style, 'transform', {value: () => ({enumerable: true, configurable: true})});
  global['document'] = dominoWindow.document;
  global['navigator'] = dominoWindow.navigator;
  global['CSS'] = {escape: (value) => value, supports: () => false} as any; // eslint-disable-line @typescript-eslint/no-explicit-any.
  global['Prism'] = null;
}
