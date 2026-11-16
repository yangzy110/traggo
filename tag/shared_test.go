package tag

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func bp(b bool) *bool { return &b }

func sp(s string) *string { return &s }

const (
	adminA = 1
	adminB = 2
	alice  = 3
	bob    = 4
)

func users(t *testing.T) (*test.Database, ResolverForTag) {
	db := test.InMemoryDB(t)
	db.User(adminA)
	db.User(adminB)
	db.User(alice)
	db.User(bob)
	return db, ResolverForTag{DB: db.DB}
}

func TestShared_onlyAdminsCanCreate(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()

	_, err := resolver.CreateTag(fake.UserWithPerm(alice, false), "project", "#fff", bp(true))
	require.EqualError(t, err, "only admins can create shared tags")
	assertTagCount(t, db, 0)

	tag, err := resolver.CreateTag(fake.UserWithPerm(adminA, true), "project", "#fff", bp(true))
	require.NoError(t, err)
	require.Equal(t, &gqlmodel.TagDefinition{Key: "project", Color: "#fff", Shared: true, Editable: true}, tag)
}

func TestShared_visibleForEveryoneButOnlyEditableByAdmins(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	_, err := resolver.CreateTag(fake.UserWithPerm(adminA, true), "project", "#fff", bp(true))
	require.NoError(t, err)
	_, err = resolver.CreateTag(fake.UserWithPerm(alice, false), "private", "#000", nil)
	require.NoError(t, err)

	forAlice, err := resolver.Tags(fake.UserWithPerm(alice, false))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{
		{Key: "private", Color: "#000", Editable: true},
		{Key: "project", Color: "#fff", Shared: true, Editable: false},
	}, forAlice)

	// the other admin may change the shared tag, but does not see the private tag of alice
	forAdminB, err := resolver.Tags(fake.UserWithPerm(adminB, true))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "project", Color: "#fff", Shared: true, Editable: true}}, forAdminB)

	suggestions, err := resolver.SuggestTag(fake.UserWithPerm(bob, false), "pro")
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "project", Color: "#fff", Shared: true, Editable: false}}, suggestions)
}

func TestShared_ownTagWinsInTheList(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#own", UserID: alice})
	db.Create(&model.TagDefinition{Key: "project", Color: "#shared", UserID: adminA, Shared: true})

	forAlice, err := resolver.Tags(fake.UserWithPerm(alice, false))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "project", Color: "#own", Editable: true}}, forAlice)

	forBob, err := resolver.Tags(fake.UserWithPerm(bob, false))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "project", Color: "#shared", Shared: true}}, forBob)
}

func TestShared_noDuplicateKeys(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})
	db.Create(&model.TagDefinition{Key: "mine", Color: "#fff", UserID: adminB})

	// a private tag must not have the key of a shared tag
	_, err := resolver.CreateTag(fake.UserWithPerm(alice, false), "project", "#fff", nil)
	require.EqualError(t, err, "tag with key 'project' does already exist as a shared tag")
	// another admin cannot create the same shared tag
	_, err = resolver.CreateTag(fake.UserWithPerm(adminB, true), "project", "#fff", bp(true))
	require.EqualError(t, err, "tag with key 'project' does already exist as a shared tag")
	// an admin has the key already as private tag
	_, err = resolver.CreateTag(fake.UserWithPerm(adminB, true), "mine", "#fff", bp(true))
	require.EqualError(t, err, "tag with key 'mine' does already exist")
	assertTagCount(t, db, 2)
}

func TestShared_usersCannotChangeSharedTags(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})
	ctx := fake.UserWithPerm(alice, false)

	_, err := resolver.UpdateTag(ctx, "project", sp("other"), "#000", nil)
	require.EqualError(t, err, "the shared tag 'project' can only be changed by an admin")
	_, err = resolver.RemoveTag(ctx, "project")
	require.EqualError(t, err, "the shared tag 'project' can only be changed by an admin")
	assertTagCount(t, db, 1)
}

func TestShared_usersCannotChangeTagsOfOthers(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "private", Color: "#fff", UserID: alice})

	// not even admins, the tag is not visible for them
	_, err := resolver.UpdateTag(fake.UserWithPerm(adminA, true), "private", nil, "#000", nil)
	require.EqualError(t, err, "tag with key 'private' does not exist")
	_, err = resolver.RemoveTag(fake.UserWithPerm(adminA, true), "private")
	require.EqualError(t, err, "tag with key 'private' does not exist")
	assertTagCount(t, db, 1)
}

func TestShared_adminsChangeSharedTagsForAllUsers(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})
	// bob has an own tag with the same key: his time spans belong to his own tag
	db.Create(&model.TagDefinition{Key: "project", Color: "#bob", UserID: bob})
	aliceSpan := db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("project", "web")
	bobSpan := db.User(bob).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("project", "web")

	tag, err := resolver.UpdateTag(fake.UserWithPerm(adminB, true), "project", sp("work"), "#abc", nil)
	require.NoError(t, err)
	require.Equal(t, &gqlmodel.TagDefinition{Key: "work", Color: "#abc", Shared: true, Editable: true}, tag)

	aliceSpan.AssertHasTag("work", "web", true).AssertHasTag("project", "web", false)
	bobSpan.AssertHasTag("project", "web", true).AssertHasTag("work", "web", false)
	var stored model.TagDefinition
	require.False(t, db.Where("key = ?", "work").Find(&stored).RecordNotFound())
	require.Equal(t, model.TagDefinition{Key: "work", Color: "#abc", UserID: adminA, Shared: true}, stored)
}

func TestShared_removeRemovesTheTagFromTheTimeSpansOfAllUsers(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})
	db.Create(&model.TagDefinition{Key: "project", Color: "#bob", UserID: bob})
	aliceSpan := db.User(alice).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("project", "web")
	bobSpan := db.User(bob).TimeSpan("2009-06-30T18:30:00Z", "2009-06-30T18:40:00Z").Tag("project", "web")

	_, err := resolver.RemoveTag(fake.UserWithPerm(adminB, true), "project")
	require.NoError(t, err)

	aliceSpan.AssertHasTag("project", "web", false)
	bobSpan.AssertHasTag("project", "web", true)
	assertTagCount(t, db, 1) // the tag of bob
}

func TestShared_adminCanShareOwnTagButNotMakeItPrivateAgain(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA})
	db.Create(&model.TagDefinition{Key: "alices", Color: "#fff", UserID: alice})

	_, err := resolver.UpdateTag(fake.UserWithPerm(alice, false), "alices", nil, "#fff", bp(true))
	require.EqualError(t, err, "only admins can share tags")

	tag, err := resolver.UpdateTag(fake.UserWithPerm(adminA, true), "project", nil, "#000", bp(true))
	require.NoError(t, err)
	require.Equal(t, &gqlmodel.TagDefinition{Key: "project", Color: "#000", Shared: true, Editable: true}, tag)

	forBob, err := resolver.Tags(fake.UserWithPerm(bob, false))
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.TagDefinition{{Key: "project", Color: "#000", Shared: true}}, forBob)

	_, err = resolver.UpdateTag(fake.UserWithPerm(adminA, true), "project", nil, "#000", bp(false))
	require.EqualError(t, err, "the shared tag 'project' cannot be made private again")
}

func TestShared_cannotRenameToAnExistingSharedKey(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})
	db.Create(&model.TagDefinition{Key: "mine", Color: "#fff", UserID: alice})

	_, err := resolver.UpdateTag(fake.UserWithPerm(alice, false), "mine", sp("project"), "#fff", nil)
	require.EqualError(t, err, "tag with key 'project' does already exist as a shared tag")
}
