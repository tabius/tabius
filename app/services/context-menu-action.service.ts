import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs';

export interface ContextMenuAction {
  icon: string;
  activate: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuActionService {
  activeAction$ = new ReplaySubject<ContextMenuAction|undefined>(1);
}
