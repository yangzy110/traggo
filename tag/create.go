package tag

import (
	"context"
	"fmt"
	"strings"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// CreateTag creates a tag.
func (r *ResolverForTag) CreateTag(ctx context.Context, key string, color string, shared *bool) (*gqlmodel.TagDefinition, error) {
	if strings.TrimSpace(key) == "" {
		return nil, fmt.Errorf("tag must not be empty")
	}
	if strings.Contains(key, " ") {
		return nil, fmt.Errorf("tag must not contain spaces")
	}

	user := auth.GetUser(ctx)
	if !user.Admin {
		return nil, fmt.Errorf("only admins can create tags")
	}
	isShared := shared != nil && *shared

	definition := &model.TagDefinition{
		Key:    key,
		Color:  color,
		UserID: user.ID,
		Shared: isShared,
	}

	if !r.DB.Where("user_id = ?", user.ID).Where("key = ?", definition.Key).Find(new(model.TagDefinition)).RecordNotFound() {
		return nil, fmt.Errorf("tag with key '%s' does already exist", definition.Key)
	}
	if sharedExists(r.DB, definition.Key) {
		return nil, fmt.Errorf("tag with key '%s' does already exist as a shared tag", definition.Key)
	}

	create := r.DB.Create(&definition)
	return toExternal(*definition, user.ID, user.Admin), create.Error
}
