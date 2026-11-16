package timespan

import (
	"errors"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

// checkNoOverlap makes sure the time span does not overlap with another finished time span of the same user.
// Time spans which touch each other (one ends when the other starts) do not overlap. `ignoreID` is the id of the time
// span which is updated (it may overlap with its old self).
func checkNoOverlap(db *gorm.DB, span model.TimeSpan, ignoreID int) error {
	if span.EndUTC == nil {
		return nil
	}
	query := db.Model(new(model.TimeSpan)).
		Where("user_id = ?", span.UserID).
		Where("end_utc IS NOT NULL").
		Where("start_utc < ? AND end_utc > ?", *span.EndUTC, span.StartUTC)
	if ignoreID != 0 {
		query = query.Where("id <> ?", ignoreID)
	}
	var count int
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("time span overlaps with another time span")
	}
	return nil
}
