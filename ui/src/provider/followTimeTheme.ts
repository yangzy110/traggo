import * as React from 'react';

const KEY = 'traggo.theme.followTime';
const EVENT = 'traggo-follow-time-theme';

// On by default: only an explicit "off" turns it off. The choice belongs to the device.
const read = (): boolean => {
    try {
        return window.localStorage.getItem(KEY) !== 'off';
    } catch {
        return true;
    }
};

export const setFollowTimeTheme = (follow: boolean) => {
    try {
        window.localStorage.setItem(KEY, follow ? 'on' : 'off');
    } catch {
        // the storage is not available, the choice is only kept until the page is reloaded
    }
    window.dispatchEvent(new Event(EVENT));
};

const subscribeFollow = (callback: () => void) => {
    window.addEventListener(EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener(EVENT, callback);
        window.removeEventListener('storage', callback);
    };
};

export const useFollowTimeTheme = (): boolean => React.useSyncExternalStore(subscribeFollow, read, () => true);

// The dark mode is used in the evening and at night, by the clock of this device.
export const DARK_FROM_HOUR = 18;
export const DARK_UNTIL_HOUR = 6;

export const isDarkHour = (hour: number): boolean => hour >= DARK_FROM_HOUR || hour < DARK_UNTIL_HOUR;

// Is it dark now? The time is checked every minute, so that the theme changes without a reload.
export const useNightTime = (): boolean => {
    const [dark, setDark] = React.useState(() => isDarkHour(new Date().getHours()));
    React.useEffect(() => {
        const update = () => setDark(isDarkHour(new Date().getHours()));
        update();
        const timer = window.setInterval(update, 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);
    return dark;
};
