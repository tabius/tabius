import {Injectable} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {flatMap, take} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {getSongPageLink, isInputEvent} from '@common/util/misc-utils';
import {Router} from '@angular/router';
import {HelpService} from '@app/services/help.service';

const DOUBLE_PRESS_TIMEOUT_MILLIS = 500;

@Injectable({providedIn: 'root'})
export class ShortcutsService {

  private lastEvent: CachedKeyboardEvent = {time: 0, code: ''};

  isDoubleControlPressEvent = false;

  constructor(private readonly cds: CatalogService,
              private readonly router: Router,
              private readonly helpService: HelpService,
  ) {
  }

  handleKeyboardEvent(event: KeyboardEvent): void {
    if (isInputEvent(event)) {
      return;
    }
    try {
      this.isDoubleControlPressEvent = this.isCenterSongTextEvent(event);

      if (this.isShowHelpEvent(event)) {
        this.helpService.showKeyboardShortcuts();
        return;
      }
      if (this.isGotoRandomSongEvent(event)) {
        this.gotoRandomSong();
        return;
      }
    } finally {
      this.lastEvent = {time: Date.now(), code: event.code};
    }
  }

  private isShowHelpEvent(event: KeyboardEvent): boolean {
    return event.shiftKey && event.code === 'Slash';
  }

  private isGotoRandomSongEvent(event: KeyboardEvent): boolean {
    return this.lastEvent.time > Date.now() - DOUBLE_PRESS_TIMEOUT_MILLIS
        && this.lastEvent.code === 'ShiftRight'
        && event.code === this.lastEvent.code;
  }

  private isCenterSongTextEvent(event: KeyboardEvent): boolean {
    return this.lastEvent.time > Date.now() - DOUBLE_PRESS_TIMEOUT_MILLIS
        && this.lastEvent.code === 'ControlRight'
        && event.code === this.lastEvent.code;
  }

  gotoRandomSong(): void {
    const song$ = this.cds.getRandomSongId().pipe(flatMap(songId => this.cds.getSongById(songId)));
    const collection$ = song$.pipe(flatMap(song => this.cds.getCollectionById(song && song.collectionId)));
    combineLatest([song$, collection$]).pipe(take(1)).subscribe(([song, collection]) => {
      if (!song || !collection) {
        //todo: show error
        return;
      }
      const link = getSongPageLink(collection.mount, song.mount);
      this.router.navigate([link]);
    });
  }
}

interface CachedKeyboardEvent {
  time: number;
  code: string;
}
