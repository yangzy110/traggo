import * as React from 'react';
import moment from 'moment';
import {DesktopDateTimePicker} from '@mui/x-date-pickers/DesktopDateTimePicker';
import {uglyConvertToLocalTime} from '../timespan/timeutils';
import {useSettings} from '../gql/settings';
import {DateTimeInputStyle} from '../gql/types';

interface DateTimeSelectorProps {
    selectedDate: moment.Moment;
    onSelectDate: (date: moment.Moment) => void;
    showDate: boolean;
    label: string;
    popoverOpen?: (open: boolean) => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = React.memo(
    ({selectedDate, onSelectDate, showDate, label, popoverOpen = () => {}}) => {
        const {done, dateTimeInputStyle} = useSettings();
        const [open, setOpen] = React.useState(false);

        if (!done) {
            return <span>...</span>;
        }

        if (dateTimeInputStyle === DateTimeInputStyle.Native) {
            return (
                <input
                    type="datetime-local"
                    value={selectedDate.format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) => {
                        onSelectDate(moment(e.target.value));
                    }}
                />
            );
        }

        const localeData = moment.localeData();
        const time = localeData.longDateFormat('LT').replace('A', 'a');
        const ampm = time.indexOf('a') !== -1;
        const format = showDate ? localeData.longDateFormat('L') + ' ' + time : time;

        return (
            <DesktopDateTimePicker
                format={format}
                ampm={ampm}
                label={label}
                openTo={showDate ? 'day' : 'hours'}
                value={uglyConvertToLocalTime(selectedDate)}
                onOpen={() => {
                    popoverOpen(true);
                    setOpen(true);
                }}
                onClose={() => {
                    popoverOpen(false);
                    setOpen(false);
                }}
                onChange={(value) => {
                    if (!value || !value.isValid()) {
                        return;
                    }
                    let date = value;

                    if (!showDate && !open) {
                        date = date.set({
                            date: selectedDate.date(),
                            month: selectedDate.month(),
                            year: selectedDate.year(),
                        });
                    }
                    if (uglyConvertToLocalTime(selectedDate).isSame(date)) {
                        return;
                    }

                    onSelectDate(date);
                }}
                slotProps={{
                    textField: {
                        variant: 'standard',
                        margin: 'none',
                        title: selectedDate.format(),
                        sx: {width: (showDate ? 185 : 105) + (ampm ? 20 : 0)},
                        slotProps: {input: {disableUnderline: true}},
                    },
                    openPickerButton: {size: 'small', sx: {color: 'text.secondary'}},
                    openPickerIcon: {fontSize: 'small'},
                }}
            />
        );
    }
);
