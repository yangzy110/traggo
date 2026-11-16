package model

import "time"

// TimeSpan is basically a tagged time range.
type TimeSpan struct {
	ID            int `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	StartUTC      time.Time
	EndUTC        *time.Time
	StartUserTime time.Time
	// EndUserTime is indexed because range queries (f.ex. the team log) filter on `end_user_time >= from`,
	// which is selective for recent ranges, while `start_user_time <= to` matches nearly all rows.
	EndUserTime *time.Time `gorm:"index"`
	OffsetUTC   int
	UserID      int `gorm:"type:int REFERENCES users(id) ON DELETE CASCADE"`
	Tags        []TimeSpanTag
	Note        string
}

// TimeSpanTag is a tag for a time range
type TimeSpanTag struct {
	TimeSpanID  int `gorm:"type:int REFERENCES time_spans(id) ON DELETE CASCADE"`
	Key         string
	StringValue string
}
