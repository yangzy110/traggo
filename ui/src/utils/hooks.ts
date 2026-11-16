import * as React from 'react';

// `start` (re)starts the timer, `stop` cancels it. The latest callback is always used.
export const useTimeout = (callback: () => void, delayMs: number) => {
    const saved = React.useRef(callback);
    const handle = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    React.useEffect(() => {
        saved.current = callback;
    });
    const stop = React.useCallback(() => {
        if (handle.current !== undefined) {
            clearTimeout(handle.current);
            handle.current = undefined;
        }
    }, []);
    const start = React.useCallback(() => {
        stop();
        handle.current = setTimeout(() => saved.current(), delayMs);
    }, [delayMs, stop]);
    React.useEffect(() => stop, [stop]);
    return {start, stop};
};

export const useStateAndDelegateWithDelayOnChange: <T>(
    initialState: T,
    delegate: React.Dispatch<React.SetStateAction<T>>,
    delay?: number
) => [T, React.Dispatch<React.SetStateAction<T>>] = (initialState, delegate, delay = 50) => {
    const [value, setValue] = React.useState(initialState);
    const {start} = useTimeout(() => delegate(value), delay);
    return [
        value,
        (newValue) => {
            if (value !== newValue) {
                start();
            }
            setValue(newValue);
        },
    ];
};
