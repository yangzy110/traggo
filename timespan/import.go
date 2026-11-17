package timespan

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// MaxImportRows is the maximum amount of rows of one import.
const MaxImportRows = 1500

const defaultImportedTagColor = "#8b93f8"

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

// splitTag splits "name" or the older "name:value" into the key and the value.
func splitTag(label string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(label), ":", 2)
	key := strings.ToLower(strings.TrimSpace(parts[0]))
	if len(parts) == 2 {
		return key, strings.TrimSpace(parts[1])
	}
	return key, ""
}

// normalizeTags returns the tags as "name" or "name:value", every key only once.
func normalizeTags(labels []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, label := range labels {
		key, value := splitTag(label)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		if value != "" {
			key += ":" + value
		}
		result = append(result, key)
	}
	return result
}

// existingTags returns the keys of the tags the user can use: the own and the shared tags.
func (r *ResolverForTimeSpan) existingTags(userID int) (map[string]bool, error) {
	var definitions []model.TagDefinition
	if err := r.DB.Where("user_id = ? OR shared = ?", userID, true).Find(&definitions).Error; err != nil {
		return nil, err
	}
	result := map[string]bool{}
	for _, definition := range definitions {
		result[definition.Key] = true
	}
	return result, nil
}

func tagLabel(tag model.TimeSpanTag) string {
	if tag.StringValue != "" {
		return tag.Key + ":" + tag.StringValue
	}
	return tag.Key
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

type importPlan struct {
	result  *gqlmodel.ImportResult
	toWrite []int // the indices of the rows which are imported
	rows    []*gqlmodel.InputImportRow
	tags    [][]string
	updates []*gqlmodel.InputImportUpdate
	create  []string // the tags which are created
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

func (r *ResolverForTimeSpan) planImport(ctx context.Context, rows []*gqlmodel.InputImportRow, createTags []string, updates []*gqlmodel.InputImportUpdate) (*importPlan, error) {
	if len(rows) > MaxImportRows {
		return nil, fmt.Errorf("an import must not contain more than %d rows", MaxImportRows)
	}
	user := auth.GetUser(ctx)
	plan := &importPlan{result: &gqlmodel.ImportResult{Rows: []*gqlmodel.ImportRowResult{}, MissingTags: []string{}}, rows: rows, updates: updates}
	if len(rows) == 0 && len(updates) == 0 {
		return plan, nil
	}

	existingTags, err := r.existingTags(user.ID)
	if err != nil {
		return nil, err
	}
	creatable := map[string]bool{}
	if user.Admin {
		for _, name := range createTags {
			if key, _ := splitTag(name); key != "" {
				creatable[key] = true
			}
		}
	}

	known, err := r.loadKnown(user.ID, rows, updates)
	if err != nil {
		return nil, err
	}
	// the updates change the work content and the tags of existing time spans
	if err := plan.applyUpdates(known, existingTags, creatable); err != nil {
		return nil, err
	}

	missing := map[string]bool{}
	toCreate := map[string]bool{}
	for index, row := range rows {
		names := normalizeTags(row.Tags)
		plan.tags = append(plan.tags, names)
		current := span{line: row.Line, start: row.Start.UTC(), end: row.End.UTC(), note: row.Note, tags: names}
		result := &gqlmodel.ImportRowResult{Line: row.Line, Status: gqlmodel.ImportStatusOk, MissingTags: []string{}}

		var unknown, willCreate []string
		for _, label := range names {
			key, _ := splitTag(label)
			switch {
			case existingTags[key]:
			case creatable[key]:
				willCreate = append(willCreate, key)
			default:
				unknown = append(unknown, key)
				missing[key] = true
			}
		}
		result.MissingTags = append(result.MissingTags, unknown...)

		duplicate, conflict := findConflict(known, current)
		switch {
		case !current.start.Before(current.end):
			result.Status, result.Message = gqlmodel.ImportStatusError, "the end must be after the start"
		case duplicate:
			result.Status, result.Message = gqlmodel.ImportStatusDuplicate, "the time span exists already"
		case conflict != nil:
			result.Status, result.Message = gqlmodel.ImportStatusConflict, "the time overlaps with another time span"
			result.Conflict = toConflict(*conflict, current)
		case len(unknown) > 0:
			result.Status, result.Message = gqlmodel.ImportStatusMissingTags, "tags do not exist: "+strings.Join(unknown, ", ")
		}

		if result.Status == gqlmodel.ImportStatusOk {
			for _, key := range willCreate {
				toCreate[key] = true
			}
			known = append(known, current)
			plan.toWrite = append(plan.toWrite, index)
			plan.result.Imported++
		}
		plan.result.Rows = append(plan.result.Rows, result)
	}
	for name := range missing {
		plan.result.MissingTags = append(plan.result.MissingTags, name)
	}
	sort.Strings(plan.result.MissingTags)
	for name := range toCreate {
		plan.create = append(plan.create, name)
	}
	sort.Strings(plan.create)
	plan.result.Updated = len(updates)
	return plan, nil
}

// loadKnown loads the finished time spans of the user which touch the range of the rows, and the time spans which are updated.
func (r *ResolverForTimeSpan) loadKnown(userID int, rows []*gqlmodel.InputImportRow, updates []*gqlmodel.InputImportUpdate) ([]span, error) {
	known := []span{}
	if len(rows) > 0 {
		from, to := rows[0].Start.UTC(), rows[0].End.UTC()
		for _, row := range rows {
			if row.Start.UTC().Before(from) {
				from = row.Start.UTC()
			}
			if row.End.UTC().After(to) {
				to = row.End.UTC()
			}
		}
		var err error
		if known, err = r.existingSpans(userID, from, to); err != nil {
			return nil, err
		}
	}
	loaded := map[int]bool{}
	for _, s := range known {
		loaded[s.id] = true
	}
	for _, update := range updates {
		if loaded[update.ID] {
			continue
		}
		var spans []model.TimeSpan
		err := r.DB.Where("id = ? AND user_id = ? AND end_utc IS NOT NULL", update.ID, userID).Preload("Tags").Find(&spans).Error
		if err != nil {
			return nil, err
		}
		for _, s := range spans {
			item := span{id: s.ID, start: s.StartUTC, end: *s.EndUTC, note: s.Note, tags: []string{}}
			for _, tag := range s.Tags {
				item.tags = append(item.tags, tagLabel(tag))
			}
			known = append(known, item)
			loaded[s.ID] = true
		}
	}
	return known, nil
}

// applyUpdates validates the updates and changes the compared time spans like the updates will change them.
func (p *importPlan) applyUpdates(known []span, existingTags map[string]bool, creatable map[string]bool) error {
	seen := map[int]bool{}
	for _, update := range p.updates {
		if seen[update.ID] {
			return fmt.Errorf("time span with id %d is updated twice", update.ID)
		}
		seen[update.ID] = true
		found := false
		for i := range known {
			if known[i].id != update.ID {
				continue
			}
			found = true
			tags := normalizeTags(update.Tags)
			for _, label := range tags {
				if key, _ := splitTag(label); !existingTags[key] && !creatable[key] {
					return fmt.Errorf("tag '%s' does not exist", key)
				}
			}
			known[i].note = update.Note
			known[i].tags = tags
		}
		if !found {
			return fmt.Errorf("time span with id %d does not exist", update.ID)
		}
	}
	return nil
}

// CheckImport tells for every row if it can be imported. Nothing is written.
func (r *ResolverForTimeSpan) CheckImport(ctx context.Context, rows []*gqlmodel.InputImportRow, createTags []string, updates []*gqlmodel.InputImportUpdate) (*gqlmodel.ImportResult, error) {
	plan, err := r.planImport(ctx, rows, createTags, updates)
	if err != nil {
		return nil, err
	}
	return plan.result, nil
}

// ImportTimeSpans writes the rows which are ok and applies the updates. The tags in createTags are created by admins.
// Either everything is written or nothing.
func (r *ResolverForTimeSpan) ImportTimeSpans(ctx context.Context, rows []*gqlmodel.InputImportRow, createTags []string, updates []*gqlmodel.InputImportUpdate) (*gqlmodel.ImportResult, error) {
	user := auth.GetUser(ctx)
	plan, err := r.planImport(ctx, rows, createTags, updates)
	if err != nil {
		return nil, err
	}

	tx := r.DB.Begin()
	for _, name := range plan.create {
		exists := !tx.Where("key = ? AND (user_id = ? OR shared = ?)", name, user.ID, true).Find(new(model.TagDefinition)).RecordNotFound()
		if exists {
			continue
		}
		if err := tx.Create(&model.TagDefinition{Key: name, Color: defaultImportedTagColor, UserID: user.ID, Shared: true}).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}
	for _, update := range plan.updates {
		if err := tx.Model(new(model.TimeSpan)).Where("id = ? AND user_id = ?", update.ID, user.ID).Update("note", update.Note).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		if err := tx.Where("time_span_id = ?", update.ID).Delete(new(model.TimeSpanTag)).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		for _, label := range normalizeTags(update.Tags) {
			key, value := splitTag(label)
			if err := tx.Create(&model.TimeSpanTag{TimeSpanID: update.ID, Key: key, StringValue: value}).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		}
	}
	for _, index := range plan.toWrite {
		row := plan.rows[index]
		end := row.End
		tags := []*gqlmodel.InputTimeSpanTag{}
		for _, label := range plan.tags[index] {
			key, value := splitTag(label)
			tags = append(tags, &gqlmodel.InputTimeSpanTag{Key: key, Value: value})
		}
		timeSpan, err := timespanToInternal(user.ID, row.Start, &end, tags, row.Note)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		if err := tx.Create(&timeSpan).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	return plan.result, nil
}
