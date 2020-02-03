import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs';

export interface ContextMenuAction {
  icon: string;
  activate: () => void;
  style?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuActionService {
  navbarAction$ = new ReplaySubject<ContextMenuAction|undefined>(1);
  footerActions$ = new ReplaySubject<ContextMenuAction[]>(1);
}
