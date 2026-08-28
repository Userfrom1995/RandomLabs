package main

import (
	"fmt"
	"io"
	"strings"

	"github.com/Userfrom1995/Random/granite/internal/executor"
	"github.com/Userfrom1995/Random/granite/internal/planner"
	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// runDemo builds a small bookstore database and walks through the engine's
// features with live queries, printing each statement and its result.
func runDemo(db *storage.Database, out io.Writer) error {
	script := []string{
		"-- Granite demo: a tiny bookstore",
		"CREATE TABLE authors (id INTEGER, name TEXT, country TEXT);",
		"CREATE TABLE books (id INTEGER, title TEXT, author_id INTEGER, price REAL, stock INTEGER);",

		"INSERT INTO authors VALUES (1, 'Ada Lovelace', 'UK');",
		"INSERT INTO authors VALUES (2, 'Alan Turing', 'UK');",
		"INSERT INTO authors VALUES (3, 'Grace Hopper', 'US');",
		"INSERT INTO authors VALUES (4, 'Katherine Johnson', 'US');",
		"INSERT INTO authors VALUES (5, 'Edsger Dijkstra', 'NL');",

		"INSERT INTO books VALUES (101, 'Notes on the Analytical Engine', 1, 24.99, 7);",
		"INSERT INTO books VALUES (102, 'Computing Machinery and Intelligence', 2, 19.50, 12);",
		"INSERT INTO books VALUES (103, 'On Computable Numbers', 2, 29.00, 3);",
		"INSERT INTO books VALUES (104, 'The Compiler That Taught Me', 3, 15.75, 20);",
		"INSERT INTO books VALUES (105, 'Leading to the Moon', 4, 21.20, 5);",
		"INSERT INTO books VALUES (106, 'A Discipline of Programming', 5, 32.99, 0);",
		"INSERT INTO books VALUES (107, 'Selected Writings', 5, 18.00, 9);",
	}
	steps := []struct {
		title string
		sql   string
	}{
		{"Schema setup", strings.Join(script, "\n")},
		{"Full scan with WHERE filter", "SELECT title, price FROM books WHERE price < 20;"},
		{"ORDER BY and LIMIT", "SELECT title, price FROM books ORDER BY price DESC LIMIT 3;"},
		{"Aggregation-free projection", "SELECT title, price, stock, price * stock AS value FROM books;"},
		{"DISTINCT countries", "SELECT DISTINCT country FROM authors;"},
		{"LIKE pattern match", "SELECT title FROM books WHERE title LIKE '%Comput%';"},
		{"IS NULL filtering", "SELECT id, title FROM books WHERE price IS NOT NULL;"},
		{"JOIN authors and books", "SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id WHERE authors.country = 'UK';"},
		{"Transaction: insert then rollback", "BEGIN; INSERT INTO books VALUES (108, 'Ephemeral', 3, 9.99, 1); SELECT title, price FROM books WHERE id = 108; ROLLBACK;"},
		{"Index creation", "CREATE INDEX idx_books_price ON books (price);"},
		{"Index scan after CREATE INDEX", "SELECT title, price FROM books WHERE price >= 25;"},
		{"EXPLAIN an indexed query", "EXPLAIN SELECT title, price FROM books WHERE price >= 25;"},
		{"UPDATE with predicate", "UPDATE books SET stock = stock + 1 WHERE stock < 5;"},
		{"DELETE with predicate", "DELETE FROM books WHERE stock = 0;"},
		{"Final inventory", "SELECT id, title, price, stock FROM books ORDER BY id;"},
	}

	p := planner.New(db)
	ex := executor.New(db)
	for _, step := range steps {
		fmt.Fprintf(out, "== %s ==\n", step.title)
		if err := runSteps(db, p, ex, step.sql, out); err != nil {
			return err
		}
		fmt.Fprintln(out)
	}
	fmt.Fprintf(out, "Demo complete. Database saved to the path you chose; inspect it with:\n")
	fmt.Fprintf(out, "  granite info <path>\n")
	return nil
}

// runSteps parses and executes each statement of a script, printing results.
func runSteps(db *storage.Database, p *planner.Planner, ex *executor.Executor, src string, out io.Writer) error {
	stmts, err := sql.Parse(src)
	if err != nil {
		return err
	}
	for i, stmt := range stmts {
		plan, err := p.Plan(stmt)
		if err != nil {
			return fmt.Errorf("demo statement %d: %w", i+1, err)
		}
		res, err := ex.Execute(plan)
		if err != nil {
			return fmt.Errorf("demo statement %d: %w", i+1, err)
		}
		printResult(out, res)
	}
	return nil
}