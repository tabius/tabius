import * as domino from 'domino';
import {enableProdMode} from '@angular/core';
import {environment} from '@app/environments/environment';

applyDomino();

if (environment.production) {
  enableProdMode();
}

function applyDomino(): void {
  global['Element'] = (domino as any).impl.Element;
  const dominoWindow = domino.createWindow('<body></body>');

  global['window'] = dominoWindow as Window&typeof globalThis;
  Object.defineProperty(
      dominoWindow.document.body.style,
      'transform',
      {
        value: () => ({
          enumerable: true,
          configurable: true,
        })
      },
  );
  global['document'] = dominoWindow.document;
  global['navigator'] = dominoWindow.navigator;
  global['CSS'] = {escape: (value) => value, supports: () => false};
  global['Prism'] = null;
}

export {AppServerModule} from './app.ssr.module';

