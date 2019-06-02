import {Meta, Title} from '@angular/platform-browser';

export interface PageMetadata {
  title: string,
  description: string,
  keywords: string[],
  image?: string
}

export function updatePageMetadata(title: Title, meta: Meta, page: PageMetadata) {
  title.setTitle(page.title);
  meta.addTag({name: 'og:title', content: page.title});

  meta.addTag({name: 'description', content: page.description});
  meta.addTag({name: 'og:description', content: page.description});

  meta.addTag({name: 'keywords', content: page.keywords.join(',')});
  if (page.image) {
    meta.addTag({name: 'og:image', content: page.image});
  }
}
