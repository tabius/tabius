import {ChangeDetectionStrategy, Component, HostBinding, Input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'gt-json-ld',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLdComponent {
  @Input() json: object = {};

  @HostBinding('innerHTML') jsonLd!: SafeHtml;

  constructor(private readonly sanitizer: DomSanitizer) {
  }

  ngOnChanges(): void {
    const jsonString = JSON.stringify(this.json, null, 2).replace(/<\/script>/g, '<\\/script>');
    const innerHtml = `<script type="application/ld+json">${jsonString}</script>`;
    this.jsonLd = this.sanitizer.bypassSecurityTrustHtml(innerHtml);
  }
}
