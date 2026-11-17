package timespan

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

// tagsExist checks the tags of a time span. Archived tags can only be kept (alreadyUsed), not added.
func tagsExist(db *gorm.DB, userID int, tags []model.TimeSpanTag, alreadyUsed map[string]bool) error {
	existingTags := make(map[string]struct{})

	for _, tag := range tags {
		if _, ok := existingTags[tag.Key]; ok {
			return fmt.Errorf("tag '%s' is present multiple times", tag.Key)
		}

		// the tags of the user and the shared tags can be used
		definition := model.TagDefinition{}
		if db.Where("key = ?", tag.Key).Where("user_id = ? OR shared = ?", userID, true).Order("shared").Find(&definition).RecordNotFound() {
			return fmt.Errorf("tag '%s' does not exist", tag.Key)
		}
		if definition.Archived && !alreadyUsed[tag.Key] {
			return fmt.Errorf("tag '%s' is archived", tag.Key)
		}

		existingTags[tag.Key] = struct{}{}
	}
	return nil
}
