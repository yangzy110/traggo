import * as React from 'react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material';
import {statsStyles as styles} from './statsStyles';

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

export const WorkTimeChart: React.FC<{days: Array<{day: string; seconds: number}>}> = ({days}) => {
    const theme = useTheme();
    return (
        <Paper sx={styles.section}>
            <Typography variant="h6" gutterBottom={true}>
                团队工作时间(小时/天)
            </Typography>
            <Box sx={styles.chart}>
                <ResponsiveContainer>
                    <AreaChart data={days.map(({day, seconds}) => ({day, hours: hours(seconds)}))}>
                        <defs>
                            <linearGradient id="workTime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                        <XAxis
                            dataKey="day"
                            tickFormatter={(day: string) => day.slice(5)}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                            tick={{fill: theme.palette.text.secondary, fontSize: 12}}
                        />
                        <YAxis
                            type="number"
                            unit="h"
                            allowDecimals={true}
                            axisLine={false}
                            tickLine={false}
                            width={44}
                            tick={{fill: theme.palette.text.secondary, fontSize: 12}}
                        />
                        <Tooltip formatter={(value): [string, string] => [`${value} h`, '工作时间']} />
                        <Area
                            type="monotone"
                            dataKey="hours"
                            name="工作时间"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2.5}
                            fill="url(#workTime)"
                            dot={false}
                            activeDot={{r: 5}}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};
