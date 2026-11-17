package tag

import (
	"context"
	"fmt"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// RemoveTag removes a tag which is not used, only admins can do that.
func (r *ResolverForTag) RemoveTag(ctx context.Context, key string) (*gqlmodel.TagDefinition, error) {
	user := auth.GetUser(ctx)
	if err := checkAdmin(user.Admin); err != nil {
		return nil, err
	}
	tag, found := find(r.DB, key)
	if !found {
		return nil, fmt.Errorf("tag with key '%s' does not exist", key)
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

	// a tag with history is archived, not removed: the time spans keep their tags
	var used int
	if err := r.DB.Model(new(model.TimeSpanTag)).Where(&model.TimeSpanTag{Key: tag.Key}).Count(&used).Error; err != nil {
		return nil, err
	}
	if used > 0 {
		return nil, fmt.Errorf("tag '%s' is used by %d time spans, archive it instead of removing it", tag.Key, used)
	}

	remove := r.DB.Where("key = ?", tag.Key).Delete(new(model.TagDefinition))
	return toExternal(tag, user.Admin), remove.Error
}
