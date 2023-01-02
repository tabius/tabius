import {Meta, Title} from '@angular/platform-browser';
import {DeepReadonly} from '@common/typescript-extras';

export interface PageMetadata {
  title: string,
  description: string,
  keywords: string[],
  image?: string
}

export function updatePageMetadata(title: Title, meta: Meta, page: DeepReadonly<PageMetadata>): void {
  title.setTitle(page.title);

  meta.addTag({name: 'twitter:card', content: 'summary'});

  meta.addTag({name: 'og:title', content: page.title});
  meta.addTag({name: 'twitter:title', content: page.title});

  meta.addTag({name: 'description', content: page.description});
  meta.addTag({name: 'og:description', content: page.description});
  meta.addTag({name: 'twitter:description', content: page.description});

  meta.addTag({name: 'keywords', content: page.keywords.join(',')});

  if (page.image) {
    // meta.addTag({name: 'image_src', content: page.image});
    meta.addTag({name: 'og:image', content: page.image});
    meta.addTag({name: 'twitter:image', content: page.image});
  }
}
