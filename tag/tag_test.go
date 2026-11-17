package tag

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

const (
	admin = 1
	alice = 3
	bob   = 4
)

func users(t *testing.T) (*test.Database, ResolverForTag) {
	db := test.InMemoryDB(t)
	db.User(admin)
	db.User(alice)
	db.User(bob)
	return db, ResolverForTag{DB: db.DB}
}

func sp(s string) *string { return &s }

func TestCreate_onlyAdmins(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()

	_, err := resolver.CreateTag(fake.UserWithPerm(alice, false), "project", "#fff")
	require.EqualError(t, err, "only admins can create tags")
	assertTagCount(t, db, 0)

	tag, err := resolver.CreateTag(fake.UserWithPerm(admin, true), "project", "#fff")
	require.NoError(t, err)
	require.Equal(t, &gqlmodel.TagDefinition{Key: "project", Color: "#fff", Editable: true}, tag)
	assertTagExist(t, db, model.TagDefinition{Key: "project", Color: "#fff", UserID: admin})
}

func TestCreate_fails(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	ctx := fake.UserWithPerm(admin, true)
	_, err := resolver.CreateTag(ctx, "project", "#fff")
	require.NoError(t, err)

	_, err = resolver.CreateTag(ctx, "project", "#fff")
	require.EqualError(t, err, "tag with key 'project' does already exist")
	_, err = resolver.CreateTag(ctx, "", "#fff")
	require.EqualError(t, err, "tag must not be empty")
	_, err = resolver.CreateTag(ctx, "two words", "#fff")
	require.EqualError(t, err, "tag must not contain spaces")
	_, err = resolver.CreateTag(ctx, "Project", "#fff")
	require.NoError(t, err, "the keys are case sensitive")
	assertTagCount(t, db, 2)
}

func TestTags_everybodySeesAllTags_onlyAdminsCanEdit(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("a")
	db.User(admin).NewTagDefinition("b")
	db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("a", "")
	db.User(bob).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("a", "")

	tags, err := resolver.Tags(fake.UserWithPerm(alice, false))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "a", Usages: 2}, {Key: "b"}}, tags)

	tags, err = resolver.Tags(fake.UserWithPerm(admin, true))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "a", Usages: 2, Editable: true}, {Key: "b", Editable: true}}, tags)
}

func TestUpdate_onlyAdmins(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("a")

	_, err := resolver.UpdateTag(fake.UserWithPerm(alice, false), "a", nil, "#abc")
	require.EqualError(t, err, "only admins can change tags")

	tag, err := resolver.UpdateTag(fake.UserWithPerm(admin, true), "a", nil, "#abc")
	require.NoError(t, err)
	require.Equal(t, "#abc", tag.Color)
	assertTagExist(t, db, model.TagDefinition{Key: "a", Color: "#abc", UserID: admin})
}

func TestUpdate_rename_changesTimeSpansAndDefaultsOfAllUsers(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("a")
	aliceSpan := db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("a", "")
	bobSpan := db.User(bob).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("a", "")
	db.Create(&model.UserSetting{UserID: bob, DefaultTag: "a"})

	_, err := resolver.UpdateTag(fake.UserWithPerm(admin, true), "a", sp("b"), "#abc")
	require.NoError(t, err)

	aliceSpan.AssertHasTag("b", "", true).AssertHasTag("a", "", false)
	bobSpan.AssertHasTag("b", "", true)
	setting := model.UserSetting{}
	require.False(t, db.Where("user_id = ?", bob).Find(&setting).RecordNotFound())
	require.Equal(t, "b", setting.DefaultTag)
}

func TestUpdate_rename_fails_targetExists(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("a")
	db.User(admin).NewTagDefinition("b")

	_, err := resolver.UpdateTag(fake.UserWithPerm(admin, true), "a", sp("b"), "#abc")
	require.EqualError(t, err, "tag with key 'b' does already exist")
}

func TestRemove_onlyAdmins_onlyUnusedTags(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("used")
	db.User(admin).NewTagDefinition("unused")
	db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("used", "")

	_, err := resolver.RemoveTag(fake.UserWithPerm(alice, false), "unused")
	require.EqualError(t, err, "only admins can change tags")

	ctx := fake.UserWithPerm(admin, true)
	_, err = resolver.RemoveTag(ctx, "used")
	require.EqualError(t, err, "tag 'used' is used by 1 time spans, archive it instead of removing it")
	_, err = resolver.RemoveTag(ctx, "unused")
	require.NoError(t, err)
	_, err = resolver.RemoveTag(ctx, "unused")
	require.EqualError(t, err, "tag with key 'unused' does not exist")
	assertTagCount(t, db, 1)
}

func TestRemove_fails_usedInDashboard(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("coolio")
	dashboard := &model.Dashboard{Name: "yeah", UserID: alice}
	db.Create(dashboard)
	db.Create(&model.DashboardEntry{DashboardID: dashboard.ID, Title: "entry", Keys: "coolio"})

	_, err := resolver.RemoveTag(fake.UserWithPerm(admin, true), "coolio")
	require.EqualError(t, err, "tag 'coolio' is used in dashboard 'yeah' entry 'entry', remove this reference before deleting the tag")
}

func TestArchive_onlyAdmins_hidesTheTagFromSuggestions(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.User(admin).NewTagDefinition("a")
	ts := db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("a", "")

	_, err := resolver.ArchiveTag(fake.UserWithPerm(alice, false), "a", true)
	require.EqualError(t, err, "only admins can change tags")

	archived, err := resolver.ArchiveTag(fake.UserWithPerm(admin, true), "a", true)
	require.NoError(t, err)
	require.True(t, archived.Archived)
	ts.AssertHasTag("a", "", true) // the history keeps the tag

	suggestions, err := resolver.SuggestTag(fake.UserWithPerm(alice, false), "")
	require.NoError(t, err)
	require.Empty(t, suggestions)

	_, err = resolver.ArchiveTag(fake.UserWithPerm(admin, true), "a", false)
	require.NoError(t, err)
	suggestions, err = resolver.SuggestTag(fake.UserWithPerm(alice, false), "")
	require.NoError(t, err)
	require.Len(t, suggestions, 1)

	_, err = resolver.ArchiveTag(fake.UserWithPerm(admin, true), "nope", true)
	require.EqualError(t, err, "tag with key 'nope' does not exist")
}
