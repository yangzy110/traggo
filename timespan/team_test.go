package timespan

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func TestTeamTimeSpans_seesTimeSpansOfAllUsers(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	alice := db.User(1)
	bob := db.User(2)
	late := alice.TimeSpan("2019-06-10T14:00:00Z", "2019-06-10T15:00:00Z").Tag("project", "web")
	db.Model(&late.TimeSpan).UpdateColumn("note", "review")
	bob.TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z")

	resolver := ResolverForTimeSpan{DB: db.DB}
	// the calling user is a third one, who has no time spans himself
	result, err := resolver.TeamTimeSpans(fake.User(3), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), nil)
	require.NoError(t, err)
	require.Len(t, result, 2)

	// ordered by start
	require.Equal(t, "test2", result[0].User.Name)
	require.Equal(t, 2, result[0].User.ID)
	require.Equal(t, "test1", result[1].User.Name)

	// tags and note are visible
	require.Equal(t, "review", result[1].TimeSpan.Note)
	require.Len(t, result[1].TimeSpan.Tags, 1)
	require.Equal(t, "project", result[1].TimeSpan.Tags[0].Key)
	require.Equal(t, "web", result[1].TimeSpan.Tags[0].Value)
}

func TestTeamTimeSpans_excludesRunningAndOutOfRange(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	user := db.User(1)
	user.RunningTimeSpan("2019-06-10T12:00:00Z")
	user.TimeSpan("2019-06-09T09:00:00Z", "2019-06-09T10:00:00Z")
	user.TimeSpan("2019-06-11T09:00:00Z", "2019-06-11T10:00:00Z")
	inside := user.TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z")

	resolver := ResolverForTimeSpan{DB: db.DB}
	result, err := resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), nil)
	require.NoError(t, err)
	require.Len(t, result, 1)
	require.Equal(t, inside.TimeSpan.ID, result[0].TimeSpan.ID)
}

func TestTeamTimeSpans_empty(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	resolver := ResolverForTimeSpan{DB: db.DB}
	result, err := resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), nil)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Empty(t, result)
}

func TestTeamTimeSpans_invalidRange(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	resolver := ResolverForTimeSpan{DB: db.DB}

	_, err := resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-06-11T00:00:00Z"), test.ModelTime("2019-06-10T00:00:00Z"), nil)
	require.EqualError(t, err, "fromInclusive must be before toInclusive")

	_, err = resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-01-01T00:00:00Z"), test.ModelTime("2019-03-01T00:00:00Z"), nil)
	require.EqualError(t, err, "the requested range must not be longer than 31 days")
}

func TestTeamTimeSpans_filterByUser(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()

	db.User(1).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z")
	bob := db.User(2).TimeSpan("2019-06-10T11:00:00Z", "2019-06-10T12:00:00Z")

	resolver := ResolverForTimeSpan{DB: db.DB}
	userID := 2
	result, err := resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), &userID)
	require.NoError(t, err)
	require.Len(t, result, 1)
	require.Equal(t, bob.TimeSpan.ID, result[0].TimeSpan.ID)
	require.Equal(t, 2, result[0].User.ID)

	unknown := 99
	result, err = resolver.TeamTimeSpans(fake.User(1), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), &unknown)
	require.NoError(t, err)
	require.Empty(t, result)
}
