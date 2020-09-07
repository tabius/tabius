import {ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Collection} from '@common/catalog-model';
import {CatalogService} from '@app/services/catalog.service';
import {FormControl} from '@angular/forms';
import {debounce, takeUntil, throttleTime} from 'rxjs/operators';
import {timer} from 'rxjs';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {canCreateNewPublicCollection, getCollectionPageLink, isAlpha, isInputEvent, isTouchEventsSupportAvailable, scrollToView} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {UserService} from '@app/services/user.service';
import {MIN_DESKTOP_WIDTH, MIN_LEN_FOR_FULL_TEXT_SEARCH} from '@common/common-constants';
import {User} from '@common/user-model';
import {I18N} from '@app/app-i18n';
import {environment} from '@app/environments/environment';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';

interface LetterBlock {
  letter: string,
  collections: CollectionListItem[]
}

interface CollectionListItem extends Collection {
  link: string;
  titleAttribute: string;
  lcName: string;
}

/**
 * Using global variable to keep it for the page between navigations.
 * Unsafe if there are multiple CatalogPageComponent, but safe it there is only 1.
 */
let letterBlockFilters: string[] = [];

@Component({
  selector: 'gt-catalog-page',
  templateUrl: './catalog-page.component.html',
  styleUrls: ['./catalog-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {
  readonly i18n = I18N.catalogPage;

  @ViewChild('searchField', {static: false, read: ElementRef}) private searchField!: ElementRef;
  @ViewChild('searchResultsBlock', {static: false, read: ElementRef}) private searchResultsBlock!: ElementRef;
  letterBlocks: LetterBlock[] = [];
  searchValue: string = '';

  collectionFilterControl = new FormControl();
  filteredCollections: CollectionListItem[] = [];
  collectionEditorIsOpen = false;
  canCreateNewPublicCollection = false;
  user?: User;

  readonly isVirtualKeyboardShownOnInput = isTouchEventsSupportAvailable();

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              private readonly title: Title,
              private readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
              injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit() {
    this.uds.syncSessionStateAsync();
    this.uds.getUser()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(user => {
          this.user = user;
          this.canCreateNewPublicCollection = canCreateNewPublicCollection(user);
          this.cd.detectChanges();
        });

    this.collectionFilterControl.valueChanges
        .pipe(
            debounce(() => timer(300)),
            takeUntil(this.destroyed$)
        )
        .subscribe(newValue => this.updateCollectionFilter(newValue));

    this.cds.getListedCollections()
        .pipe(
            throttleTime(100, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroyed$),
        )
        .subscribe(collections => {
          this.letterBlocks = toLetterBlocks(collections, environment.lang === 'ru');
          this.loaded = true;
          this.cd.detectChanges();
          this.bringFocusToTheSearchField();
          this.navHelper.restoreScrollPosition();
        });
    this.updateMeta();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!event.shiftKey && event.code === 'Slash' && !isInputEvent(event)) {
      this.bringFocusToTheSearchField();
    }
  }

  private bringFocusToTheSearchField(): void {
    // do not focus: 1) During SSR, 2) On touch device to avoid virtual keyboard to be opened, 3) On non-default scrolling position to avoid re-scroll.
    if (this.isBrowser && window.innerWidth >= MIN_DESKTOP_WIDTH && window.pageYOffset === 0) {
      setTimeout(() => {
        if (this.searchField && this.searchField.nativeElement) {
          this.searchField.nativeElement.focus();
        }
      }, 200);
    }
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Slash':
        if (document.activeElement !== this.searchField.nativeElement) {
          this.searchField.nativeElement.focus();
          event.preventDefault();
        }
        break;
      case 'Escape':
        this.activateLetter(null);
        break;
    }
  }

  updateMeta() {
    updatePageMetadata(this.title, this.meta, this.i18n.meta);
  }

  trackByLetter(idx: number, block: LetterBlock): string {
    return block.letter;
  }

  trackByCollectionId(idx: number, collection: Collection): number {
    return collection.id;
  }

  activateLetter(letter: string|null): void {
    this.updateCollectionFilter('');
    if (letter == null || letter.length === 0) {
      letterBlockFilters = [];
    } else {
      letterBlockFilters = [letter];
    }
  }

  getVisibleLetterBlocks(): LetterBlock[] {
    if (letterBlockFilters.length === 0) {
      return this.letterBlocks;
    }
    return this.letterBlocks.filter(block => letterBlockFilters.some(letter => block.letter === letter));
  }

  isLetterSelected(letter: string): boolean {
    return letterBlockFilters.some(l => l === letter);
  }

  updateCollectionFilter(value: string): void {
    if (this.searchValue !== value) {
      this.searchValue = value;
      this.filteredCollections = this.getFilteredCollections();
      this.cd.markForCheck();
    }
  }

  private getFilteredCollections(): CollectionListItem[] {
    const result: CollectionListItem[] = [];
    const filterLcTokens = this.searchValue.toLocaleLowerCase().split(' ');
    for (const letterBlock of this.letterBlocks) {
      letterBlock.collections
          .filter(collectionItem => isCollectionNameMatchesFilter(collectionItem, filterLcTokens))
          .forEach(collectionItem => {
            result.push(collectionItem);
          });
    }
    return result;
  }

  useFullTextSearch(): boolean {
    return this.searchValue.length >= MIN_LEN_FOR_FULL_TEXT_SEARCH
        && this.searchValue.replace(/ /g, '').length >= MIN_LEN_FOR_FULL_TEXT_SEARCH;
  }

  toggleCollectionsEditor(): void {
    this.collectionEditorIsOpen = !this.collectionEditorIsOpen;
  }

  gotoResults(): void {
    if (this.searchValue.length === 0 || !this.searchResultsBlock) {
      return;
    }
    scrollToView(this.searchResultsBlock.nativeElement, 10);
  }

}

function createListItemFromCollection(collection: Collection): CollectionListItem {
  return {
    ...collection,
    lcName: collection.name.toLocaleLowerCase(),
    link: getCollectionPageLink(collection),
    titleAttribute: `${collection.name} — ${I18N.catalogPage.listItemTitleSuffix(collection.type)}`,
  };
}

function toLetterBlocks(collections: readonly Collection[], mergeLatinWordsIntoSingleBlock: boolean): LetterBlock[] {
  const blocksByLetter = new Map<string, LetterBlock>();
  for (const collection of collections) {
    let letter = collection.name.charAt(0);
    if (!isAlpha(letter)) {
      letter = '0-9';
    } else if (mergeLatinWordsIntoSingleBlock && letter >= 'A' && letter <= 'z') {
      letter = 'A-Z';
    } else {
      letter = letter.toUpperCase();
    }
    const letterBlock = blocksByLetter.get(letter) || {letter, collections: []};
    letterBlock.collections.push(createListItemFromCollection(collection));
    blocksByLetter.set(letter, letterBlock);
  }
  blocksByLetter.forEach(block => block.collections.sort((a1, a2) => a1.name.localeCompare(a2.name)));
  return Array.from(blocksByLetter.values()).sort((b1, b2) => b1.letter.localeCompare(b2.letter));
}

function isCollectionNameMatchesFilter(item: CollectionListItem, filterLcTokens: string[]): boolean {
  for (const lcToken of filterLcTokens) {
    if (!item.lcName.includes(lcToken)) {
      return false;
    }
  }
  return true;
}
