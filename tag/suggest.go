package tag

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// SuggestTag suggests a tag which can be used for a new time span.
func (r *ResolverForTag) SuggestTag(ctx context.Context, query string) ([]*gqlmodel.TagDefinition, error) {
	var suggestions []model.TagDefinition
	user := auth.GetUser(ctx)
	find := r.DB.Where("archived = ?", false).Where("Key LIKE ?", query+"%").Order("key").Find(&suggestions)
	result := []*gqlmodel.TagDefinition{}
	for _, tag := range suggestions {
		result = append(result, toExternal(tag, user.Admin))
	}
	return result, find.Error
}
