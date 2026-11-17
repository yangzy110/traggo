package tag

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// find returns the tag with the key. The tags are the same for all users.
func find(db *gorm.DB, key string) (model.TagDefinition, bool) {
	tag := model.TagDefinition{}
	if db.Where("key = ?", key).Find(&tag).RecordNotFound() {
		return tag, false
	}
	return tag, true
}

// checkAdmin makes sure that only admins change tags.
func checkAdmin(admin bool) error {
	if admin {
		return nil
	}
	return fmt.Errorf("only admins can change tags")
}

func toExternal(tag model.TagDefinition, admin bool) *gqlmodel.TagDefinition {
	return &gqlmodel.TagDefinition{
		Key:      tag.Key,
		Color:    tag.Color,
		Usages:   tag.Usages,
		Archived: tag.Archived,
		Editable: admin,
	}
}
