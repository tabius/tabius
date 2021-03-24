import {ElementRef, Injectable, TemplateRef} from '@angular/core';
import {PopoverRef} from '@app/popover/popover-ref';
import {PopoverService} from '@app/popover/popover.service';

@Injectable({providedIn: 'root'})
export class CatalogNavigationHistoryService {

  navigationHistoryTemplate?: TemplateRef<{}>;
  private popoverRef?: PopoverRef;


  constructor(private readonly popover: PopoverService) {
  }

  showCatalogNavigationHistory(showHistoryButtonRef?: ElementRef): void {
    if (!this.navigationHistoryTemplate || this.popoverRef) {
      return;
    }

    this.popoverRef = this.popover.open(this.navigationHistoryTemplate, showHistoryButtonRef || null, {
      backdropClass: 'c-popover-backdrop-modal',
      panelClass: 'c-popover-panel',
      // The overlay is placed on the bottom left from the button (which on on the top-right).
      preferredPosition: showHistoryButtonRef ? {overlayX: 'end', overlayY: 'top'} : undefined
    });

    this.popoverRef.afterClosed().subscribe(() => {
      this.popoverRef = undefined;
    });
  }

}
