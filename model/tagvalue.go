package model

// TagValue is a value which can be chosen for a tag. The values of a tag are defined by the owner of the tag
// (the admins for shared tags), the values which were used in time spans are available in addition.
type TagValue struct {
	UserID int    `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE;unique_index:uix_tag_values"`
	Key    string `gorm:"unique_index:uix_tag_values"`
	Value  string `gorm:"unique_index:uix_tag_values"`
}
