package timespan

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// MaxImportRows is the maximum amount of rows of one import.
const MaxImportRows = 1500

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
	var usedColors []string
	if len(plan.create) > 0 {
		var definitions []model.TagDefinition
		if err := tx.Where("user_id = ? OR shared = ?", user.ID, true).Find(&definitions).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		for _, definition := range definitions {
			usedColors = append(usedColors, definition.Color)
		}
	}
	for _, name := range plan.create {
		exists := !tx.Where("key = ? AND (user_id = ? OR shared = ?)", name, user.ID, true).Find(new(model.TagDefinition)).RecordNotFound()
		if exists {
			continue
		}
		color := model.PickTagColor(usedColors)
		usedColors = append(usedColors, color)
		if err := tx.Create(&model.TagDefinition{Key: name, Color: color, UserID: user.ID, Shared: true}).Error; err != nil {
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
