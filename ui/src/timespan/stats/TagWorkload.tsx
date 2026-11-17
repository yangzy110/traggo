import * as React from 'react';
import {Link as RouterLink} from 'react-router-dom';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import Box from '@mui/material/Box';
import MuiLink from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material';
import {tagLabel} from '../../common/tagLabel';
import {TagChip} from '../../common/TagChip';
import {TeamStatistics} from '../../gql/types';
import {calculateColor, ColorMode} from '../colorutils';
import {MemberAvatar} from '../team/MemberAvatar';
import {formatDuration} from '../team/teamutils';
import {memberLogPath} from '../team/TeamPage';
import {statsStyles as styles} from './statsStyles';
import {ShareBar, StackedBar} from './StatsWidgets';

export const TagWorkload: React.FC<{tags: TeamStatistics['teamStats']['tags']}> = ({tags}) => {
    const theme = useTheme();
    const [openTag, setOpenTag] = React.useState('');
    const tagTotal = tags.reduce((sum, tag) => sum + tag.seconds, 0);

    return (
        <Paper sx={styles.section}>
            <Typography variant="h6" gutterBottom={true}>
                标签工作量
            </Typography>
            {tags.length === 0 ? (
                <Typography color="textSecondary">这段时间内还没有带标签的记录。</Typography>
            ) : (
                <>
                    <StackedBar
                        parts={tags.map((tag) => ({
                            label: tagLabel(tag),
                            seconds: tag.seconds,
                            color: calculateColor(tag.key, ColorMode.Soft, theme.palette.mode),
                        }))}
                    />
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>标签</TableCell>
                                <TableCell align="right">工作时间</TableCell>
                                <TableCell>占比</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tags.map((tag) => {
                                const id = tagLabel(tag);
                                const share = tagTotal > 0 ? tag.seconds / tagTotal : 0;
                                const open = openTag === id;
                                return (
                                    <React.Fragment key={id}>
                                        <TableRow
                                            hover={true}
                                            sx={{cursor: 'pointer'}}
                                            onClick={() => setOpenTag(open ? '' : id)}>
                                            <TableCell>
                                                <Box sx={styles.member}>
                                                    {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                                    <TagChip
                                                        label={id}
                                                        color={calculateColor(tag.key, ColorMode.Soft, theme.palette.mode)}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">{formatDuration(tag.seconds)}</TableCell>
                                            <TableCell>
                                                <ShareBar share={share} />
                                            </TableCell>
                                        </TableRow>
                                        {open
                                            ? tag.members.map(({member, seconds}) => (
                                                  <TableRow key={id + member.id}>
                                                      <TableCell sx={{paddingLeft: 6}}>
                                                          <Box sx={styles.member}>
                                                              <MemberAvatar id={member.id} name={member.name} size={24} />
                                                              <MuiLink
                                                                  sx={styles.memberName}
                                                                  component={RouterLink}
                                                                  to={memberLogPath(member.id)}>
                                                                  {member.name}
                                                              </MuiLink>
                                                          </Box>
                                                      </TableCell>
                                                      <TableCell align="right">{formatDuration(seconds)}</TableCell>
                                                      <TableCell>
                                                          <ShareBar share={tag.seconds > 0 ? seconds / tag.seconds : 0} />
                                                      </TableCell>
                                                  </TableRow>
                                              ))
                                            : null}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </>
            )}
        </Paper>
    );
};
