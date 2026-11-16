package tag

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test/fake"
)

func TestValues_adminDefinesValuesOfSharedTagsForEveryone(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "project", Color: "#fff", UserID: adminA, Shared: true})

	_, err := resolver.AddTagValue(fake.UserWithPerm(alice, false), "project", "web")
	require.EqualError(t, err, "the shared tag 'project' can only be changed by an admin")
	_, err = resolver.AddTagValue(fake.UserWithPerm(adminA, true), "project", " ")
	require.EqualError(t, err, "tag value must not be empty")
	_, err = resolver.AddTagValue(fake.UserWithPerm(adminA, true), "project", "web")
	require.NoError(t, err)
	_, err = resolver.AddTagValue(fake.UserWithPerm(adminA, true), "project", "web") // twice is fine
	require.NoError(t, err)

	forBob, err := resolver.DefinedTagValues(fake.UserWithPerm(bob, false))
	require.NoError(t, err)
	require.Len(t, forBob, 1)
	require.Equal(t, "web", forBob[0].Value)

	_, err = resolver.RemoveTagValue(fake.UserWithPerm(adminA, true), "project", "web")
	require.NoError(t, err)
	forBob, err = resolver.DefinedTagValues(fake.UserWithPerm(bob, false))
	require.NoError(t, err)
	require.Empty(t, forBob)
}

func TestValues_privateValuesAreOnlyVisibleForTheOwnerAndFollowTheTag(t *testing.T) {
	db, resolver := users(t)
	defer db.Close()
	db.Create(&model.TagDefinition{Key: "mine", Color: "#fff", UserID: adminA})
	_, err := resolver.AddTagValue(fake.UserWithPerm(adminA, true), "mine", "x")
	require.NoError(t, err)

	forBob, _ := resolver.DefinedTagValues(fake.UserWithPerm(bob, false))
	require.Empty(t, forBob)

	_, err = resolver.UpdateTag(fake.UserWithPerm(adminA, true), "mine", sp("renamed"), "#fff", nil)
	require.NoError(t, err)
	forA, _ := resolver.DefinedTagValues(fake.UserWithPerm(adminA, true))
	require.Len(t, forA, 1)
	require.Equal(t, "renamed", forA[0].Key)

	_, err = resolver.RemoveTag(fake.UserWithPerm(adminA, true), "renamed")
	require.NoError(t, err)
	forA, _ = resolver.DefinedTagValues(fake.UserWithPerm(adminA, true))
	require.Empty(t, forA)
}
