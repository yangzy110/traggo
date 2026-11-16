import ColorHash from 'color-hash';

const dark = new ColorHash({saturation: 0.35, lightness: 0.35});
const darkNone = new ColorHash({saturation: 0.35, lightness: 0.5});

const light = new ColorHash({saturation: 0.55, lightness: 0.45});
const lightNone = new ColorHash({saturation: 0.5, lightness: 0.4});

const softDark = new ColorHash({saturation: 0.4, lightness: 0.6});
const softLight = new ColorHash({saturation: 0.45, lightness: 0.5});

export enum ColorMode {
    Bold,
    Soft,
    None,
}

const mapping: Record<ColorMode, Record<'dark' | 'light', (s: string) => string>> = {
    [ColorMode.Bold]: {
        dark: (s) => dark.hex(s),
        light: (s) => light.hex(s),
    },
    [ColorMode.Soft]: {
        dark: (s) => softDark.hex(s),
        light: (s) => softLight.hex(s),
    },
    [ColorMode.None]: {
        dark: (s) => darkNone.hex(s),
        light: (s) => lightNone.hex(s),
    },
};

export const calculateColor = (s: string, mode: ColorMode, theme: 'light' | 'dark') => {
    return mapping[mode][theme](s);
};
