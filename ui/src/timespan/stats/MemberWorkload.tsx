import * as React from 'react';
import {Link as RouterLink} from 'react-router-dom';
import Box from '@mui/material/Box';
import MuiLink from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {TeamStatistics} from '../../gql/types';
import {MemberAvatar} from '../team/MemberAvatar';
import {formatDuration} from '../team/teamutils';
import {memberLogPath} from '../team/TeamPage';
import {statsStyles as styles} from './statsStyles';
import {ShareBar} from './StatsWidgets';

interface MemberWorkloadProps {
    members: TeamStatistics['teamStats']['members'];
    totalSeconds: number;
}

export const MemberWorkload: React.FC<MemberWorkloadProps> = ({members, totalSeconds}) => (
    <Paper sx={styles.section}>
        <Typography variant="h6" gutterBottom={true}>
            成员工作量
        </Typography>
        {members.length === 0 ? (
            <Typography color="textSecondary">团队里还没有成员。</Typography>
        ) : (
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>成员</TableCell>
                        <TableCell align="right">工作时间</TableCell>
                        <TableCell>占比</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {members.map(({member, seconds}) => (
                        <TableRow key={member.id} hover={true}>
                            <TableCell>
                                <Box sx={styles.member}>
                                    <MemberAvatar id={member.id} name={member.name} size={32} />
                                    <MuiLink
                                        sx={styles.memberName}
                                        component={RouterLink}
                                        to={memberLogPath(member.id)}
                                        title={`查看 ${member.name} 的日志`}>
                                        {member.name}
                                    </MuiLink>
                                </Box>
                            </TableCell>
                            <TableCell align="right">{formatDuration(seconds)}</TableCell>
                            <TableCell>
                                <ShareBar share={totalSeconds > 0 ? seconds / totalSeconds : 0} />
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow>
                        <TableCell>
                            <strong>合计</strong>
                        </TableCell>
                        <TableCell align="right">
                            <strong>{formatDuration(totalSeconds)}</strong>
                        </TableCell>
                        <TableCell>
                            <strong>100%</strong>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )}
    </Paper>
);
