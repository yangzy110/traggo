package timespan

import (
	"context"
	"errors"
	"time"

	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// maxTeamRange limits how much data a single team query can return.
const maxTeamRange = 31 * 24 * time.Hour

// TeamTimeSpans returns the finished time spans of all users inside the given range.
// Every user is allowed to see the time spans of every other user. Running timers are excluded.
// When userID is set, only the time spans of this user are returned.
func (r *ResolverForTimeSpan) TeamTimeSpans(ctx context.Context, fromInclusive model.Time, toInclusive model.Time, userID *int) ([]*gqlmodel.TeamMemberTimeSpan, error) {
	if fromInclusive.Time().After(toInclusive.Time()) {
		return nil, errors.New("fromInclusive must be before toInclusive")
	}
	if toInclusive.Time().Sub(fromInclusive.Time()) > maxTeamRange {
		return nil, errors.New("the requested range must not be longer than 31 days")
	}

	call := r.DB.Preload("Tags").
		Not("end_user_time is NULL").
		Where("start_user_time <= ? AND end_user_time >= ?", toInclusive.OmitTimeZone(), fromInclusive.OmitTimeZone()).
		Order("start_user_time ASC")
	if userID != nil {
		call = call.Where("user_id = ?", *userID)
	}

	var timeSpans []model.TimeSpan
	if err := call.Find(&timeSpans).Error; err != nil {
		return nil, err
	}

	userIDs := map[int]struct{}{}
	for _, span := range timeSpans {
		userIDs[span.UserID] = struct{}{}
	}
	ids := make([]int, 0, len(userIDs))
	for id := range userIDs {
		ids = append(ids, id)
	}

	users := map[int]*gqlmodel.TeamMember{}
	if len(ids) > 0 {
		var dbUsers []model.User
		if err := r.DB.Where("id IN (?)", ids).Find(&dbUsers).Error; err != nil {
			return nil, err
		}
		for _, user := range dbUsers {
			users[user.ID] = &gqlmodel.TeamMember{ID: user.ID, Name: user.Name}
		}
	}

	result := []*gqlmodel.TeamMemberTimeSpan{}
	for _, span := range timeSpans {
		user, ok := users[span.UserID]
		if !ok {
			continue
		}
		result = append(result, &gqlmodel.TeamMemberTimeSpan{User: user, TimeSpan: timeSpanToExternal(span)})
	}
	return result, nil
}
