package database

import (
	"os"
	"path/filepath"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"    // enable the mysql dialect
	_ "github.com/jinzhu/gorm/dialects/postgres" // enable the postgres dialect
	_ "github.com/jinzhu/gorm/dialects/sqlite"   // enable the sqlite3 dialect
	"github.com/rs/zerolog/log"
	"github.com/traggo/server/logger"
	"github.com/traggo/server/model"
)

var mkdirAll = os.MkdirAll

// New creates a gorm instance.
func New(dialect, connection string) (*gorm.DB, error) {
	createDirectoryIfSqlite(dialect, connection)

	db, err := gorm.Open(dialect, connection)
	if err != nil {
		return nil, err
	}
	db.LogMode(true)
	db.SetLogger(&logger.DatabaseLogger{})

	// We normally don't need that much connections, so we limit them. F.ex. mysql complains about
	// "too many connections".
	db.DB().SetMaxOpenConns(10)

	if dialect == "sqlite3" {
		// We use the database connection inside the handlers from the http
		// framework, therefore concurrent access occurs. Sqlite cannot handle
		// concurrent writes, so we limit sqlite to one connection.
		// see https://github.com/mattn/go-sqlite3/issues/274
		db.DB().SetMaxOpenConns(1)
		db.Exec("PRAGMA foreign_keys = ON")
	}

	log.Debug().Msg("Auto migrating schema's")
	db.AutoMigrate(model.All()...)
	mergeTags(db)

	log.Debug().Msg("Database initialized")
	return db, nil
}

func createDirectoryIfSqlite(dialect string, connection string) {
	if dialect == "sqlite3" {
		if _, err := os.Stat(filepath.Dir(connection)); os.IsNotExist(err) {
			if err := mkdirAll(filepath.Dir(connection), 0777); err != nil {
				panic(err)
			}
		}
	}
}

// mergeTags makes the tags of older versions global: the private tags of the users are merged by their key, the time spans
// and dashboards reference tags only by the key, so nothing else has to be changed. The tag of an admin is kept, a
// shared tag first.
func mergeTags(db *gorm.DB) {
	order := "user_id"
	if db.Dialect().HasColumn("tag_definitions", "shared") {
		order = "shared DESC, user_id"
	}
	var tags []model.TagDefinition
	if err := db.Order("key").Order(order).Find(&tags).Error; err != nil {
		log.Warn().Err(err).Msg("could not read the tags")
		return
	}
	keptBy := map[string]int{}
	for _, tag := range tags {
		owner, seen := keptBy[tag.Key]
		if !seen {
			keptBy[tag.Key] = tag.UserID
			continue
		}
		if owner == tag.UserID {
			continue
		}
		if err := db.Where("key = ? AND user_id = ?", tag.Key, tag.UserID).Delete(new(model.TagDefinition)).Error; err != nil {
			log.Warn().Err(err).Str("tag", tag.Key).Msg("could not merge a duplicate tag")
		}
	}
}
