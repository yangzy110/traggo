package timespan

import (
	"strings"

	"github.com/traggo/server/model"
)

// splitTag splits "name" or the older "name:value" into the key and the value.
func splitTag(label string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(label), ":", 2)
	key := strings.TrimSpace(parts[0])
	if len(parts) == 2 {
		return key, strings.TrimSpace(parts[1])
	}
	return key, ""
}

// normalizeTags returns the tags as "name" or "name:value", every key only once.
func normalizeTags(labels []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, label := range labels {
		key, value := splitTag(label)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		if value != "" {
			key += ":" + value
		}
		result = append(result, key)
	}
	return result
}

// existingTags returns the keys of the tags the user can use: the own and the shared tags.
func (r *ResolverForTimeSpan) existingTags(userID int) (map[string]bool, error) {
	var definitions []model.TagDefinition
	if err := r.DB.Where("user_id = ? OR shared = ?", userID, true).Find(&definitions).Error; err != nil {
		return nil, err
	}
	result := map[string]bool{}
	for _, definition := range definitions {
		result[definition.Key] = true
	}
	return result, nil
}

func tagLabel(tag model.TimeSpanTag) string {
	if tag.StringValue != "" {
		return tag.Key + ":" + tag.StringValue
	}
	return tag.Key
}
