import * as React from 'react';
import moment from 'moment';
import {useTheme} from '@mui/material';
import type {EventApi} from '@fullcalendar/core';
import {tagLabel} from '../../common/tagLabel';
import {tagStyle} from '../../common/tagStyle';

// The work content and a summary of the tags and the work content, which is used if there is only a single line.
const describeEvent = (event: EventApi): {note: string; summary: string} => {
    const note: string = (event.extendedProps.ts && event.extendedProps.ts.note) || '';
    return {note, summary: event.title && note ? `${event.title} · ${note}` : event.title || note};
};

// The tags are shown as small colored labels
const TagPills: React.FC<{event: EventApi; maxLines?: number}> = ({event, maxLines}) => {
    const theme = useTheme();
    const tags: Array<{key: string; value: string}> = (event.extendedProps.ts && event.extendedProps.ts.tags) || [];
    const colors: Record<string, string> = event.extendedProps.colors || {};
    if (tags.length === 0) {
        return null;
    }
    return (
        <span className="pills" style={maxLines ? {maxHeight: `${maxLines * 1.6}em`} : undefined}>
            {tags.map((tag) => {
                const color = colors[tag.key] || '#9e9e9e';
                return (
                    <span
                        key={tagLabel(tag)}
                        className="pill"
                        style={{
                            ...tagStyle(theme, color),
                            backgroundColor: `color-mix(in srgb, ${color} 30%, ${theme.palette.background.paper})`,
                            borderWidth: 1,
                            borderStyle: 'solid',
                        }}>
                        {tag.key}:{tag.value}
                    </span>
                );
            })}
        </span>
    );
};

export const EventContent: React.FC<{event: EventApi}> = ({event}) => {
    if (!event.start || !event.end) {
        return null;
    }

    const start = moment(event.start);
    const end = moment(event.end);
    const lines = Math.floor(end.diff(start, 'minute') / 15);
    const {note} = describeEvent(event);
    const hasTags = !!(event.extendedProps.ts && event.extendedProps.ts.tags && event.extendedProps.ts.tags.length);
    const time = (
        <b className="time">
            {start.format('LT')} - {end.format('LT')}
        </b>
    );

    if (lines < 2) {
        // a single line: the start, the tags and the work content
        return (
            <span className="ellipsis-single" title={event.title}>
                <b className="time">{start.format('LT')}</b> <TagPills event={event} />
                {note ? <span className="note"> {note}</span> : null}
            </span>
        );
    }

    // the time, below of it the tags and the work content in the same row
    return (
        <>
            {time}
            <div className="tag-row">
                {hasTags ? <TagPills event={event} /> : null}
                {note ? (
                    <span className="ellipsis note" title={note} style={{WebkitLineClamp: Math.max(1, lines - 1)}}>
                        {note}
                    </span>
                ) : null}
            </div>
        </>
    );
};

export const MonthEventContent: React.FC<{event: EventApi}> = ({event}) => {
    const {summary} = describeEvent(event);
    const text = `${moment(event.start!).format('HH:mm')} ${summary}`;
    return (
        <span className="ellipsis-single" title={text} style={{padding: '0 4px'}}>
            {text}
        </span>
    );
};
