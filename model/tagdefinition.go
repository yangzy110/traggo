package model

// TagDefinition describes a tag.
type TagDefinition struct {
	Key    string
	UserID int `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE"`
	Color  string
	// Shared tags are created by admins. They can be used by all users, but only be changed by admins.
	// The other tags can only be used and changed by the user who created them.
	Shared bool `gorm:"not null;default:false"`
	Usages int  `gorm:"-"`
}
