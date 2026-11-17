package model

import "strings"

// TagColors are the colors the system assigns to new tags: fresh and friendly, not dull.
var TagColors = []string{
	"#6366f1", "#38bdf8", "#2dd4bf", "#4ade80", "#fbbf24", "#fb923c",
	"#fb7185", "#f472b6", "#c084fc", "#22d3ee", "#a3e635", "#818cf8",
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
