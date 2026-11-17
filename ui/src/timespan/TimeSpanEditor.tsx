import * as React from 'react';
import moment from 'moment';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import Popper, {type PopperProps} from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {TagPicker} from '../tag/TagPicker';
import {TagSelectorEntry} from '../tag/tagSelectorEntry';
import {DateTimeSelector} from '../common/DateTimeSelector';
import {formatDuration} from './team/teamutils';

// The times are chosen in steps of a quarter of an hour.
export const MINUTES_STEP = 15;
const roundToStep = (value: moment.Moment) =>
    moment(value)
        .startOf('minute')
        .minutes(Math.round(value.minutes() / MINUTES_STEP) * MINUTES_STEP);

// The current time, rounded down to a quarter of an hour.
export const nowInSteps = () => {
    const now = moment().startOf('minute');
    return now.minutes(Math.floor(now.minutes() / MINUTES_STEP) * MINUTES_STEP);
};

export const EDITOR_CLASS = 'traggo-time-span-editor';

export interface TimeSpanEditorResult {
    tags: TagSelectorEntry[];
    note: string;
    start: moment.Moment;
    end: moment.Moment;
}

interface TimeSpanEditorProps {
    anchorEl: PopperProps['anchorEl'];
    start: moment.Moment;
    end: moment.Moment;
    // The calendar knows the time by the selection or the position of the event, the list has to ask for it.
    editableTime?: boolean;
    initialTags: TagSelectorEntry[];
    initialNote: string;
    // a time span which does exist already can be removed
    onDelete?: () => Promise<unknown> | void;
    onConfirm: (result: TimeSpanEditorResult) => Promise<unknown> | void;
    onCancel: () => void;
}

const describe = (start: moment.Moment, end: moment.Moment) => {
    const sameDay = start.isSame(end, 'day');
    return `${start.format('YYYY-MM-DD HH:mm')} – ${end.format(sameDay ? 'HH:mm' : 'YYYY-MM-DD HH:mm')} · ${formatDuration(
        end.diff(start, 'seconds')
    )}`;
};

// The card to enter the work content and the tags of a time span, it is used to create and to edit a time span.
export const TimeSpanEditor: React.FC<TimeSpanEditorProps> = ({
    anchorEl,
    start: initialStart,
    end: initialEnd,
    editableTime = false,
    initialTags,
    initialNote,
    onDelete,
    onConfirm,
    onCancel,
}) => {
    const [tags, setTags] = React.useState<TagSelectorEntry[]>(initialTags);
    const [note, setNote] = React.useState(initialNote);
    const [start, setStart] = React.useState(initialStart);
    const [end, setEnd] = React.useState(initialEnd);
    const [busy, setBusy] = React.useState(false);
    // The popup of the time is not part of the card, clicking inside of it must not close it.
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const blocked = pickerOpen;
    const mounted = React.useRef(true);
    React.useEffect(
        () => () => {
            mounted.current = false;
        },
        []
    );

    const timeError = end.isAfter(start) ? '' : '结束时间必须晚于开始时间';

    const run = (action: () => Promise<unknown> | void) => {
        if (busy) {
            return;
        }
        setBusy(true);
        Promise.resolve(action()).finally(() => {
            if (mounted.current) {
                setBusy(false);
            }
        });
    };
    const confirm = () => {
        if (!timeError) {
            run(() => onConfirm({tags, note, start, end}));
        }
    };

    return (
        <Popper open anchorEl={anchorEl} placement="bottom-start" style={{zIndex: 1300}}>
            <ClickAwayListener
                onClickAway={() => {
                    if (!blocked) {
                        onCancel();
                    }
                }}>
                <Paper
                    className={EDITOR_CLASS}
                    elevation={8}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' && !blocked) {
                            onCancel();
                        }
                    }}
                    sx={(theme) => {
                        const dark = theme.palette.mode === 'dark';
                        return {
                            width: 440,
                            maxWidth: 'calc(100vw - 16px)',
                            padding: 2,
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '14px',
                            // a soft shadow with a faint glow of the primary color around it
                            boxShadow: `0 8px 24px rgba(${dark ? '0,0,0,0.45' : '15,23,42,0.10'}), 0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 8%, transparent)`,
                        };
                    }}>
                    {editableTime ? (
                        <Box sx={{display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap'}}>
                            <DateTimeSelector
                                label="开始"
                                showDate={true}
                                selectedDate={start}
                                onSelectDate={(date) => setStart(roundToStep(date))}
                                minutesStep={MINUTES_STEP}
                                popoverOpen={setPickerOpen}
                            />
                            <DateTimeSelector
                                label="结束"
                                showDate={true}
                                selectedDate={end}
                                onSelectDate={(date) => setEnd(roundToStep(date))}
                                minutesStep={MINUTES_STEP}
                                popoverOpen={setPickerOpen}
                            />
                            <Typography variant="caption" color={timeError ? 'error' : 'text.secondary'}>
                                {timeError || formatDuration(end.diff(start, 'seconds'))}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            {describe(start, end)}
                        </Typography>
                    )}
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        margin="dense"
                        label="工作内容"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                confirm();
                            }
                        }}
                    />
                    <TagPicker label="标签" selectedEntries={tags} onSelectedEntriesChanged={setTags} />
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, marginTop: 2}}>
                        {onDelete ? (
                            <Button color="error" disabled={busy} onClick={() => run(onDelete)}>
                                删除
                            </Button>
                        ) : null}
                        <Box sx={{flexGrow: 1}} />
                        <Button disabled={busy} onClick={onCancel}>
                            取消
                        </Button>
                        <Button variant="contained" disabled={busy || !!timeError} onClick={confirm}>
                            确定
                        </Button>
                    </Box>
                </Paper>
            </ClickAwayListener>
        </Popper>
    );
};
