package tag

import (
	"context"
	"fmt"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// ArchiveTag archives a tag or brings it back. Archived tags are not suggested and cannot be used for new time spans,
// the existing time spans keep them. Only admins can archive tags.
func (r *ResolverForTag) ArchiveTag(ctx context.Context, key string, archived bool) (*gqlmodel.TagDefinition, error) {
	user := auth.GetUser(ctx)
	if err := checkAdmin(user.Admin); err != nil {
		return nil, err
	}
	tag, found := find(r.DB, key)
	if !found {
		return nil, fmt.Errorf("tag with key '%s' does not exist", key)
	}

	if err := r.DB.Model(new(model.TagDefinition)).
		Where("key = ?", tag.Key).
		Update("archived", archived).Error; err != nil {
		return nil, err
	}
	tag.Archived = archived
	return toExternal(tag, user.Admin), nil
}
