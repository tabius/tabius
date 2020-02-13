import * as domino from 'domino';
import {enableProdMode} from '@angular/core';
import {environment} from '@app/environments/environment';

applyDomino();

if (environment.production) {
  enableProdMode();
}

export {AppServerModule} from './app.ssr.module';
export {renderModule, renderModuleFactory} from '@angular/platform-server';

function applyDomino(): void {
  const win = domino.createWindow('<body></body>');

  global['window'] = win;
  Object.defineProperty(
      win.document.body.style,
      'transform',
      {
        value: () => ({
          enumerable: true,
          configurable: true,
        })
      },
  );
  global['document'] = win.document;
  global['navigator'] = win.navigator;
  global['CSS'] = null;
  global['Prism'] = null;
}

