import * as React from 'react';

const KEY = 'traggo.theme.followTime';
const EVENT = 'traggo-follow-system-theme';

// On by default: only an explicit "off" turns it off. The choice belongs to the device.
// (The key is the one of the former "follow the time" option, so an existing choice is kept.)
const read = (): boolean => {
    try {
        return window.localStorage.getItem(KEY) !== 'off';
    } catch {
        return true;
    }
};

export const setFollowSystemTheme = (follow: boolean) => {
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

export const useFollowSystemTheme = (): boolean => React.useSyncExternalStore(subscribeFollow, read, () => true);

const QUERY = '(prefers-color-scheme: dark)';

const matches = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;

const subscribeSystem = (callback: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return () => undefined;
    }
    const media = window.matchMedia(QUERY);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
};

// Is the system (macOS, Windows, ...) in dark mode? Follows the automatic switch of the system without a reload.
export const useSystemDark = (): boolean => React.useSyncExternalStore(subscribeSystem, matches, () => false);
