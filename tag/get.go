package tag

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// withoutShadowed removes the shared tags for which the user has an own tag with the same key: the own tag wins.
func withoutShadowed(tags []model.TagDefinition, userID int) []model.TagDefinition {
	own := map[string]struct{}{}
	for _, tag := range tags {
		if tag.UserID == userID {
			own[tag.Key] = struct{}{}
		}
	}
	result := make([]model.TagDefinition, 0, len(tags))
	for _, tag := range tags {
		if _, shadowed := own[tag.Key]; shadowed && tag.UserID != userID {
			continue
		}
		result = append(result, tag)
	}
	return result
}

// Tags returns the tags of the user and the shared tags.
func (r *ResolverForTag) Tags(ctx context.Context) ([]*gqlmodel.TagDefinition, error) {
	var tags []model.TagDefinition
	user := auth.GetUser(ctx)

	timeSpansIdsOfUser := r.DB.Model(new(model.TimeSpan)).
		Select("id").
		Where(&model.TimeSpan{UserID: user.ID}).
		SubQuery()
	usages := r.DB.Select("COUNT (*)").Where("time_span_tags.time_span_id in ?", timeSpansIdsOfUser).
		Where("tag_definitions.key = time_span_tags.key").
		Model(new(model.TimeSpanTag)).
		Group("time_span_tags.key").
		SubQuery()
	find := r.DB.Select("tag_definitions.*, ? as usages", usages).
		Where("user_id = ? OR shared = ?", user.ID, true).
		Order("usages desc").
		Order("key").
		Find(&tags)

	result := []*gqlmodel.TagDefinition{}
	for _, tag := range withoutShadowed(tags, user.ID) {
		result = append(result, toExternal(tag, user.ID, user.Admin))
	}
	return result, find.Error
}
