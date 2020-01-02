import {Directive, Inject, Input, OnDestroy, OnInit} from '@angular/core';
import {DOCUMENT} from '@angular/common';

export interface HeadElementData {
  tag: string;
  attributes: Map<string, string>;
}

/**
 *  Directive that allows to contribute to the document <head> element from any Angular component.
 *
 *  Note: not using Renderer API to avoid custom attributes like _ngcontent-sc5=""
 */
@Directive({
  selector: '[headContributor]'
})
export class HeadContributorDirective implements OnDestroy, OnInit {

  @Input() data!: HeadElementData;

  private element?: Element;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
  }

  // todo: support changes
  ngOnInit(): void {
    this.element = this.document.createElement(this.data.tag);
    for (const [name, value] of this.data.attributes) {
      this.element.setAttribute(name, value);
    }
    this.document.head.appendChild(this.element);

  }

  ngOnDestroy(): void {
    if (this.element) {
      this.document.head.removeChild(this.element);
    }
  }
}
