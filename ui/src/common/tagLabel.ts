// A tag is only a name. Time spans which were created in the past can have a value (key:value), it is shown if it exists.
export const tagLabel = (tag: {key: string; value?: string | null}): string => (tag.value ? `${tag.key}:${tag.value}` : tag.key);
