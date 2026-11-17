package timespan

import (
	"sort"
	"strings"
	"time"

	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// span is a finished time span, as it is compared during an import.
type span struct {
	// id of an existing time span, 0 for rows of the import
	id int
	// line of the row of the import, 0 for existing time spans
	line  int
	start time.Time
	end   time.Time
	note  string
	tags  []string
}

func (a span) signature() string {
	sorted := append([]string{}, a.tags...)
	sort.Strings(sorted)
	return strings.Join(sorted, "\x00")
}

func (a span) overlaps(b span) bool {
	return a.start.Before(b.end) && a.end.After(b.start)
}

func (a span) sameTime(b span) bool {
	return a.start.Equal(b.start) && a.end.Equal(b.end)
}

func (a span) same(b span) bool {
	return a.sameTime(b) && a.note == b.note && a.signature() == b.signature()
}

// existingSpans returns the finished time spans of the user which touch the range.
func (r *ResolverForTimeSpan) existingSpans(userID int, from time.Time, to time.Time) ([]span, error) {
	var spans []model.TimeSpan
	err := r.DB.Where("user_id = ? AND end_utc IS NOT NULL AND start_utc < ? AND end_utc > ?", userID, to, from).Find(&spans).Error
	if err != nil {
		return nil, err
	}
	index := map[int]int{}
	result := make([]span, len(spans))
	for i, s := range spans {
		result[i] = span{id: s.ID, start: s.StartUTC, end: *s.EndUTC, note: s.Note, tags: []string{}}
		index[s.ID] = i
	}
	var tags []model.TimeSpanTag
	err = r.DB.Joins("JOIN time_spans ON time_spans.id = time_span_tags.time_span_id").
		Where("time_spans.user_id = ? AND time_spans.end_utc IS NOT NULL AND time_spans.start_utc < ? AND time_spans.end_utc > ?", userID, to, from).
		Find(&tags).Error
	if err != nil {
		return nil, err
	}
	for _, tag := range tags {
		i := index[tag.TimeSpanID]
		result[i].tags = append(result[i].tags, tagLabel(tag))
	}
	return result, nil
}

func toConflict(other span, current span) *gqlmodel.ImportConflict {
	conflict := &gqlmodel.ImportConflict{
		Source:   gqlmodel.ImportConflictSourceFile,
		Start:    model.Time(other.start.UTC()),
		End:      model.Time(other.end.UTC()),
		Note:     other.note,
		Tags:     other.tags,
		SameTime: other.sameTime(current),
	}
	if other.id != 0 {
		id := other.id
		conflict.Source = gqlmodel.ImportConflictSourceExisting
		conflict.ID = &id
	} else {
		line := other.line
		conflict.Line = &line
	}
	return conflict
}

// findConflict returns the first time span which is the same as the current one (duplicate), or otherwise the first
// time span with the same time or an overlapping time (conflict).
func findConflict(known []span, current span) (duplicate bool, conflict *span) {
	for i, other := range known {
		if current.same(other) {
			return true, nil
		}
		if other.overlaps(current) && (conflict == nil || (other.sameTime(current) && !conflict.sameTime(current))) {
			conflict = &known[i]
		}
	}
	return false, conflict
}
