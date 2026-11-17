// Fresh, friendly colors which work as tinted labels in the light and in the dark theme.
export const TAG_PALETTE = [
    '#6366f1',
    '#38bdf8',
    '#2dd4bf',
    '#4ade80',
    '#fbbf24',
    '#fb923c',
    '#fb7185',
    '#f472b6',
    '#c084fc',
    '#22d3ee',
    '#a3e635',
    '#818cf8',
];

// The first color of the palette which is not used yet, if all are used the palette starts again.
export const pickTagColor = (used: string[]): string => {
    const lower = used.map((color) => color.toLowerCase());
    const free = TAG_PALETTE.find((color) => !lower.includes(color));
    return free || TAG_PALETTE[used.length % TAG_PALETTE.length];
};
