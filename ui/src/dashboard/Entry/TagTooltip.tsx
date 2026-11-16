import type {TooltipContentProps, TooltipPayload} from 'recharts';
import {FInterval} from './dateformat';
import Paper from '@mui/material/Paper';
import {Typography} from '@mui/material';
import moment from 'moment-timezone';
import {formatDurationZh} from '../../utils/duration';

// recharts passes `active` and `payload` to the element which is given as `content`
type ContentProps = Partial<Pick<TooltipContentProps, 'active' | 'payload'>>;

export const TagTooltip = ({active, payload, dateFormat, total}: ContentProps & {dateFormat: FInterval; total: boolean}) => {
    if (active && payload) {
        const first = payload[0];
        const start = dateFormat(moment(first.payload.start));
        const end = dateFormat(moment(first.payload.end));

        return (
            <Paper style={{padding: 10}} elevation={4}>
                {first && <Typography variant={'subtitle2'}>{start === end ? `${start}` : `${start} - ${end}`}</Typography>}
                {payload.map((entry) => (
                    <Typography key={String(entry.name)}>
                        {entry.name}: {formatDurationZh(entry.payload.data[String(entry.name)] as number)}
                    </Typography>
                ))}
                {total ? (
                    <Typography>
                        合计：
                        {formatDurationZh(sum(payload))}
                    </Typography>
                ) : undefined}
            </Paper>
        );
    }

    return null;
};

const sum = (payload: TooltipPayload): number =>
    payload.reduce((acc, entry) => acc + (entry.payload.data[String(entry.name)] as number), 0);
