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

// dashboardEntriesOf returns the dashboard entries (of all users) which reference the tag.
func dashboardEntriesOf(db *gorm.DB, tag model.TagDefinition) ([]model.DashboardEntry, error) {
	entries := []model.DashboardEntry{}
	err := db.
		Where("keys LIKE ? OR keys LIKE ? OR keys LIKE ?", "%"+tag.Key, "%"+tag.Key+"%", tag.Key+"%").
		Find(&entries).Error
	return entries, err
}

// UpdateTag changes the name or the color of a tag, only admins can do that. A new name is applied to the time spans
// and the dashboards of all users.
func (r *ResolverForTag) UpdateTag(ctx context.Context, key string, newKey *string, color string) (*gqlmodel.TagDefinition, error) {
	user := auth.GetUser(ctx)
	if err := checkAdmin(user.Admin); err != nil {
		return nil, err
	}
	tag, found := find(r.DB, key)
	if !found {
		return nil, fmt.Errorf("tag with key '%s' does not exist", key)
	}

	finalKey := tag.Key
	if newKey != nil && *newKey != key {
		if strings.TrimSpace(*newKey) == "" {
			return nil, fmt.Errorf("tag must not be empty")
		}
		if strings.Contains(*newKey, " ") {
			return nil, fmt.Errorf("tag must not contain spaces")
		}
		if _, exists := find(r.DB, *newKey); exists {
			return nil, fmt.Errorf("tag with key '%s' does already exist", *newKey)
		}
		finalKey = *newKey
	}
	renamed := finalKey != tag.Key

	tx := r.DB.Begin()

	if renamed {
		if err := tx.
			Model(new(model.TimeSpanTag)).
			Where(&model.TimeSpanTag{Key: tag.Key}).
			Updates(&model.TimeSpanTag{Key: finalKey}).Error; err != nil {
			tx.Rollback()
			return nil, err
		}

		usedInEntries, err := dashboardEntriesOf(tx, tag)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		for _, entry := range usedInEntries {
			tags := strings.Split(entry.Keys, ",")
			for index, tagInEntry := range tags {
				if tagInEntry == tag.Key {
					tags[index] = finalKey
				}
			}
			entry.Keys = strings.Join(tags, ",")
			if err := tx.Save(&entry).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		}

		// users who have this tag as their default keep it under the new name
		if err := tx.Model(new(model.UserSetting)).Where("default_tag = ?", tag.Key).Update("default_tag", finalKey).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Model(new(model.TagDefinition)).Where("key = ?", tag.Key).Updates(map[string]interface{}{"key": finalKey, "color": color}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	tag.Key = finalKey
	tag.Color = color

	update := tx.Commit()
	return toExternal(tag, user.Admin), update.Error
}
