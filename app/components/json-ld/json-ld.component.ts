import { ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'gt-json-ld',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class JsonLdComponent implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() json: object = {};

  @HostBinding('innerHTML') jsonLd!: SafeHtml;

  ngOnChanges(): void {
    const jsonString = JSON.stringify(this.json, null, 2).replace(/<\/script>/g, '<\\/script>');
    const innerHtml = `<script type="application/ld+json">${jsonString}</script>`;
    this.jsonLd = this.sanitizer.bypassSecurityTrustHtml(innerHtml);
  }
}
