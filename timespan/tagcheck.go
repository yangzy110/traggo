package timespan

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

func tagsExist(db *gorm.DB, userID int, tags []model.TimeSpanTag) error {
	existingTags := make(map[string]struct{})

	for _, tag := range tags {
		if _, ok := existingTags[tag.Key]; ok {
			return fmt.Errorf("tag '%s' is present multiple times", tag.Key)
		}

		// the tags of the user and the shared tags can be used
		if db.Where("key = ?", tag.Key).Where("user_id = ? OR shared = ?", userID, true).Find(new(model.TagDefinition)).RecordNotFound() {
			return fmt.Errorf("tag '%s' does not exist", tag.Key)
		}

		existingTags[tag.Key] = struct{}{}
	}
	return nil
}
