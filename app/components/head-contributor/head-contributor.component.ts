import { ChangeDetectionStrategy, Component, Inject, Input, OnChanges, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadContributorComponent implements OnChanges, OnDestroy {
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

@Component({
  selector: 'gt-head-meta',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetaHeadContributorComponent extends HeadContributorComponent {
  @Input() set attrs({ name, content }: { name: string; content: string }) {
    this.data = {
      tag: 'meta',
      attributes: new Map([
        ['name', name],
        ['content', content],
      ]),
    };
  }
}

@Component({
  selector: 'gt-head-link',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkHeadContributorComponent extends HeadContributorComponent {
  @Input() set attrs({ rel, href }: { rel: string; href: string }) {
    this.data = {
      tag: 'link',
      attributes: new Map([
        ['rel', rel],
        ['href', href],
      ]),
    };
  }
}

@Component({
  selector: 'gt-head-canonical-link',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanonicalLinkHeadContributorComponent extends LinkHeadContributorComponent {
  @Input() set href(href: string) {
    this.attrs = { rel: 'canonical', href };
  }
}
