import {gql} from 'apollo-boost';

export const Trackers = gql`
    query Trackers {
        timers {
            id
            start
            end
            tags {
                key
                value
            }
            oldStart
            note
        }
    }
`;

export const TimeSpansInRange = gql`
    query TimeSpansInRange($start: Time!, $end: Time!) {
        timeSpans(fromInclusive: $start, toInclusive: $end) {
            timeSpans {
                id
                start
                end
                tags {
                    key
                    value
                }
                oldStart
                note
            }
            cursor {
                startId
                offset
                pageSize
            }
        }
    }
`;

export const TimeSpans = gql`
    query TimeSpans($cursor: InputCursor) {
        timeSpans(cursor: $cursor) @connection(key: "AllTimeSpans") {
            timeSpans {
                id
                start
                end
                tags {
                    key
                    value
                }
                oldStart
                note
            }
            cursor {
                startId
                offset
                pageSize
            }
        }
    }
`;

export const StartTimer = gql`
    mutation StartTimer($start: Time!, $tags: [InputTimeSpanTag!], $note: String!) {
        createTimeSpan(start: $start, tags: $tags, note: $note) {
            id
            start
            end
            tags {
                key
                value
            }
            oldStart
            note
        }
    }
`;

export const StopTimer = gql`
    mutation StopTimer($id: Int!, $end: Time!) {
        stopTimeSpan(id: $id, end: $end) {
            id
            start
            end
            tags {
                key
                value
            }
            oldStart
            note
        }
    }
`;

export const AddTimeSpan = gql`
    mutation AddTimeSpan($start: Time!, $end: Time!, $tags: [InputTimeSpanTag!], $note: String!) {
        createTimeSpan(start: $start, end: $end, tags: $tags, note: $note) {
            id
            start
            end
            tags {
                key
                value
            }
            oldStart
            note
        }
    }
`;

export const UpdateTimeSpan = gql`
    mutation UpdateTimeSpan($id: Int!, $start: Time!, $end: Time, $tags: [InputTimeSpanTag!], $oldStart: Time, $note: String!) {
        updateTimeSpan(id: $id, start: $start, end: $end, tags: $tags, oldStart: $oldStart, note: $note) {
            id
            start
            end
            tags {
                key
                value
            }
            oldStart
            note
        }
    }
`;
export const RemoveTimeSpan = gql`
    mutation RemoveTimeSpan($id: Int!) {
        removeTimeSpan(id: $id) {
            id
        }
    }
`;

export const TeamTimeSpans = gql`
    query TeamTimeSpans($start: Time!, $end: Time!, $userId: Int) {
        teamTimeSpans(fromInclusive: $start, toInclusive: $end, userId: $userId) {
            user {
                id
                name
            }
            timeSpan {
                id
                start
                end
                tags {
                    key
                    value
                }
                note
            }
        }
    }
`;

export const TimeSpansForExport = gql`
    query TimeSpansForExport($start: Time!, $end: Time!, $cursor: InputCursor) {
        timeSpans(fromInclusive: $start, toInclusive: $end, cursor: $cursor) {
            timeSpans {
                id
                start
                end
                tags {
                    key
                    value
                }
                note
            }
            cursor {
                hasMore
                startId
                offset
                pageSize
            }
        }
    }
`;

export const TeamMembers = gql`
    query TeamMembers {
        teamMembers {
            id
            name
        }
    }
`;

export const TeamStats = gql`
    query TeamStats($start: Time!, $end: Time!) {
        teamStats(fromInclusive: $start, toInclusive: $end) {
            totalSeconds
            days {
                day
                seconds
            }
            members {
                member {
                    id
                    name
                }
                seconds
            }
        }
    }
`;
