package tag

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// SuggestTag suggests a tag.
func (r *ResolverForTag) SuggestTag(ctx context.Context, query string) ([]*gqlmodel.TagDefinition, error) {
	var suggestions []model.TagDefinition
	user := auth.GetUser(ctx)
	find := r.DB.Where("user_id = ? OR shared = ?", user.ID, true).Where("Key LIKE ?", query+"%").Find(&suggestions)
	result := []*gqlmodel.TagDefinition{}
	for _, tag := range withoutShadowed(suggestions, user.ID) {
		result = append(result, toExternal(tag, user.ID, user.Admin))
	}
	return result, find.Error
}
