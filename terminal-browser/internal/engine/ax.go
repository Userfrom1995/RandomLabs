package engine

import (
	"encoding/json"
	"strings"
)

// AXNode is one accessibility-tree node: role, name, value, and the
// child references that form the document outline.
type AXNode struct {
	NodeID      string            `json:"nodeId"`
	Role        string            `json:"role"`
	Name        string            `json:"name"`
	Value       string            `json:"value"`
	Description string            `json:"description"`
	Level       int               `json:"level"`
	ChildIDs    []string          `json:"childIds"`
	Props       map[string]string `json:"-"`
	Ignored     bool              `json:"ignored"`
}

// axVal decodes the CDP value union: strings, booleans, tristates,
// and numbers all appear as property or name values depending on the
// node. String() renders whatever arrived so styling never drops a
// node on a type mismatch.
type axVal struct {
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

func (v axVal) String() string {
	switch t := v.Value.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		if t == float64(int(t)) {
			return itoaAX(int(t))
		}
		return ""
	default:
		return ""
	}
}

func itoaAX(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

// ParseAX decodes Accessibility.getFullAXTree into a node map plus the
// root ids in wire order.
func ParseAX(raw json.RawMessage) (map[string]*AXNode, []string, error) {
	var payload struct {
		Nodes []struct {
			NodeID      string `json:"nodeId"`
			Ignored     bool   `json:"ignored"`
			Role        axVal  `json:"role"`
			Name        axVal  `json:"name"`
			Description axVal  `json:"description"`
			Value       axVal  `json:"value"`
			ChildIDs    []string `json:"childIds"`
			Props       []struct {
				Name  string `json:"name"`
				Value axVal  `json:"value"`
			} `json:"properties"`
		} `json:"nodes"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, nil, err
	}
	nodes := make(map[string]*AXNode, len(payload.Nodes))
	order := make([]string, 0, len(payload.Nodes))
	for _, n := range payload.Nodes {
		an := &AXNode{
			NodeID:      n.NodeID,
			Role:        n.Role.String(),
			Name:        n.Name.String(),
			Value:       n.Value.String(),
			Description: n.Description.String(),
			ChildIDs:    n.ChildIDs,
			Ignored:     n.Ignored,
			Props:       map[string]string{},
		}
		if lvl, ok := propVal(n.Props, "level"); ok {
			an.Level = atoi(lvl)
		}
		for _, p := range n.Props {
			an.Props[p.Name] = p.Value.String()
		}
		nodes[an.NodeID] = an
		order = append(order, an.NodeID)
	}
	return nodes, order, nil
}

func propVal(props []struct {
	Name  string `json:"name"`
	Value axVal  `json:"value"`
}, name string) (string, bool) {
	for _, p := range props {
		if p.Name == name {
			return p.Value.String(), true
		}
	}
	return "", false
}

func atoi(s string) int {
	n := 0
	for _, r := range s {
		if r < '0' || r > '9' {
			return n
		}
		n = n*10 + int(r-'0')
	}
	return n
}

// Block is one flattened document unit: a heading, paragraph, link,
// control, table, or list item with its text and optional href.
type Block struct {
	Kind  string
	Text  string
	Href  string
	Level int
	Cells [][]string
	Head  []string
}

// Flatten walks the AX tree depth-first from roots, skipping ignored
// subtrees, and emits reading-order blocks. Text nodes merge into their
// nearest meaningful ancestor; links keep their href for hinting.
func Flatten(nodes map[string]*AXNode, order []string) []Block {
	// Child lookup: every id that appears as a child is non-root.
	isChild := map[string]bool{}
	for _, n := range nodes {
		for _, c := range n.ChildIDs {
			isChild[c] = true
		}
	}
	var roots []string
	for _, id := range order {
		if !isChild[id] {
			roots = append(roots, id)
		}
	}
	var out []Block
	for _, r := range roots {
		walk(nodes, r, &out)
	}
	return out
}

func walk(nodes map[string]*AXNode, id string, out *[]Block) {
	n, ok := nodes[id]
	if !ok {
		return
	}
	if n.Ignored {
		// Presentational containers carry no semantics of their own,
		// but their children still hold real content.
		for _, c := range n.ChildIDs {
			walk(nodes, c, out)
		}
		return
	}
	text := firstNonEmpty(n.Name, n.Value, n.Description)
	// Normalized once: roles arrive in mixed capitalizations
	// ("Button" vs "button", "SearchBox" vs "searchbox", stray
	// whitespace), and every affordance must survive all of them.
	switch strings.ToLower(strings.TrimSpace(n.Role)) {
	case "statictext", "text", "inlinetextbox":
		if strings.TrimSpace(text) != "" {
			*out = append(*out, Block{Kind: "text", Text: text})
		}
		return
	case "heading":
		if text == "" {
			text = collectText(nodes, n)
		}
		if strings.TrimSpace(text) != "" {
			*out = append(*out, Block{Kind: "heading", Text: text, Level: n.Level})
		}
		return
	case "link":
		if text == "" {
			text = collectText(nodes, n)
		}
		if strings.TrimSpace(text) != "" {
			*out = append(*out, Block{Kind: "link", Text: text, Href: n.Props["url"]})
		} else {
			for _, c := range n.ChildIDs {
				walk(nodes, c, out)
			}
		}
		return
	case "button", "textbox", "searchbox", "combobox", "checkbox", "radio", "switch":
		label := firstNonEmpty(text, collectText(nodes, n))
		*out = append(*out, Block{Kind: "control", Text: label + controlSuffix(n.Role)})
		return
	case "image", "img":
		if text != "" {
			*out = append(*out, Block{Kind: "image", Text: "[image: " + text + "]"})
		} else {
			*out = append(*out, Block{Kind: "image", Text: "[image]"})
		}
		return
	case "table", "grid":
		head, rows := collectTable(nodes, n)
		*out = append(*out, Block{Kind: "table", Head: head, Cells: rows})
		return
	case "listitem", "term", "definition":
		if text == "" {
			text = collectText(nodes, n)
		}
		if strings.TrimSpace(text) != "" {
			*out = append(*out, Block{Kind: "item", Text: text})
		}
		return
	default:
		// Containers recurse; leaf text still surfaces.
		if len(n.ChildIDs) == 0 {
			if strings.TrimSpace(text) != "" {
				*out = append(*out, Block{Kind: "text", Text: text})
			}
			return
		}
		for _, c := range n.ChildIDs {
			walk(nodes, c, out)
		}
	}
}

func collectText(nodes map[string]*AXNode, n *AXNode) string {
	var parts []string
	var rec func(id string)
	rec = func(id string) {
		c, ok := nodes[id]
		if !ok {
			return
		}
		if t := firstNonEmpty(c.Name, c.Value); strings.TrimSpace(t) != "" {
			parts = append(parts, strings.TrimSpace(t))
		}
		for _, k := range c.ChildIDs {
			rec(k)
		}
	}
	for _, c := range n.ChildIDs {
		rec(c)
	}
	return strings.Join(parts, " ")
}

func collectTable(nodes map[string]*AXNode, t *AXNode) ([]string, [][]string) {
	var head []string
	var rows [][]string
	var cur []string
	flush := func() {
		if len(cur) > 0 {
			rows = append(rows, cur)
			cur = nil
		}
	}
	var rec func(id string)
	rec = func(id string) {
		c, ok := nodes[id]
		if !ok {
			return
		}
		switch strings.ToLower(strings.TrimSpace(c.Role)) {
		case "columnheader", "rowheader":
			if t := firstNonEmpty(c.Name, collectText(nodes, c)); t != "" {
				head = append(head, t)
			}
		case "cell", "gridcell":
			if t := firstNonEmpty(c.Name, collectText(nodes, c)); t != "" {
				cur = append(cur, t)
			} else {
				cur = append(cur, "")
			}
		case "row":
			cur = nil
			for _, k := range c.ChildIDs {
				rec(k)
			}
			flush()
		default:
			for _, k := range c.ChildIDs {
				rec(k)
			}
		}
	}
	for _, c := range t.ChildIDs {
		rec(c)
	}
	flush()
	return head, rows
}

func controlSuffix(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "button":
		return " [button]"
	case "textbox", "searchbox":
		return " [input]"
	case "combobox":
		return " [select]"
	case "checkbox":
		return " [ ]"
	case "radio":
		return " ( )"
	case "switch":
		return " [switch]"
	default:
		return " [" + strings.ToLower(strings.TrimSpace(role)) + "]"
	}
}

func firstNonEmpty(v ...string) string {
	for _, s := range v {
		if strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s)
		}
	}
	return ""
}
