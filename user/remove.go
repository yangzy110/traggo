package user

import (
	"context"
	"fmt"

	"github.com/jinzhu/copier"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// RemoveUser removes a user. The tags belong to everybody, so the tags created by the user are handed over to an admin.
func (r *ResolverForUser) RemoveUser(ctx context.Context, id int) (*gqlmodel.User, error) {
	user := model.User{ID: id}
	if r.DB.Find(&user).RecordNotFound() {
		return nil, fmt.Errorf("user with id %d does not exist", user.ID)
	}

	tx := r.DB.Begin()
	heir := model.User{}
	if !tx.Where("admin = ? AND id <> ?", true, id).Order("id").First(&heir).RecordNotFound() {
		if current := auth.GetUser(ctx); current != nil && current.Admin && current.ID != id {
			heir.ID = current.ID
		}
		if err := tx.Model(new(model.TagDefinition)).Where("user_id = ?", id).Update("user_id", heir.ID).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	remove := tx.Delete(&user)
	if remove.Error != nil {
		tx.Rollback()
		return nil, remove.Error
	}
	gqlUser := &gqlmodel.User{}
	copier.Copy(gqlUser, &user)
	return gqlUser, tx.Commit().Error
}
