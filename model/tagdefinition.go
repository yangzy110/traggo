package model

// TagDefinition describes a tag. All tags are created by admins and can be used by all users, only admins can change them.
// UserID is the admin who created the tag, it has no meaning for the access.
type TagDefinition struct {
	Key    string
	UserID int `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE"`
	Color  string
	// Archived tags cannot be used for new time spans, the existing time spans keep them (and their color).
	Archived bool `gorm:"not null;default:false"`
	Usages   int  `gorm:"-"`
}
