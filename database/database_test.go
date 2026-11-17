package database

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/jinzhu/gorm"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/traggo/server/logger"
	"github.com/traggo/server/model"
)

func TestMain(m *testing.M) {
	logger.Init(zerolog.WarnLevel)
	os.Exit(m.Run())
}

func TestInvalidDialect(t *testing.T) {
	_, err := New("asdf", "testdb.db")
	assert.NotNil(t, err)
}

func TestCreateSqliteFolder(t *testing.T) {
	// ensure path not exists
	os.RemoveAll("somepath")

	db, err := New("sqlite3", "somepath/testdb.db")
	assert.Nil(t, err)
	assert.DirExists(t, "somepath")
	db.Close()

	assert.Nil(t, os.RemoveAll("somepath"))
}

func TestWithAlreadyExistingSqliteFolder(t *testing.T) {
	// ensure path not exists
	os.RemoveAll("somepath")
	os.MkdirAll("somepath", 0777)

	db, err := New("sqlite3", "somepath/testdb.db")
	assert.Nil(t, err)
	assert.DirExists(t, "somepath")
	db.Close()

	assert.Nil(t, os.RemoveAll("somepath"))
}

func TestPanicsOnMkdirError(t *testing.T) {
	os.RemoveAll("somepath")
	mkdirAll = func(path string, perm os.FileMode) error {
		return errors.New("ERROR")
	}
	assert.Panics(t, func() {
		New("sqlite3", "somepath/test.db")
	})
}

func TestPrivateTagsAreMergedAfterTheMigration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.db")
	// the schema as it was with private and shared tags
	old, err := gorm.Open("sqlite3", path)
	assert.NoError(t, err)
	assert.NoError(t, old.Exec("CREATE TABLE tag_definitions (key text, user_id int, color text, shared bool not null default false)").Error)
	assert.NoError(t, old.Exec("INSERT INTO tag_definitions (key, user_id, color, shared) VALUES ('project', 1, '#111', 0), ('project', 2, '#222', 1), ('project', 3, '#333', 0), ('own', 3, '#444', 0)").Error)
	old.Close()

	db, err := New("sqlite3", path)
	assert.NoError(t, err)
	defer db.Close()

	var tags []model.TagDefinition
	assert.NoError(t, db.Order("key").Find(&tags).Error)
	assert.Equal(t, []model.TagDefinition{
		{Key: "own", UserID: 3, Color: "#444"},
		{Key: "project", UserID: 2, Color: "#222"},
	}, tags)
}
