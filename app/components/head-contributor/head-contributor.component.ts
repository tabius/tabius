import {ChangeDetectionStrategy, Component, Inject, Input, OnChanges} from '@angular/core';
import {DOCUMENT} from '@angular/common';

export interface HeadElementData {
  tag: string;
  attributes: Map<string, string>;
}

/**
 *  Component that allows to contribute to the document <head> element from any Angular component.
 *
 *  Note: not using Renderer API to avoid custom attributes like _ngcontent-sc5=""
 */
@Component({
  selector: 'gt-head-contributor',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeadContributorComponent implements OnChanges {
  @Input() data?: HeadElementData;

  private element?: Element;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
  }

  ngOnChanges(): void {
    this.removeElement();
    if (this.data) {
      this.element = this.document.createElement(this.data.tag);
      for (const [name, value] of this.data.attributes) {
        this.element.setAttribute(name, value);
      }
      this.document.head.appendChild(this.element);
    }
  }

  ngOnDestroy(): void {
    this.removeElement();
  }

  private removeElement() {
    if (this.element) {
      this.document.head.removeChild(this.element);
    }
  }
}
