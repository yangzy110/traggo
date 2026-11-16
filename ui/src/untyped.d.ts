// Minimal type declarations for packages without types.
declare module 'color-hash' {
    interface Options {
        saturation?: number | number[];
        lightness?: number | number[];
    }
    export default class ColorHash {
        constructor(options?: Options);
        hex(input: string): string;
    }
}

declare module 'get-best-contrast-color' {
    const bestContrast: (color: string, candidates: string[]) => string;
    export default bestContrast;
}
