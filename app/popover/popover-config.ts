import { HorizontalConnectionPos, VerticalConnectionPos } from '@angular/cdk/overlay';

/**
 * Configuration for opening a popover with the Popover service.
 */
export interface PopoverConfig<DataType = unknown> {
  backdropClass: string | string[];
  data?: DataType;
  disableClose: boolean;
  panelClass: string | string[];
  arrowOffset: number;
  arrowSize: number;
  preferredPosition?: {
    overlayX: HorizontalConnectionPos;
    overlayY: VerticalConnectionPos;
  };
}
