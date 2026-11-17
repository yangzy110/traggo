package timespan

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

const (
	dayFormat = "2006-01-02"
	// maxStatsDays limits how many days a single statistics query can cover.
	maxStatsDays = 366
)

// TeamMembers returns all users. Only the information which is visible to every user is returned.
func (r *ResolverForTimeSpan) TeamMembers(ctx context.Context) ([]*gqlmodel.TeamMember, error) {
	var users []model.User
	if err := r.DB.Order("name").Find(&users).Error; err != nil {
		return nil, err
	}
	result := make([]*gqlmodel.TeamMember, 0, len(users))
	for _, user := range users {
		result = append(result, &gqlmodel.TeamMember{ID: user.ID, Name: user.Name})
	}
	return result, nil
}

// TeamStats sums up the tracked time of all users per day and per member. The days are the days from
// fromInclusive to toInclusive (the date the times are given in is used). Time spans which cross midnight are split,
// only the part which lies inside of the days is counted. Running timers are excluded.
func (r *ResolverForTimeSpan) TeamStats(ctx context.Context, fromInclusive model.Time, toInclusive model.Time) (*gqlmodel.TeamStats, error) {
	return r.stats(fromInclusive, toInclusive, nil)
}

// MyStats is TeamStats for the time spans of the current user only: the hours per day and per tag. The members contain
// only the current user.
func (r *ResolverForTimeSpan) MyStats(ctx context.Context, fromInclusive model.Time, toInclusive model.Time) (*gqlmodel.TeamStats, error) {
	userID := auth.GetUser(ctx).ID
	return r.stats(fromInclusive, toInclusive, &userID)
}

// stats sums up the time of all users, or only of the user with the id onlyUser.
func (r *ResolverForTimeSpan) stats(fromInclusive model.Time, toInclusive model.Time, onlyUser *int) (*gqlmodel.TeamStats, error) {
	from := midnight(fromInclusive.OmitTimeZone())
	last := midnight(toInclusive.OmitTimeZone())
	if from.After(last) {
		return nil, errors.New("fromInclusive must be before toInclusive")
	}
	end := last.AddDate(0, 0, 1)
	if int(end.Sub(from).Hours()/24) > maxStatsDays {
		return nil, errors.New("the requested range must not be longer than 366 days")
	}

	usersQuery, spansQuery, tagsQuery := r.DB, r.DB, r.DB
	if onlyUser != nil {
		usersQuery = usersQuery.Where("id = ?", *onlyUser)
		spansQuery = spansQuery.Where("user_id = ?", *onlyUser)
		tagsQuery = tagsQuery.Where("time_spans.user_id = ?", *onlyUser)
	}
	var users []model.User
	if err := usersQuery.Find(&users).Error; err != nil {
		return nil, err
	}
	var timeSpans []model.TimeSpan
	err := spansQuery.Select("id, user_id, start_user_time, end_user_time").
		Not("end_user_time is NULL").
		Where("start_user_time < ? AND end_user_time > ?", end, from).
		Find(&timeSpans).Error
	if err != nil {
		return nil, err
	}

	var spanTags []model.TimeSpanTag
	err = tagsQuery.Joins("JOIN time_spans ON time_spans.id = time_span_tags.time_span_id").
		Not("time_spans.end_user_time is NULL").
		Where("time_spans.start_user_time < ? AND time_spans.end_user_time > ?", end, from).
		Find(&spanTags).Error
	if err != nil {
		return nil, err
	}
	tagsOfSpan := map[int][]model.TimeSpanTag{}
	for _, tag := range spanTags {
		tagsOfSpan[tag.TimeSpanID] = append(tagsOfSpan[tag.TimeSpanID], tag)
	}

	perDay := map[string]float64{}
	perMember := map[int]float64{}
	perTag := map[[2]string]float64{}
	perTagMember := map[[2]string]map[int]float64{}
	for _, span := range timeSpans {
		if span.EndUserTime == nil {
			continue
		}
		for day, seconds := range splitByDay(wallClock(span.StartUserTime), wallClock(*span.EndUserTime), from, end) {
			perDay[day] += seconds
			perMember[span.UserID] += seconds
			for _, tag := range tagsOfSpan[span.ID] {
				id := [2]string{tag.Key, tag.StringValue}
				perTag[id] += seconds
				if perTagMember[id] == nil {
					perTagMember[id] = map[int]float64{}
				}
				perTagMember[id][span.UserID] += seconds
			}
		}
	}

	result := &gqlmodel.TeamStats{Days: []*gqlmodel.TeamStatsDay{}, Tags: []*gqlmodel.TeamTagStats{}, Members: []*gqlmodel.TeamMemberStats{}}
	for day := from; day.Before(end); day = day.AddDate(0, 0, 1) {
		seconds := perDay[day.Format(dayFormat)]
		result.Days = append(result.Days, &gqlmodel.TeamStatsDay{Day: day.Format(dayFormat), Seconds: seconds})
		result.TotalSeconds += seconds
	}
	for _, user := range users {
		result.Members = append(result.Members, &gqlmodel.TeamMemberStats{
			Member:  &gqlmodel.TeamMember{ID: user.ID, Name: user.Name},
			Seconds: perMember[user.ID],
		})
	}
	for tag, seconds := range perTag {
		members := []*gqlmodel.TeamMemberStats{}
		for _, user := range users {
			if memberSeconds := perTagMember[tag][user.ID]; memberSeconds > 0 {
				members = append(members, &gqlmodel.TeamMemberStats{Member: &gqlmodel.TeamMember{ID: user.ID, Name: user.Name}, Seconds: memberSeconds})
			}
		}
		sort.SliceStable(members, func(i, j int) bool {
			if members[i].Seconds != members[j].Seconds {
				return members[i].Seconds > members[j].Seconds
			}
			return members[i].Member.Name < members[j].Member.Name
		})
		result.Tags = append(result.Tags, &gqlmodel.TeamTagStats{Key: tag[0], Value: tag[1], Seconds: seconds, Members: members})
	}
	sort.Slice(result.Tags, func(i, j int) bool {
		a, b := result.Tags[i], result.Tags[j]
		if a.Seconds != b.Seconds {
			return a.Seconds > b.Seconds
		}
		if a.Key != b.Key {
			return a.Key < b.Key
		}
		return a.Value < b.Value
	})
	sort.SliceStable(result.Members, func(i, j int) bool {
		a, b := result.Members[i], result.Members[j]
		if a.Seconds != b.Seconds {
			return a.Seconds > b.Seconds
		}
		return a.Member.Name < b.Member.Name
	})
	return result, nil
}

// wallClock keeps the clock time of t but drops the location, the database may return another location than UTC.
func wallClock(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), time.UTC)
}

func midnight(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// splitByDay clips [start, end) to [from, to) and returns the seconds per day (YYYY-MM-DD).
func splitByDay(start, end, from, to time.Time) map[string]float64 {
	result := map[string]float64{}
	if start.Before(from) {
		start = from
	}
	if end.After(to) {
		end = to
	}
	for cursor := start; cursor.Before(end); {
		next := midnight(cursor).AddDate(0, 0, 1)
		if next.After(end) {
			next = end
		}
		result[cursor.Format(dayFormat)] += next.Sub(cursor).Seconds()
		cursor = next
	}
	return result
}
