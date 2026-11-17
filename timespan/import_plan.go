package timespan

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

type importPlan struct {
	result  *gqlmodel.ImportResult
	toWrite []int // the indices of the rows which are imported
	rows    []*gqlmodel.InputImportRow
	tags    [][]string
	updates []*gqlmodel.InputImportUpdate
	create  []string // the tags which are created
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
