package timespan

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func row(line int, start, end, note string, tags ...string) *gqlmodel.InputImportRow {
	return &gqlmodel.InputImportRow{Line: line, Start: test.ModelTime(start), End: test.ModelTime(end), Note: note, Tags: tags}
}

func statuses(result *gqlmodel.ImportResult) []gqlmodel.ImportStatus {
	var all []gqlmodel.ImportStatus
	for _, r := range result.Rows {
		all = append(all, r.Status)
	}
	return all
}

func setup(t *testing.T) (*test.Database, ResolverForTimeSpan, *test.TimeSpanWithDatabase) {
	db := test.InMemoryDB(t)
	db.User(5)
	db.User(9)
	db.Create(&model.TagDefinition{Key: "work", Color: "#fff", UserID: 5})
	db.Create(&model.TagDefinition{Key: "shared", Color: "#fff", UserID: 9, Shared: true})
	existing := db.User(5).TimeSpan("2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z").Tag("work", "")
	db.Model(new(model.TimeSpan)).Where("id = ?", existing.TimeSpan.ID).Update("note", "meeting")
	return db, ResolverForTimeSpan{DB: db.DB}, existing
}

func TestImport_classifiesTheRows(t *testing.T) {
	db, resolver, existing := setup(t)
	defer db.Close()

	result, err := resolver.CheckImport(fake.UserWithPerm(5, false), []*gqlmodel.InputImportRow{
		row(2, "2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z", "meeting", "work"),  // the same
		row(3, "2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z", "other", "work"),    // same time, other content
		row(4, "2019-06-10T09:30:00Z", "2019-06-10T10:30:00Z", "other", "work"),    // overlaps partly
		row(5, "2019-06-10T10:00:00Z", "2019-06-10T11:00:00Z", "ok", "WORK"),       // touches, the case does not matter
		row(6, "2019-06-10T10:00:00Z", "2019-06-10T11:00:00Z", "ok", "work"),       // twice in the file
		row(7, "2019-06-10T10:30:00Z", "2019-06-10T11:30:00Z", "file", "work"),     // conflicts with the row above
		row(8, "2019-06-10T12:00:00Z", "2019-06-10T11:00:00Z", "", "work"),         // end before start
		row(9, "2019-06-10T13:00:00Z", "2019-06-10T14:00:00Z", "", "unknown", "x"), // tags do not exist
		row(10, "2019-06-10T15:00:00Z", "2019-06-10T16:00:00Z", "", "shared"),      // shared tags can be used
		row(11, "2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z", "", "unknown"),     // content problems come before tag problems
	}, nil, nil)

	require.NoError(t, err)
	require.Equal(t, []gqlmodel.ImportStatus{
		gqlmodel.ImportStatusDuplicate, gqlmodel.ImportStatusConflict, gqlmodel.ImportStatusConflict, gqlmodel.ImportStatusOk,
		gqlmodel.ImportStatusDuplicate, gqlmodel.ImportStatusConflict, gqlmodel.ImportStatusError, gqlmodel.ImportStatusMissingTags,
		gqlmodel.ImportStatusOk, gqlmodel.ImportStatusConflict,
	}, statuses(result))
	require.Equal(t, 2, result.Imported)
	require.Equal(t, []string{"unknown", "x"}, result.MissingTags)
	require.Equal(t, []string{"unknown", "x"}, result.Rows[7].MissingTags)
	assertTimeSpanCount(t, db, 1) // nothing is written by the check

	same := result.Rows[1].Conflict
	require.Equal(t, gqlmodel.ImportConflictSourceExisting, same.Source)
	require.Equal(t, existing.TimeSpan.ID, *same.ID)
	require.True(t, same.SameTime)
	require.Equal(t, "meeting", same.Note)
	require.Equal(t, []string{"work"}, same.Tags)

	require.False(t, result.Rows[2].Conflict.SameTime)

	fromFile := result.Rows[5].Conflict
	require.Equal(t, gqlmodel.ImportConflictSourceFile, fromFile.Source)
	require.Equal(t, 5, *fromFile.Line)
	require.False(t, fromFile.SameTime)

	// the existing time span with the same time is preferred over one which only overlaps
	require.True(t, result.Rows[9].Conflict.SameTime)
}

func TestImport_writesTheOkRowsAndCreatesTheChosenTagsForAdmins(t *testing.T) {
	db, resolver, _ := setup(t)
	defer db.Close()
	rows := []*gqlmodel.InputImportRow{
		row(2, "2019-06-10T11:00:00Z", "2019-06-10T12:00:00Z", "a", "new", "other"),
		row(3, "2019-06-10T11:30:00Z", "2019-06-10T12:30:00Z", "b", "new"),
	}

	// users who are no admins cannot create tags
	result, err := resolver.ImportTimeSpans(fake.UserWithPerm(5, false), rows, []string{"new", "other"}, nil)
	require.NoError(t, err)
	require.Equal(t, 0, result.Imported)
	assertTimeSpanCount(t, db, 1)

	// only the chosen tags are created, and only if a row uses them
	result, err = resolver.ImportTimeSpans(fake.UserWithPerm(5, true), rows, []string{"other"}, nil)
	require.NoError(t, err)
	require.Equal(t, 0, result.Imported)
	require.Equal(t, gqlmodel.ImportStatusMissingTags, result.Rows[0].Status)
	assertTimeSpanCount(t, db, 1)
	var before []model.TagDefinition
	db.Find(&before)
	require.Len(t, before, 2)

	result, err = resolver.ImportTimeSpans(fake.UserWithPerm(5, true), rows, []string{"new", "other"}, nil)
	require.NoError(t, err)
	require.Equal(t, 1, result.Imported)
	require.Equal(t, []gqlmodel.ImportStatus{gqlmodel.ImportStatusOk, gqlmodel.ImportStatusConflict}, statuses(result))
	assertTimeSpanCount(t, db, 2)
	var tags []model.TagDefinition
	db.Find(&tags)
	require.Len(t, tags, 4)

	// importing the same file again changes nothing
	again, err := resolver.ImportTimeSpans(fake.UserWithPerm(5, true), rows, nil, nil)
	require.NoError(t, err)
	require.Equal(t, 0, again.Imported)
	require.Equal(t, gqlmodel.ImportStatusDuplicate, again.Rows[0].Status)
	assertTimeSpanCount(t, db, 2)
}

func TestImport_updatesExistingTimeSpans(t *testing.T) {
	db, resolver, existing := setup(t)
	defer db.Close()
	id := existing.TimeSpan.ID
	user := fake.UserWithPerm(5, false)

	// the row that was merged is not in the file anymore, the time span is not in the range of the other rows
	rows := []*gqlmodel.InputImportRow{row(4, "2019-06-11T09:00:00Z", "2019-06-11T10:00:00Z", "later", "work")}
	updates := []*gqlmodel.InputImportUpdate{{ID: id, Note: "meeting; other", Tags: []string{"work", "shared"}}}

	checked, err := resolver.CheckImport(user, rows, nil, updates)
	require.NoError(t, err)
	require.Equal(t, 1, checked.Updated)
	require.Equal(t, 1, checked.Imported)

	result, err := resolver.ImportTimeSpans(user, rows, nil, updates)
	require.NoError(t, err)
	require.Equal(t, 1, result.Updated)
	assertTimeSpanCount(t, db, 2)
	var span model.TimeSpan
	db.Preload("Tags").First(&span, id)
	require.Equal(t, "meeting; other", span.Note)
	require.Len(t, span.Tags, 2)
	require.Equal(t, gqlmodel.ImportStatusOk, result.Rows[0].Status)

	// the changed time span is compared with its new content: this row is the same now
	again, err := resolver.CheckImport(user, []*gqlmodel.InputImportRow{row(2, "2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z", "meeting; other", "work", "shared")}, nil, nil)
	require.NoError(t, err)
	require.Equal(t, gqlmodel.ImportStatusDuplicate, again.Rows[0].Status)

	_, err = resolver.CheckImport(user, nil, nil, []*gqlmodel.InputImportUpdate{{ID: 999, Note: "", Tags: nil}})
	require.EqualError(t, err, "time span with id 999 does not exist")
	_, err = resolver.CheckImport(fake.UserWithPerm(9, false), nil, nil, updates)
	require.EqualError(t, err, "time span with id 1 does not exist") // the time spans of others cannot be updated
	_, err = resolver.CheckImport(user, nil, nil, []*gqlmodel.InputImportUpdate{{ID: id, Note: "", Tags: []string{"nope"}}})
	require.EqualError(t, err, "tag 'nope' does not exist")
}

func TestImport_limitsTheRows(t *testing.T) {
	db := test.InMemoryDB(t)
	defer db.Close()
	db.User(5)
	resolver := ResolverForTimeSpan{DB: db.DB}
	rows := make([]*gqlmodel.InputImportRow, MaxImportRows+1)
	for i := range rows {
		rows[i] = row(i, "2019-06-10T09:00:00Z", "2019-06-10T10:00:00Z", "")
	}
	_, err := resolver.CheckImport(fake.User(5), rows, nil, nil)
	require.EqualError(t, err, "an import must not contain more than 1500 rows")
}
