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

// timeSpansOf returns the sub query for the ids of the time spans which use the tag.
// These are the time spans of the owner of the tag, for a shared tag it are the time spans of all users except of the users
// who have an own tag with the same key (they use their own tag).
func timeSpansOf(db *gorm.DB, tag model.TagDefinition) interface{} {
	query := db.Model(new(model.TimeSpan)).Select("id")
	if tag.Shared {
		return query.Where("user_id NOT IN ("+usersWithOwnTag+")", tag.Key, false).SubQuery()
	}
	return query.Where("user_id = ?", tag.UserID).SubQuery()
}

// dashboardEntriesOf returns the dashboard entries which reference the tag.
func dashboardEntriesOf(db *gorm.DB, tag model.TagDefinition) ([]model.DashboardEntry, error) {
	query := db.Joins("INNER JOIN dashboards ON dashboard_entries.dashboard_id = dashboards.id")
	if tag.Shared {
		query = query.Where("dashboards.user_id NOT IN ("+usersWithOwnTag+")", tag.Key, false)
	} else {
		query = query.Where("dashboards.user_id = ?", tag.UserID)
	}
	entries := []model.DashboardEntry{}
	err := query.
		Where("keys LIKE ? OR keys LIKE ? OR keys LIKE ?", "%"+tag.Key, "%"+tag.Key+"%", tag.Key+"%").
		Find(&entries).Error
	return entries, err
}

// UpdateTag updates a tag. Shared tags can only be updated by admins, the changes apply to all users.
func (r *ResolverForTag) UpdateTag(ctx context.Context, key string, newKey *string, color string, shared *bool) (*gqlmodel.TagDefinition, error) {
	user := auth.GetUser(ctx)
	tag, found := find(r.DB, user.ID, key)
	if !found {
		return nil, fmt.Errorf("tag with key '%s' does not exist", key)
	}
	if err := checkCanChange(tag, user.ID, user.Admin); err != nil {
		return nil, err
	}

	makeShared := shared != nil && *shared && !tag.Shared
	makePrivate := shared != nil && !*shared && tag.Shared
	if makeShared && !user.Admin {
		return nil, fmt.Errorf("only admins can share tags")
	}

	finalKey := tag.Key
	if newKey != nil && *newKey != key {
		if strings.Contains(*newKey, " ") {
			return nil, fmt.Errorf("tag must not contain spaces")
		}
		finalKey = strings.ToLower(*newKey)
	}
	renamed := finalKey != tag.Key
	if renamed || makeShared {
		if renamed && !r.DB.Where("user_id = ?", tag.UserID).Where("key = ?", finalKey).Find(new(model.TagDefinition)).RecordNotFound() {
			return nil, fmt.Errorf("tag with key '%s' does already exist", finalKey)
		}
		if sharedExists(r.DB, finalKey) {
			return nil, fmt.Errorf("tag with key '%s' does already exist as a shared tag", finalKey)
		}
	}

	tx := r.DB.Begin()

	newValue := model.TagDefinition{
		Key:    finalKey,
		Color:  color,
		UserID: tag.UserID,
		Shared: (tag.Shared && !makePrivate) || makeShared,
	}

	if renamed {
		if err := tx.
			Model(new(model.TimeSpanTag)).
			Where("time_span_id in ?", timeSpansOf(tx, tag)).
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
	}

	if err := tx.Model(new(model.TagDefinition)).Where(&model.TagDefinition{UserID: tag.UserID, Key: tag.Key}).Updates(&newValue).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if makePrivate {
		// the other users keep the tag they used: they get an own copy, so their time spans stay valid
		if err := tx.Model(new(model.TagDefinition)).Where(&model.TagDefinition{UserID: tag.UserID, Key: finalKey}).Update("shared", false).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		if err := copyToUsersOfSharedTag(tx, tag, color); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	update := tx.Commit()
	return toExternal(newValue, user.ID, user.Admin), update.Error
}

// copyToUsersOfSharedTag gives every other user who used the shared tag an own tag with the same key and color.
func copyToUsersOfSharedTag(tx *gorm.DB, tag model.TagDefinition, color string) error {
	var users []model.TimeSpan
	err := tx.Select("DISTINCT time_spans.user_id").
		Joins("JOIN time_span_tags ON time_span_tags.time_span_id = time_spans.id").
		Where("time_span_tags.key = ?", tag.Key).
		Where("time_spans.user_id <> ?", tag.UserID).
		Where("time_spans.user_id NOT IN ("+usersWithOwnTag+")", tag.Key, false).
		Find(&users).Error
	if err != nil {
		return err
	}
	for _, user := range users {
		if err := tx.Create(&model.TagDefinition{Key: tag.Key, Color: color, UserID: user.UserID}).Error; err != nil {
			return err
		}
	}
	return nil
}
