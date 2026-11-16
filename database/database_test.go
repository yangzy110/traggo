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

func TestExistingTagsAreNotSharedAfterTheMigration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.db")
	// the schema as it was before the shared tags existed
	old, err := gorm.Open("sqlite3", path)
	assert.NoError(t, err)
	assert.NoError(t, old.Exec("CREATE TABLE tag_definitions (key text, user_id int, color text)").Error)
	assert.NoError(t, old.Exec("INSERT INTO tag_definitions (key, user_id, color) VALUES ('project', 1, '#fff')").Error)
	old.Close()

	db, err := New("sqlite3", path)
	assert.NoError(t, err)
	defer db.Close()

	var tag model.TagDefinition
	assert.NoError(t, db.Where("shared = ?", false).Find(&tag).Error)
	assert.Equal(t, "project", tag.Key)
	assert.False(t, tag.Shared)
}
