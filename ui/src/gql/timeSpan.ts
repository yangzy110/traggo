import {gql} from '@apollo/client';

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
            tagColors {
                key
                color
            }
        }
    }
`;

// The time spans of a range, the server returns at most 100 per request (see fetchAllTimeSpans).
export const TimeSpansInRange = gql`
    query TimeSpansInRange($start: Time!, $end: Time!, $cursor: InputCursor) {
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
    query TeamStatistics($start: Time!, $end: Time!) {
        teamStats(fromInclusive: $start, toInclusive: $end) {
            totalSeconds
            tags {
                key
                value
                seconds
                members {
                    member {
                        id
                        name
                    }
                    seconds
                }
            }
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

export const MyStats = gql`
    query MyStatistics($start: Time!, $end: Time!) {
        myStats(fromInclusive: $start, toInclusive: $end) {
            totalSeconds
            tags {
                key
                value
                seconds
            }
            days {
                day
                seconds
            }
        }
    }
`;

export const CheckImport = gql`
    query CheckImport($rows: [InputImportRow!]!, $createTags: [String!], $updates: [InputImportUpdate!]) {
        checkImport(rows: $rows, createTags: $createTags, updates: $updates) {
            imported
            updated
            missingTags
            rows {
                line
                status
                message
                missingTags
                conflict {
                    source
                    id
                    line
                    start
                    end
                    note
                    tags
                    sameTime
                }
            }
        }
    }
`;

export const ImportTimeSpans = gql`
    mutation ImportTimeSpans($rows: [InputImportRow!]!, $createTags: [String!], $updates: [InputImportUpdate!]) {
        importTimeSpans(rows: $rows, createTags: $createTags, updates: $updates) {
            imported
            updated
            missingTags
            rows {
                line
                status
                message
                missingTags
                conflict {
                    source
                    id
                    line
                    start
                    end
                    note
                    tags
                    sameTime
                }
            }
        }
    }
`;
