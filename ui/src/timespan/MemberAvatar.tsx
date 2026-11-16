import * as React from 'react';
import Avatar from '@material-ui/core/Avatar';

// Gives every member a stable color derived from the user id.
const colorOf = (id: number) => `hsl(${(id * 47) % 360}, 55%, 42%)`;

export const MemberAvatar: React.FC<{id: number; name: string; size?: number}> = ({id, name, size = 40}) => (
    <Avatar style={{backgroundColor: colorOf(id), color: '#fff', width: size, height: size}}>
        {name.slice(0, 1).toUpperCase()}
    </Avatar>
);
