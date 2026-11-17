// The 16 colors (4 x 4) a tag can have, custom colors are not supported. They work as tinted labels in the light and in the dark theme.
export const TAG_PALETTE = [
    '#6366f1',
    '#38bdf8',
    '#2dd4bf',
    '#4ade80',
    '#a3e635',
    '#fbbf24',
    '#fb923c',
    '#ef4444',
    '#fb7185',
    '#f472b6',
    '#c084fc',
    '#8b5cf6',
    '#22d3ee',
    '#3b82f6',
    '#94a3b8',
    '#a8856b',
];

// The first color of the palette which is not used yet, if all are used the palette starts again.
export const pickTagColor = (used: string[]): string => {
    const lower = used.map((color) => color.toLowerCase());
    const free = TAG_PALETTE.find((color) => !lower.includes(color));
    return free || TAG_PALETTE[used.length % TAG_PALETTE.length];
};
