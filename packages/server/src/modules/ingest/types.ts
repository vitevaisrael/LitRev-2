export interface ParsedDoc {
  pages: {
    page: number;
    sentences: {
      idx: number;
      text: string;
    }[];
  }[];
}
