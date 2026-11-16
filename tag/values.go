package tag

import (
	"context"
	"fmt"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// DefinedValues returns the values which are defined for the tags the user can use: the own tags and the shared tags.
func DefinedValues(db *gorm.DB, userID int) ([]model.TagValue, error) {
	var values []model.TagValue
	err := db.Table("tag_values").
		Select("tag_values.user_id, tag_values.key, tag_values.value").
		Joins("JOIN tag_definitions ON tag_definitions.key = tag_values.key AND tag_definitions.user_id = tag_values.user_id").
		Where("tag_definitions.user_id = ? OR tag_definitions.shared = ?", userID, true).
		Order("tag_values.key, tag_values.value").
		Scan(&values).Error
	return values, err
}

// DefinedTagValues returns the defined values of the tags the user can use.
func (r *ResolverForTag) DefinedTagValues(ctx context.Context) ([]*gqlmodel.UsedTagValue, error) {
	values, err := DefinedValues(r.DB, auth.GetUser(ctx).ID)
	result := []*gqlmodel.UsedTagValue{}
	for _, value := range values {
		result = append(result, &gqlmodel.UsedTagValue{Key: value.Key, Value: value.Value})
	}
	return result, err
}

func (r *ResolverForTag) changeableTag(ctx context.Context, key string) (model.TagDefinition, error) {
	user := auth.GetUser(ctx)
	tag, found := find(r.DB, user.ID, key)
	if !found {
		return tag, fmt.Errorf("tag with key '%s' does not exist", key)
	}
	return tag, checkCanChange(tag, user.ID, user.Admin)
}

// AddTagValue defines a value for a tag. Only who can change the tag (admins for shared tags) can add values.
func (r *ResolverForTag) AddTagValue(ctx context.Context, key string, value string) (*gqlmodel.TagDefinition, error) {
	tag, err := r.changeableTag(ctx, key)
	if err != nil {
		return nil, err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, fmt.Errorf("tag value must not be empty")
	}
	user := auth.GetUser(ctx)
	exists := !r.DB.Where(&model.TagValue{UserID: tag.UserID, Key: tag.Key, Value: value}).Find(new(model.TagValue)).RecordNotFound()
	if !exists {
		if err := r.DB.Create(&model.TagValue{UserID: tag.UserID, Key: tag.Key, Value: value}).Error; err != nil {
			return nil, err
		}
	}
	return toExternal(tag, user.ID, user.Admin), nil
}

// RemoveTagValue removes a defined value. Time spans which use the value are not changed.
func (r *ResolverForTag) RemoveTagValue(ctx context.Context, key string, value string) (*gqlmodel.TagDefinition, error) {
	tag, err := r.changeableTag(ctx, key)
	if err != nil {
		return nil, err
	}
	user := auth.GetUser(ctx)
	err = r.DB.Where("user_id = ? AND key = ? AND value = ?", tag.UserID, tag.Key, value).Delete(new(model.TagValue)).Error
	return toExternal(tag, user.ID, user.Admin), err
}
