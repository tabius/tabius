import {Injectable, TemplateRef} from '@angular/core';
import {Observable, ReplaySubject} from 'rxjs';

export type ContextMenuTarget = (() => void)|TemplateRef<unknown>|ContextMenuAction[];

export interface ContextMenuAction {
  icon?: string;
  text?: string;
  text$?: Observable<string>;
  target: ContextMenuTarget;
  style?: any;
  textStyle?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuActionService {
  navbarAction$ = new ReplaySubject<ContextMenuAction|undefined>(1);
  footerActions$ = new ReplaySubject<ContextMenuAction[]>(1);
}

export function isSubmenuTarget(target: ContextMenuTarget): target is ContextMenuAction[] {
  return Array.isArray(target);
}

export function isFunctionalTarget(target: ContextMenuTarget): target is () => void {
  return typeof target === 'function';
}
