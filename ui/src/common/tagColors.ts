// The 16 colors (4 x 4) a tag can have, custom colors are not supported. They are deep enough for white text in the light and in the dark theme.
export const TAG_PALETTE = [
    '#4f46e5',
    '#2563eb',
    '#0284c7',
    '#0d9488',
    '#16a34a',
    '#65a30d',
    '#d97706',
    '#ea580c',
    '#dc2626',
    '#e11d48',
    '#db2777',
    '#9333ea',
    '#7c3aed',
    '#0891b2',
    '#475569',
    '#92400e',
];

// The first color of the palette which is not used yet, if all are used the palette starts again.
export const pickTagColor = (used: string[]): string => {
    const lower = used.map((color) => color.toLowerCase());
    const free = TAG_PALETTE.find((color) => !lower.includes(color));
    return free || TAG_PALETTE[used.length % TAG_PALETTE.length];
};
