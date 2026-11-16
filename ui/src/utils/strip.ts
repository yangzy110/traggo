// Returns a copy of the value without the `__typename` fields.
// The results of Apollo Client are frozen, therefore the value must not be modified.
export const stripTypename = <T>(value: T): T => {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((x) => stripTypename(x)) as T;
    }

    const copy: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, child]) => {
        if (key !== '__typename') {
            copy[key] = stripTypename(child);
        }
    });
    return copy as T;
};
