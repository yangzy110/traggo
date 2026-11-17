package model

import "strings"

// TagColors are the 16 colors a tag can have. New tags get the first one which is not used yet.
var TagColors = []string{
	"#6366f1", "#38bdf8", "#2dd4bf", "#4ade80",
	"#a3e635", "#fbbf24", "#fb923c", "#ef4444",
	"#fb7185", "#f472b6", "#c084fc", "#8b5cf6",
	"#22d3ee", "#3b82f6", "#94a3b8", "#a8856b",
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
