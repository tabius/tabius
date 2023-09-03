import {ReplaySubject} from 'rxjs';
import {ChangeDetectorRef, DestroyRef, inject, Injectable, Injector, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Meta, Title} from '@angular/platform-browser';
import {PageMetadata, updatePageMetadata} from '@app/utils/seo-utils';
import {DeepReadonly} from '@common/typescript-extras';

/** Common base class for all components with a common reusable fields. */
@Injectable()
export class AbstractAppComponent implements OnChanges, OnInit {
  readonly isServer: boolean;
  readonly isBrowser: boolean;

  readonly cdr: ChangeDetectorRef;
  readonly destroyRef = inject(DestroyRef);

  readonly injector = inject(Injector);
  readonly changes$ = new ReplaySubject<SimpleChanges>(1);

  readonly pageTitle = inject(Title);
  readonly pageMeta = inject(Meta);

  constructor() {
    this.cdr = this.injector.get(ChangeDetectorRef);
    this.isServer = this.injector.get(BrowserStateService).isServer;
    this.isBrowser = !this.isServer;
  }

  ngOnInit(): void {
    this.validateInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.validateInputs();
    this.changes$.next(changes);
  }

  updatePageMetadata(pageMetadata: DeepReadonly<PageMetadata>): void {
    updatePageMetadata(this.pageTitle, this.pageMeta, pageMetadata);
  }

  /**
   * Validates inputs. Called after ngOnInit and every ngOnChanges methods.
   * By default, does not check anything and should be overridden in subclass.
   */
  validateInputs(): void {
  }
}
