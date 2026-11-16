import * as React from 'react';
import {entryTypeLabels, intervalLabels, label} from '../../common/labels';
import TextField from '@mui/material/TextField';
import {useQuery} from '@apollo/client/react';
import {
    Tags,
    EntryType,
    StatsInterval,
    Dashboards_dashboards_items,
    Dashboards_dashboards_items_statsSelection_range,
} from '../../gql/types';
import * as gqlTags from '../../gql/tags';
import {toTagSelectorEntry} from '../../tag/tagSelectorEntry';
import {FormTagSelector} from '../../tag/FormTagSelector';
import {RelativeDateTimeSelector} from '../../common/RelativeDateTimeSelector';
import {parseRelativeTime} from '../../utils/time';
import {Box, Typography, Switch} from '@mui/material';

interface EditPopupProps {
    entry: Dashboards_dashboards_items;
    onChange: (entry: Dashboards_dashboards_items | null) => void;
    disabled?: boolean;
    ranges: Record<string, string>;
}

export const isValidDashboardEntry = (item: Dashboards_dashboards_items): boolean => {
    return (
        item.statsSelection.tags !== null &&
        item.statsSelection.tags.length > 0 &&
        ((item.statsSelection.range &&
            parseRelativeTime(item.statsSelection.range.from, 'startOf').success &&
            parseRelativeTime(item.statsSelection.range.to, 'startOf').success) ||
            !!item.statsSelection.rangeId) &&
        item.title.length > 0
    );
};
export const DashboardEntryForm: React.FC<EditPopupProps> = ({entry, onChange: setEntry, disabled = false, ranges}) => {
    const [staticRange, setStaticRange] = React.useState(!entry.statsSelection.rangeId);

    const tagsResult = useQuery<Tags>(gqlTags.Tags);

    let tagKeys;
    let excludeTags;
    let includeTags;
    if (!tagsResult.error && !tagsResult.loading && tagsResult.data && tagsResult.data.tags) {
        const keyInputTags = (entry.statsSelection.tags || []).map((key) => ({key, value: ''}));
        tagKeys = toTagSelectorEntry(tagsResult.data.tags, keyInputTags);
        excludeTags = toTagSelectorEntry(tagsResult.data.tags, entry.statsSelection.excludeTags || []);
        includeTags = toTagSelectorEntry(tagsResult.data.tags, entry.statsSelection.includeTags || []);
    }

    const range: Dashboards_dashboards_items_statsSelection_range = entry.statsSelection.range
        ? entry.statsSelection.range
        : {
              from: 'now/w',
              to: 'now/w',
              __typename: 'RelativeOrStaticRange',
          };

    return (
        <>
            <TextField
                label="标题"
                value={entry.title}
                disabled={disabled}
                onChange={(e) => {
                    entry.title = e.target.value;
                    setEntry(entry);
                }}
                fullWidth
            />
            <TextField
                select
                label="类型"
                margin="normal"
                fullWidth
                slotProps={{select: {native: true}}}
                value={entry.entryType}
                disabled={disabled}
                onChange={(e) => {
                    entry.entryType = e.target.value as EntryType;
                    setEntry(entry);
                }}>
                {Object.values(EntryType).map((type) => (
                    <option key={type} value={type}>
                        {label(entryTypeLabels, type)}
                    </option>
                ))}
            </TextField>
            <TextField
                select
                label="间隔"
                margin="normal"
                fullWidth
                slotProps={{select: {native: true}}}
                disabled={disabled}
                value={entry.statsSelection.interval}
                onChange={(e) => {
                    entry.statsSelection.interval = e.target.value as StatsInterval;
                    setEntry(entry);
                }}>
                {Object.values(StatsInterval).map((type) => (
                    <option key={type} value={type}>
                        {label(intervalLabels, type)}
                    </option>
                ))}
            </TextField>
            <Typography component="div">
                <Box component="label" sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Box>日期范围：</Box>
                    <Box>全局</Box>
                    <Box>
                        <Switch
                            checked={staticRange}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setStaticRange(true);
                                    entry.statsSelection.rangeId = null;
                                    setEntry(entry);
                                } else {
                                    setStaticRange(false);

                                    if (entry.statsSelection.range === null) {
                                        entry.statsSelection.range = range;
                                        setEntry(entry);
                                    }
                                }
                            }}
                        />
                    </Box>
                    <Box>固定</Box>
                </Box>
            </Typography>
            {staticRange ? (
                <>
                    <RelativeDateTimeSelector
                        label="从"
                        disabled={disabled}
                        value={range.from}
                        onChange={(startDate) => {
                            entry.statsSelection.rangeId = null;
                            entry.statsSelection.range = {...range, from: startDate};
                            setEntry(entry);
                        }}
                        type="startOf"
                    />
                    <RelativeDateTimeSelector
                        label="到"
                        disabled={disabled}
                        value={range.to}
                        onChange={(endDate) => {
                            entry.statsSelection.rangeId = null;
                            entry.statsSelection.range = {...range, to: endDate};
                            setEntry(entry);
                        }}
                        type="endOf"
                    />
                </>
            ) : (
                <TextField
                    select
                    fullWidth
                    disabled={disabled}
                    slotProps={{select: {native: true}}}
                    value={entry.statsSelection.rangeId || ''}
                    onChange={(e) => {
                        if (e.target.value === '') {
                            return;
                        }
                        entry.statsSelection.rangeId = parseInt(e.target.value, 10);
                        entry.statsSelection.range = null;
                        setEntry(entry);
                    }}>
                    {entry.statsSelection.rangeId ? undefined : (
                        <option key={''} value={''}>
                            选择日期范围
                        </option>
                    )}
                    {Object.keys(ranges).map((key) => (
                        <option key={key} value={key}>
                            {ranges[key]}
                        </option>
                    ))}
                </TextField>
            )}
            {entry.entryType !== EntryType.PieChart ? (
                <Typography component="div">
                    <Box component="label" sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        <Box>{getTotalTitle(entry.entryType)}</Box>
                        <Box>
                            <Switch
                                checked={entry.total}
                                onChange={(e) => {
                                    entry.total = e.target.checked;
                                    setEntry(entry);
                                }}
                            />
                        </Box>
                    </Box>
                </Typography>
            ) : undefined}
            <FormTagSelector
                label="标签"
                selectedEntries={tagKeys || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.tags = tags.map((tag) => tag.tag.key);
                    setEntry(entry);
                }}
                createTags={false}
                onlySelectKeys
            />

            <FormTagSelector
                label="排除"
                selectedEntries={excludeTags || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.excludeTags = tags.map((tag) => ({
                        key: tag.tag.key,
                        value: tag.value,
                        __typename: 'TimeSpanTag',
                    }));
                    setEntry(entry);
                }}
                allowDuplicateKeys
                createTags={false}
            />
            <FormTagSelector
                label="包含"
                selectedEntries={includeTags || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.includeTags = tags.map((tag) => ({
                        key: tag.tag.key,
                        value: tag.value,
                        __typename: 'TimeSpanTag',
                    }));
                    setEntry(entry);
                }}
                allowDuplicateKeys
                createTags={false}
            />
        </>
    );
};

const getTotalTitle = (entryType: EntryType) => {
    switch (entryType) {
        case EntryType.HorizontalTable:
            return 'Show "Total" row:';
        case EntryType.VerticalTable:
            return 'Show "Total" column:';
        case EntryType.BarChart:
        case EntryType.StackedBarChart:
        case EntryType.LineChart:
            return 'Show "Total" in tooltip:';
        default:
            return '';
    }
};
