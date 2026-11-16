package tag

import (
	"context"
	"fmt"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// RemoveTag removes a tag. Shared tags can only be removed by admins, they are removed for all users.
func (r *ResolverForTag) RemoveTag(ctx context.Context, key string) (*gqlmodel.TagDefinition, error) {
	user := auth.GetUser(ctx)
	tag, found := find(r.DB, user.ID, key)
	if !found {
		return nil, fmt.Errorf("tag with key '%s' does not exist", key)
	}
	if err := checkCanChange(tag, user.ID, user.Admin); err != nil {
		return nil, err
	}

	usedInEntries, err := dashboardEntriesOf(r.DB, tag)
	if err != nil {
		return nil, err
	}

	if len(usedInEntries) > 0 {
		dashboard := &model.Dashboard{ID: usedInEntries[0].DashboardID}
		r.DB.Find(dashboard)
		return nil, fmt.Errorf("tag '%s' is used in dashboard '%s' entry '%s', remove this reference before deleting the tag", tag.Key, dashboard.Name, usedInEntries[0].Title)
	}

	tx := r.DB.Begin()
	if err := tx.Where(model.TagDefinition{Key: tag.Key, UserID: tag.UserID}).
		Delete(new(model.TagDefinition)).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.
		Where("time_span_id in ?", timeSpansOf(tx, tag)).
		Where(&model.TimeSpanTag{Key: tag.Key}).
		Delete(new(model.TimeSpanTag)).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	remove := tx.Commit()
	return toExternal(tag, user.ID, user.Admin), remove.Error
}
