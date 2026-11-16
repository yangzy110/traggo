package timespan

import (
	"context"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"

	"github.com/traggo/server/model"
)

// SuggestTagValue suggests a tag value.
func (r *ResolverForTimeSpan) SuggestTagValue(ctx context.Context, key string, query string) ([]string, error) {
	var suggestions []model.TimeSpanTag
	find := r.DB.
		Select("DISTINCT time_span_tags.string_value").
		Joins("JOIN time_spans on time_spans.id = time_span_tags.time_span_id").
		Where("user_id = ?", auth.GetUser(ctx).ID).
		Where("key = ?", key).Where("LOWER(string_value) LIKE LOWER(?)", "%"+query+"%").
		Limit(10).
		Find(&suggestions)
	var result []string
	for _, value := range suggestions {
		result = append(result, value.StringValue)
	}

	return result, find.Error
}

// UsedTagValues returns all key value combinations which are used by the time spans of the user.
func (r *ResolverForTimeSpan) UsedTagValues(ctx context.Context) ([]*gqlmodel.UsedTagValue, error) {
	var tags []model.TimeSpanTag
	find := r.DB.
		Select("DISTINCT time_span_tags.key, time_span_tags.string_value").
		Joins("JOIN time_spans on time_spans.id = time_span_tags.time_span_id").
		Where("user_id = ?", auth.GetUser(ctx).ID).
		Order("time_span_tags.key, time_span_tags.string_value").
		Limit(1000).
		Find(&tags)
	result := []*gqlmodel.UsedTagValue{}
	for _, tag := range tags {
		result = append(result, &gqlmodel.UsedTagValue{Key: tag.Key, Value: tag.StringValue})
	}
	return result, find.Error
}
