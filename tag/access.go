package tag

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// find returns the tag the user means by the key: the own tag of the user, or a shared tag.
func find(db *gorm.DB, userID int, key string) (model.TagDefinition, bool) {
	tag := model.TagDefinition{}
	if !db.Where("user_id = ?", userID).Where("key = ?", key).Find(&tag).RecordNotFound() {
		return tag, true
	}
	if !db.Where("shared = ?", true).Where("key = ?", key).Find(&tag).RecordNotFound() {
		return tag, true
	}
	return tag, false
}

// sharedExists tells if there is a shared tag with the key.
func sharedExists(db *gorm.DB, key string) bool {
	return !db.Where("shared = ?", true).Where("key = ?", key).Find(new(model.TagDefinition)).RecordNotFound()
}

// canChange tells if the user is allowed to change or remove the tag.
// Shared tags can only be changed by admins, all other tags only by their owner.
func canChange(tag model.TagDefinition, userID int, admin bool) bool {
	if tag.Shared {
		return admin
	}
	return tag.UserID == userID
}

func checkCanChange(tag model.TagDefinition, userID int, admin bool) error {
	if canChange(tag, userID, admin) {
		return nil
	}
	return fmt.Errorf("the shared tag '%s' can only be changed by an admin", tag.Key)
}

func toExternal(tag model.TagDefinition, userID int, admin bool) *gqlmodel.TagDefinition {
	return &gqlmodel.TagDefinition{
		Key:      tag.Key,
		Color:    tag.Color,
		Usages:   tag.Usages,
		Shared:   tag.Shared,
		Archived: tag.Archived,
		Editable: canChange(tag, userID, admin),
	}
}

// usersWithOwnTag is a sub query for the ids of the users who have an own tag with the key, their time spans and
// dashboards do not belong to the shared tag with the same key.
const usersWithOwnTag = "SELECT user_id FROM tag_definitions WHERE key = ? AND shared = ?"
