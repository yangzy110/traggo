package timespan

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func TestCreate_canUseSharedTagsButNotTagsOfOthers(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	db.User(1)
	db.User(2)
	db.Create(&model.TagDefinition{Key: "shared", Color: "#fff", UserID: 1, Shared: true})
	db.Create(&model.TagDefinition{Key: "private", Color: "#fff", UserID: 1})

	resolver := ResolverForTimeSpan{DB: db.DB}
	start := test.ModelTime("2019-06-10T18:30:00+02:00")

	_, err := resolver.CreateTimeSpan(fake.UserWithPerm(2, false), start, nil, []*gqlmodel.InputTimeSpanTag{{Key: "shared", Value: "x"}}, "")
	require.NoError(t, err)

	_, err = resolver.CreateTimeSpan(fake.UserWithPerm(2, false), start, nil, []*gqlmodel.InputTimeSpanTag{{Key: "private", Value: "x"}}, "")
	require.EqualError(t, err, "tag 'private' does not exist")
}

func TestTeamTimeSpans_tagColors(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	db.User(1)
	db.User(2)
	db.User(3)
	// user 1 and 2 have an own tag with the same key and different colors, user 3 uses the shared tag
	db.Create(&model.TagDefinition{Key: "project", Color: "#user1", UserID: 1})
	db.Create(&model.TagDefinition{Key: "project", Color: "#user2", UserID: 2})
	db.Create(&model.TagDefinition{Key: "type", Color: "#shared", UserID: 3, Shared: true})
	db.Create(&model.TagDefinition{Key: "project", Color: "#sharedProject", UserID: 3, Shared: true})
	db.Create(&model.TagDefinition{Key: "unknown", Color: "#other", UserID: 99})
	db.User(1).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z").Tag("project", "a").Tag("type", "b").Tag("removed", "c")
	db.User(2).TimeSpan("2019-06-10T11:00:00Z", "2019-06-10T12:00:00Z").Tag("project", "a")
	db.User(3).TimeSpan("2019-06-10T13:00:00Z", "2019-06-10T14:00:00Z").Tag("project", "a")

	resolver := ResolverForTimeSpan{DB: db.DB}
	result, err := resolver.TeamTimeSpans(fake.User(2), test.ModelTime("2019-06-10T00:00:00Z"), test.ModelTime("2019-06-10T23:59:59Z"), nil)
	require.NoError(t, err)
	require.Len(t, result, 3)

	// the own tag wins, a tag without definition has no color
	require.Equal(t, []*gqlmodel.TagColor{{Key: "project", Color: "#user1"}, {Key: "type", Color: "#shared"}}, result[0].TagColors)
	// the colors of an other user are not used
	require.Equal(t, []*gqlmodel.TagColor{{Key: "project", Color: "#user2"}}, result[1].TagColors)
	// without an own tag the shared tag is used
	require.Equal(t, []*gqlmodel.TagColor{{Key: "project", Color: "#sharedProject"}}, result[2].TagColors)
}
