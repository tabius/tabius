/**
 * Configuration for opening a popover with the Popover service.
 */
export interface PopoverConfig<T = any> {
  backdropClass: string|string[];
  data?: T;
  disableClose: boolean;
  panelClass: string|string[];
  arrowOffset: number;
  arrowSize: number;
  preferredPosition?: {
    overlayX: string;
    overlayY: string;
  };
}
