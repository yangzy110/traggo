package timespan

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

const date = "2019-06-10T18:30:00Z"

func TestGQL_SuggestTagValue(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	user := db.User(1)
	user.TimeSpan(date, date).Tag("proj", "gotify").Tag("issue", "3")
	user.TimeSpan(date, date).Tag("proj", "traggo").Tag("issue", "3")
	user.TimeSpan(date, date).Tag("proj", "traggo").Tag("issue", "3")
	user.TimeSpan(date, date).Tag("proj", "meh").Tag("issue", "3")
	other := db.User(2)
	other.TimeSpan(date, date).Tag("proj", "secret").Tag("issue", "3")
	resolver := ResolverForTimeSpan{DB: db.DB}

	tags, err := resolver.SuggestTagValue(fake.User(1), "proj", "")

	require.Nil(t, err)
	expected := []string{"gotify", "traggo", "meh"}
	require.Equal(t, expected, tags)

	tags, err = resolver.SuggestTagValue(fake.User(1), "proj", "uff")

	require.Nil(t, err)
	require.Empty(t, tags)
}

func TestGQL_UsedTagValues(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	user := db.User(1)
	user.TimeSpan(date, date).Tag("proj", "traggo").Tag("issue", "3")
	user.TimeSpan(date, date).Tag("proj", "traggo")
	user.TimeSpan(date, date).Tag("proj", "gotify")
	db.User(2).TimeSpan(date, date).Tag("proj", "secret")
	resolver := ResolverForTimeSpan{DB: db.DB}

	tags, err := resolver.UsedTagValues(fake.User(1))

	require.Nil(t, err)
	require.Len(t, tags, 3)
	require.Equal(t, "issue", tags[0].Key)
	require.Equal(t, "gotify", tags[1].Value)
	require.Equal(t, "traggo", tags[2].Value)
}
