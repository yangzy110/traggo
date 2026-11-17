package timespan

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func TestTeamStats_sumsPerDayAndMember(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	db.User(1).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T12:00:00Z") // 3h
	db.User(2).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z") // 1h
	db.User(2).TimeSpan("2019-06-12T09:00:00Z", "2019-06-12T10:30:00Z") // 1.5h
	db.User(3)                                                          // no work at all

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-12T00:00:00Z"))
	require.NoError(t, err)

	require.Equal(t, 5.5*3600, stats.TotalSeconds)
	require.Len(t, stats.Days, 3)
	require.Equal(t, "2019-06-10", stats.Days[0].Day)
	require.Equal(t, 4*3600.0, stats.Days[0].Seconds)
	require.Equal(t, "2019-06-11", stats.Days[1].Day)
	require.Equal(t, 0.0, stats.Days[1].Seconds)
	require.Equal(t, 1.5*3600, stats.Days[2].Seconds)

	// ordered by time, members without tracked time are included
	require.Len(t, stats.Members, 3)
	require.Equal(t, "test1", stats.Members[0].Member.Name)
	require.Equal(t, 3*3600.0, stats.Members[0].Seconds)
	require.Equal(t, "test2", stats.Members[1].Member.Name)
	require.Equal(t, 2.5*3600, stats.Members[1].Seconds)
	require.Equal(t, "test3", stats.Members[2].Member.Name)
	require.Equal(t, 0.0, stats.Members[2].Seconds)
}

func TestTeamStats_splitsAtMidnightAndClipsToRange(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	// 22:00 - 02:00 next day: 2h on the 10th, 2h on the 11th
	db.User(1).TimeSpan("2019-06-10T22:00:00Z", "2019-06-11T02:00:00Z")
	// starts before the range, only the 1h on the 10th counts
	db.User(2).TimeSpan("2019-06-09T23:00:00Z", "2019-06-10T01:00:00Z")
	// ends after the range, only the 1h on the 11th counts
	db.User(2).TimeSpan("2019-06-11T23:00:00Z", "2019-06-12T05:00:00Z")

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-11T12:00:00Z"))
	require.NoError(t, err)

	require.Len(t, stats.Days, 2)
	require.Equal(t, 2*3600.0+3600, stats.Days[0].Seconds)
	require.Equal(t, 2*3600.0+3600, stats.Days[1].Seconds)
	require.Equal(t, 6*3600.0, stats.TotalSeconds)
	require.Equal(t, 4*3600.0, stats.Members[0].Seconds) // test1: 2h + 2h
	require.Equal(t, 2*3600.0, stats.Members[1].Seconds) // test2: 1h + 1h
}

func TestTeamStats_ignoresRunningAndOutOfRange(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	user := db.User(1)
	user.RunningTimeSpan("2019-06-10T12:00:00Z")
	user.TimeSpan("2019-06-09T09:00:00Z", "2019-06-09T10:00:00Z")
	user.TimeSpan("2019-06-11T09:00:00Z", "2019-06-11T10:00:00Z")

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"))
	require.NoError(t, err)
	require.Equal(t, 0.0, stats.TotalSeconds)
	require.Len(t, stats.Days, 1)
}

func TestTeamStats_usesTheClockTimeOfTheUser(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	// 23:30 - 00:30 at UTC+8 is 15:30 - 16:30 UTC, but for the user it crosses midnight
	db.User(1).TimeSpan("2019-06-10T23:30:00+08:00", "2019-06-11T00:30:00+08:00")

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00+08:00"), test.ModelTime("2019-06-11T00:00:00+08:00"))
	require.NoError(t, err)
	require.Equal(t, 1800.0, stats.Days[0].Seconds)
	require.Equal(t, 1800.0, stats.Days[1].Seconds)
}

func TestTeamStats_invalidRange(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	resolver := ResolverForTimeSpan{DB: db.DB}

	_, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-11T00:00:00Z"), test.ModelTime("2019-06-10T00:00:00Z"))
	require.EqualError(t, err, "fromInclusive must be before toInclusive")

	_, err = resolver.TeamStats(fake.User(1), test.ModelTime("2018-01-01T00:00:00Z"), test.ModelTime("2019-06-10T00:00:00Z"))
	require.EqualError(t, err, "the requested range must not be longer than 366 days")

	// exactly 366 days are allowed
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-01-01T00:00:00Z"), test.ModelTime("2020-01-01T00:00:00Z"))
	require.NoError(t, err)
	require.Len(t, stats.Days, 366)
}

func TestSplitByDay(t *testing.T) {
	d := func(s string) time.Time { return test.Time(s) }
	got := splitByDay(d("2019-06-10T22:00:00Z"), d("2019-06-13T02:00:00Z"), d("2019-06-10T00:00:00Z"), d("2019-06-14T00:00:00Z"))
	require.Equal(t, map[string]float64{"2019-06-10": 7200, "2019-06-11": 86400, "2019-06-12": 86400, "2019-06-13": 7200}, got)
	require.Empty(t, splitByDay(d("2019-06-10T10:00:00Z"), d("2019-06-10T10:00:00Z"), d("2019-06-10T00:00:00Z"), d("2019-06-11T00:00:00Z")))
}

func TestTeamMembers(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	db.NewUser(2, "bob", true)
	db.NewUser(1, "alice", false)

	resolver := ResolverForTimeSpan{DB: db.DB}
	members, err := resolver.TeamMembers(fake.User(1))
	require.NoError(t, err)
	require.Len(t, members, 2)
	require.Equal(t, "alice", members[0].Name)
	require.Equal(t, 1, members[0].ID)
	require.Equal(t, "bob", members[1].Name)
}

func TestTeamStats_sumsPerTag(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	db.User(1).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T12:00:00Z").Tag("proj", "a").Tag("type", "dev") // 3h
	db.User(2).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z").Tag("proj", "a")                    // 1h
	db.User(2).TimeSpan("2019-06-11T09:00:00Z", "2019-06-11T09:30:00Z").Tag("proj", "b")                    // 0.5h

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-11T00:00:00Z"))
	require.NoError(t, err)

	require.Len(t, stats.Tags, 3)
	require.Equal(t, "proj", stats.Tags[0].Key)
	require.Equal(t, "a", stats.Tags[0].Value)
	require.Equal(t, 4*3600.0, stats.Tags[0].Seconds)
	require.Equal(t, "type", stats.Tags[1].Key)
	require.Equal(t, 3*3600.0, stats.Tags[1].Seconds)
	require.Equal(t, "b", stats.Tags[2].Value)

	// the members of a tag
	require.Len(t, stats.Tags[0].Members, 2)
	require.Equal(t, "test1", stats.Tags[0].Members[0].Member.Name)
	require.Equal(t, 3*3600.0, stats.Tags[0].Members[0].Seconds)
	require.Equal(t, "test2", stats.Tags[0].Members[1].Member.Name)
	require.Equal(t, 1*3600.0, stats.Tags[0].Members[1].Seconds)
}

func TestMyStats_onlyCountsTheCurrentUser(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	db.User(1).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T12:00:00Z").Tag("proj", "")  // 3h
	db.User(1).TimeSpan("2019-06-11T09:00:00Z", "2019-06-11T10:00:00Z").Tag("other", "") // 1h
	db.User(2).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z").Tag("proj", "")  // 1h of somebody else

	resolver := ResolverForTimeSpan{DB: db.DB}
	stats, err := resolver.MyStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-11T00:00:00Z"))
	require.NoError(t, err)

	require.Equal(t, 4*3600.0, stats.TotalSeconds)
	require.Len(t, stats.Days, 2)
	require.Equal(t, 3*3600.0, stats.Days[0].Seconds)
	require.Len(t, stats.Tags, 2)
	require.Equal(t, "proj", stats.Tags[0].Key)
	require.Equal(t, 3*3600.0, stats.Tags[0].Seconds)
	require.Equal(t, "other", stats.Tags[1].Key)
	require.Len(t, stats.Members, 1)
	require.Equal(t, 1, stats.Members[0].Member.ID)

	team, err := resolver.TeamStats(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-11T00:00:00Z"))
	require.NoError(t, err)
	require.Equal(t, 5*3600.0, team.TotalSeconds, "the team statistics still contain everybody")
}
