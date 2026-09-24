package main

import (
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/Userfrom1995/Random/granite/internal/executor"
	"github.com/Userfrom1995/Random/granite/internal/planner"
	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// version is printed by the version command and in usage text.
const version = "1.0.0"

// stdout and stderr are the CLI's output streams; they are swapped in tests.
var stdout io.Writer = os.Stdout
var stderr io.Writer = os.Stderr

// exit is how main terminates; it is swappable so tests can capture the code.
var exit = os.Exit

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		usage(stderr)
		exit(2)
	}
	cmd := args[0]
	rest := args[1:]
	var err error
	switch cmd {
	case "init":
		err = cmdInit(rest)
	case "exec":
		err = cmdExec(rest, stdout)
	case "explain":
		err = cmdExplain(rest, stdout)
	case "info":
		err = cmdInfo(rest, stdout)
	case "demo":
		err = cmdDemo(rest, stdout)
	case "version", "--version", "-v":
		fmt.Fprintf(stdout, "granite %s\n", version)
		return
	case "help", "-h", "--help":
		usage(stdout)
		return
	default:
		usage(stderr)
		exit(2)
	}
	if err != nil {
		fmt.Fprintf(stderr, "granite: %v\n", err)
		exit(1)
	}
}

func usage(w io.Writer) {
	fmt.Fprintf(w, `granite %s - a SQL database engine built from scratch in Go

Usage:
  granite init <path>                  create a new empty database file
  granite exec <db> <sql...>           run SQL statements, printing results
  granite exec <db> -f <file>          run SQL statements from a file
  granite exec <db> -                  run SQL statements from standard input
  granite explain <db> <sql...>        show the query plan for a statement
  granite info <db>                    show tables, indexes, and page counts
  granite demo <path>                  build a demo database and run a tour
  granite version                      print the version

Examples:
  granite init bookshop.db
  granite exec bookshop.db "CREATE TABLE books (id INTEGER, title TEXT, price REAL);"
  granite exec bookshop.db "INSERT INTO books VALUES (1, 'Granite', 19.99);" "SELECT * FROM books;"
  granite explain bookshop.db "SELECT title FROM books WHERE price > 10;"
`, version)
}

// ---------- init ----------

func cmdInit(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("init expects exactly one argument: the database path")
	}
	path := args[0]
	db, err := storage.CreateDatabase(path)
	if err != nil {
		return err
	}
	defer db.Close()
	fmt.Fprintf(stdout, "created %s (%d pages)\n", path, db.Pages())
	return nil
}

// ---------- exec ----------

func cmdExec(args []string, out io.Writer) error {
	path, src, err := resolveInput(args)
	if err != nil {
		return err
	}
	if strings.TrimSpace(src) == "" {
		return fmt.Errorf("no SQL provided")
	}
	db, err := storage.OpenDatabase(path)
	if err != nil {
		return err
	}
	defer db.Close()
	return runStatements(db, src, out)
}

func resolveInput(args []string) (path, src string, err error) {
	var file string
	var rest []string
	for i := 0; i < len(args); i++ {
		switch {
		case args[i] == "-f":
			if i+1 >= len(args) {
				return "", "", fmt.Errorf("-f expects a file path")
			}
			file = args[i+1]
			i++
		case args[i] == "-":
			// stdin marker, handled below
			rest = append(rest, args[i])
		default:
			rest = append(rest, args[i])
		}
	}
	if len(rest) == 0 {
		return "", "", fmt.Errorf("exec expects a database path")
	}
	path = rest[0]
	switch {
	case file != "":
		b, err := os.ReadFile(file)
		if err != nil {
			return "", "", err
		}
		return path, string(b), nil
	case len(rest) >= 2 && rest[1] == "-":
		b, err := io.ReadAll(os.Stdin)
		if err != nil {
			return "", "", err
		}
		return path, string(b), nil
	case len(rest) >= 2:
		return path, strings.Join(rest[1:], " "), nil
	}
	return "", "", fmt.Errorf("exec expects SQL (or -f <file> or - for stdin)")
}

// runStatements parses, plans, and executes every statement in src.
func runStatements(db *storage.Database, src string, out io.Writer) error {
	stmts, err := sql.Parse(src)
	if err != nil {
		return err
	}
	if len(stmts) == 0 {
		return fmt.Errorf("no statements parsed")
	}
	p := planner.New(db)
	ex := executor.New(db)
	for i, stmt := range stmts {
		plan, err := p.Plan(stmt)
		if err != nil {
			return fmt.Errorf("statement %d: %w", i+1, err)
		}
		res, err := ex.Execute(plan)
		if err != nil {
			return fmt.Errorf("statement %d: %w", i+1, err)
		}
		printResult(out, res)
	}
	return nil
}

func printResult(out io.Writer, res *executor.Result) {
	if res.Explain != "" {
		fmt.Fprintln(out, res.Explain)
		return
	}
	if res.IsQuery {
		printTable(out, res.Columns, res.Rows)
		return
	}
	if res.RowsAffected > 0 {
		fmt.Fprintf(out, "OK, %d row(s) affected\n", res.RowsAffected)
	} else {
		fmt.Fprintln(out, "OK")
	}
}

// printTable renders a query result as a column-aligned table with a header
// row and dashed separators, matching the style of common SQL shells.
func printTable(out io.Writer, cols []string, rows [][]sql.Value) {
	widths := make([]int, len(cols))
	for i, c := range cols {
		widths[i] = len(c)
	}
	for _, r := range rows {
		for i, v := range r {
			if i < len(widths) && len(v.Display()) > widths[i] {
				widths[i] = len(v.Display())
			}
		}
	}
	var sb strings.Builder
	sb.WriteString("+")
	for _, w := range widths {
		sb.WriteString(strings.Repeat("-", w+2))
		sb.WriteString("+")
	}
	sep := sb.String()
	fmt.Fprintln(out, sep)
	writeRow(out, widths, cols)
	fmt.Fprintln(out, sep)
	for _, r := range rows {
		cells := make([]string, len(widths))
		for i := range widths {
			if i < len(r) {
				cells[i] = r[i].Display()
			} else {
				cells[i] = ""
			}
		}
		writeRow(out, widths, cells)
	}
	fmt.Fprintln(out, sep)
	fmt.Fprintf(out, "%d row(s)\n", len(rows))
}

func writeRow(out io.Writer, widths []int, cells []string) {
	fmt.Fprint(out, "|")
	for i, w := range widths {
		c := ""
		if i < len(cells) {
			c = cells[i]
		}
		fmt.Fprintf(out, " %-*s |", w, c)
	}
	fmt.Fprintln(out)
}

// ---------- explain ----------

func cmdExplain(args []string, out io.Writer) error {
	if len(args) < 2 {
		return fmt.Errorf("explain expects a database path and SQL")
	}
	path := args[0]
	src := strings.Join(args[1:], " ")
	if strings.TrimSpace(src) == "" {
		return fmt.Errorf("no SQL provided")
	}
	db, err := storage.OpenDatabase(path)
	if err != nil {
		return err
	}
	defer db.Close()
	stmts, err := sql.Parse(src)
	if err != nil {
		return err
	}
	if len(stmts) == 0 {
		return fmt.Errorf("no statements parsed")
	}
	p := planner.New(db)
	for i, stmt := range stmts {
		plan, err := p.Plan(stmt)
		if err != nil {
			return fmt.Errorf("statement %d: %w", i+1, err)
		}
		fmt.Fprintln(out, plan.Explain())
	}
	return nil
}

// ---------- info ----------

func cmdInfo(args []string, out io.Writer) error {
	if len(args) != 1 {
		return fmt.Errorf("info expects exactly one argument: the database path")
	}
	db, err := storage.OpenDatabase(args[0])
	if err != nil {
		return err
	}
	defer db.Close()
	names, err := db.Tables()
	if err != nil {
		return err
	}
	fmt.Fprintf(out, "database file: %s\n", args[0])
	fmt.Fprintf(out, "file size: %d bytes (%d pages of %d)\n", db.FileSize(), db.Pages(), storage.PageSize)
	fmt.Fprintf(out, "tables: %d\n", len(names))
	for _, name := range names {
		t, err := db.GetTable(name)
		if err != nil {
			return err
		}
		cols := make([]string, len(t.Cols))
		for i, c := range t.Cols {
			cols[i] = c.Name + " " + string(c.Type)
		}
		var count int64
		if err := db.ScanRows(t, func(_ int64, _ []sql.Value) bool {
			count++
			return true
		}); err != nil {
			return err
		}
		fmt.Fprintf(out, "  %s (%s), %d row(s)\n", name, strings.Join(cols, ", "), count)
		for _, ix := range t.Indexes {
			fmt.Fprintf(out, "    index %s on %s\n", ix.Name, t.Cols[ix.Column].Name)
		}
	}
	return nil
}

// ---------- demo ----------

func cmdDemo(args []string, out io.Writer) error {
	path := "granite-demo.db"
	if len(args) >= 1 {
		path = args[0]
	}
	if len(args) > 1 {
		return fmt.Errorf("demo expects at most one argument: the database path")
	}
	db, err := storage.CreateDatabase(path)
	if err != nil {
		return err
	}
	defer db.Close()
	return runDemo(db, out)
}
