declare module 'citation-js' {
  export class Cite {
    constructor(data?: any);
    set(options: any): void;
    add(data: any): Cite;
    get(options?: any): any;
  }
}

