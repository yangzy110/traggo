import * as React from 'react';

const duration = 100;

export const Fade: React.FC<React.PropsWithChildren<{fullyVisible: boolean; opacity?: number}>> = ({
    fullyVisible,
    children,
    opacity = 0.4,
}) => {
    return <div style={{transition: `opacity ${duration}ms ease-in-out`, opacity: fullyVisible ? 1 : opacity}}>{children}</div>;
};
