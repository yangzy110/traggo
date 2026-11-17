package tag

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// Tags returns all tags, the most used first. The usages are counted over the time spans of all users.
func (r *ResolverForTag) Tags(ctx context.Context) ([]*gqlmodel.TagDefinition, error) {
	var tags []model.TagDefinition
	user := auth.GetUser(ctx)

	usages := r.DB.Select("COUNT (*)").
		Where("tag_definitions.key = time_span_tags.key").
		Model(new(model.TimeSpanTag)).
		Group("time_span_tags.key").
		SubQuery()
	find := r.DB.Select("tag_definitions.*, ? as usages", usages).
		Order("usages desc").
		Order("key").
		Find(&tags)

	result := []*gqlmodel.TagDefinition{}
	for _, tag := range tags {
		result = append(result, toExternal(tag, user.Admin))
	}
	return result, find.Error
}
