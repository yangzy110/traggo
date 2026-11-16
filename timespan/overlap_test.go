package timespan

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func TestOverlap_createRejectsOverlappingTimeSpans(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	db.User(5).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z")
	db.User(6).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z") // the time spans of others do not matter
	resolver := ResolverForTimeSpan{DB: db.DB}

	_, err := resolver.CreateTimeSpan(fake.User(5), test.ModelTime("2019-06-10T09:30:00Z"), test.ModelTimeP("2019-06-10T10:30:00Z"), nil, "")
	require.EqualError(t, err, "time span overlaps with another time span")
	_, err = resolver.CreateTimeSpan(fake.User(5), test.ModelTime("2019-06-10T08:00:00Z"), test.ModelTimeP("2019-06-10T11:00:00Z"), nil, "")
	require.EqualError(t, err, "time span overlaps with another time span")

	// touching is fine
	_, err = resolver.CreateTimeSpan(fake.User(5), test.ModelTime("2019-06-10T10:00:00Z"), test.ModelTimeP("2019-06-10T11:00:00Z"), nil, "")
	require.NoError(t, err)
	_, err = resolver.CreateTimeSpan(fake.User(5), test.ModelTime("2019-06-10T08:00:00Z"), test.ModelTimeP("2019-06-10T09:00:00Z"), nil, "")
	require.NoError(t, err)
}

func TestOverlap_updateMayOverlapWithItself(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	first := db.User(5).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z")
	db.User(5).TimeSpan("2019-06-10T11:00:00Z", "2019-06-10T12:00:00Z")
	resolver := ResolverForTimeSpan{DB: db.DB}
	id := first.TimeSpan.ID

	_, err := resolver.UpdateTimeSpan(fake.User(5), id, test.ModelTime("2019-06-10T09:15:00Z"), test.ModelTimeP("2019-06-10T10:15:00Z"), nil, nil, "")
	require.NoError(t, err)
	_, err = resolver.UpdateTimeSpan(fake.User(5), id, test.ModelTime("2019-06-10T09:15:00Z"), test.ModelTimeP("2019-06-10T11:15:00Z"), nil, nil, "")
	require.EqualError(t, err, "time span overlaps with another time span")
}
