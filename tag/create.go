package tag

import (
	"context"
	"fmt"
	"strings"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// CreateTag creates a tag, only admins can do that. The tag can be used by all users.
func (r *ResolverForTag) CreateTag(ctx context.Context, key string, color string) (*gqlmodel.TagDefinition, error) {
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

	definition := &model.TagDefinition{Key: key, Color: color, UserID: user.ID}
	if _, exists := find(r.DB, key); exists {
		return nil, fmt.Errorf("tag with key '%s' does already exist", key)
	}

	create := r.DB.Create(&definition)
	return toExternal(*definition, user.Admin), create.Error
}
