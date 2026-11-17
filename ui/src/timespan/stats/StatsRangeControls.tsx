import * as React from 'react';
import moment from 'moment-timezone';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {DAY_FORMAT} from '../team/teamutils';
import {statsStyles as styles} from './statsStyles';

const PRESETS = [
    {value: 'week', label: '近一周', days: 7},
    {value: 'month', label: '近一个月', days: 30},
    {value: 'year', label: '近一年', days: 365},
] as const;

type Preset = (typeof PRESETS)[number]['value'] | 'custom';

interface StatsRangeControlsProps {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
}

// The range of the statistics: a preset selects the whole range with one click, or the dates are chosen.
export const StatsRangeControls: React.FC<StatsRangeControlsProps> = ({from, to, onChange}) => {
    const [preset, setPreset] = React.useState<Preset>('week');

    const applyPreset = (value: Preset | null) => {
        if (!value) {
            return;
        }
        setPreset(value);
        const selected = PRESETS.find((p) => p.value === value);
        if (selected) {
            onChange(
                moment()
                    .subtract(selected.days - 1, 'day')
                    .format(DAY_FORMAT),
                moment().format(DAY_FORMAT)
            );
        }
    };

    return (
        <Box sx={styles.controls}>
            <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                value={preset}
                aria-label="统计范围"
                sx={styles.preset}
                onChange={(_, value: Preset | null) => applyPreset(value)}>
                {PRESETS.map(({value, label}) => (
                    <ToggleButton key={value} value={value}>
                        {label}
                    </ToggleButton>
                ))}
                <ToggleButton value="custom">自定义</ToggleButton>
            </ToggleButtonGroup>
            {preset === 'custom' ? (
                <>
                    <TextField
                        type="date"
                        value={from}
                        onChange={(e) => onChange(e.target.value, to)}
                        slotProps={{inputLabel: {shrink: true}}}
                    />
                    <Box component="span" sx={styles.separator}>
                        —
                    </Box>
                    <TextField
                        type="date"
                        value={to}
                        onChange={(e) => onChange(from, e.target.value)}
                        slotProps={{inputLabel: {shrink: true}}}
                    />
                </>
            ) : null}
        </Box>
    );
};
