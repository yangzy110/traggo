package model

import "strings"

// TagColors are the 16 colors a tag can have. New tags get the first one which is not used yet.
var TagColors = []string{
	"#4f46e5", "#2563eb", "#0284c7", "#0d9488",
	"#16a34a", "#65a30d", "#d97706", "#ea580c",
	"#dc2626", "#e11d48", "#db2777", "#9333ea",
	"#7c3aed", "#0891b2", "#475569", "#92400e",
}

// PickTagColor returns the first color which is not used yet, if all are used the colors start again.
func PickTagColor(used []string) string {
	taken := map[string]bool{}
	for _, color := range used {
		taken[strings.ToLower(color)] = true
	}
	for _, color := range TagColors {
		if !taken[color] {
			return color
		}
	}
	return TagColors[len(used)%len(TagColors)]
}
