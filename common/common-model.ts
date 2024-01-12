export interface WithId {
  readonly id: number;
}

export interface Versioned {
  readonly version: number;
}

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  image?: string;
}
