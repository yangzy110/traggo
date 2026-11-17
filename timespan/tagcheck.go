package timespan

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

// tagsExist checks the tags of a time span: it has at most one tag and the tag exists. An archived tag can only be kept
// (alreadyUsed), not added.
func tagsExist(db *gorm.DB, tags []model.TimeSpanTag, alreadyUsed map[string]bool) error {
	if len(tags) > 1 {
		return fmt.Errorf("a time span can only have one tag")
	}

	for _, tag := range tags {
		definition := model.TagDefinition{}
		if db.Where("key = ?", tag.Key).Find(&definition).RecordNotFound() {
			return fmt.Errorf("tag '%s' does not exist", tag.Key)
		}
		if definition.Archived && !alreadyUsed[tag.Key] {
			return fmt.Errorf("tag '%s' is archived", tag.Key)
		}
	}
	return nil
}
