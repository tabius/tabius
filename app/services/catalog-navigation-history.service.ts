import {Injectable, TemplateRef} from '@angular/core';
import {PopoverRef} from '@app/popover/popover-ref';
import {PopoverService} from '@app/popover/popover.service';

@Injectable({providedIn: 'root'})
export class CatalogNavigationHistoryService {

  navigationHistoryTemplate?: TemplateRef<{}>;
  private popoverRef?: PopoverRef;


  constructor(private readonly popover: PopoverService) {
  }

  showCatalogNavigationHistory(): void {
    if (!this.navigationHistoryTemplate || this.popoverRef) {
      return;
    }

    this.popoverRef = this.popover.open(this.navigationHistoryTemplate, null, {
      panelClass: 'history-popover-panel'
    });

    this.popoverRef.afterClosed().subscribe(() => {
      this.popoverRef = undefined;
    });
  }

}
