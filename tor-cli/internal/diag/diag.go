// Package diag is torshim's leveled diagnostic channel: the verbosity
// system (-v/-vv/-vvv/-q, --log-level, --log-file), the stage-tagged
// stderr log lines, and the terminal verdict lines.
//
// Binding format (research 16.3): "HH:MM:SS.mmm LEVEL stage: message",
// stderr only, colored only when stderr is a TTY and NO_COLOR is unset.
// The level check runs before any formatting, so a disabled line costs
// zero formatting work (gate G5).
//
// Scope rule: the diagnostic channel WRAPS, never rewrites, product
// output. User-facing errors keep their exact "torshim: ..." rendering
// on the failure path; log lines are additive diagnostics.
package diag

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

// Level doubles as a record severity and a display threshold: a record
// shows when its level is at or below the threshold. Error is always
// shown (fail-closed honesty: the diagnostic channel can never hide
// errors), which is also what "-q / --log-level quiet|error" means:
// errors only.
type Level int

const (
	// Error records render at every threshold (including -q).
	Error Level = iota
	// Warn records render at the default threshold.
	Warn
	// Info records render with -v (the Owner acceptance list).
	Info
	// Debug records render with -vv (control chatter, retries).
	Debug
	// Trace records render with -vvv (per-iteration poll timestamps).
	Trace
)

// String renders the lower-case level name.
func (l Level) String() string {
	switch l {
	case Error:
		return "error"
	case Warn:
		return "warn"
	case Info:
		return "info"
	case Debug:
		return "debug"
	case Trace:
		return "trace"
	default:
		return "unknown"
	}
}

// tag renders the upper-case level token used in log lines.
func (l Level) tag() string {
	switch l {
	case Error:
		return "ERROR"
	case Warn:
		return "WARN"
	case Info:
		return "INFO"
	case Debug:
		return "DEBUG"
	case Trace:
		return "TRACE"
	default:
		return "LEVEL"
	}
}

// ParseLevel maps the --log-level enum. "quiet" is documented as an
// alias of "error": both mean errors only (the channel has no
// below-error tier, because errors must never be suppressible).
func ParseLevel(s string) (Level, error) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "quiet", "error":
		return Error, nil
	case "warn":
		return Warn, nil
	case "info":
		return Info, nil
	case "debug":
		return Debug, nil
	case "trace":
		return Trace, nil
	}
	return Warn, fmt.Errorf("diag: unknown log level %q (want quiet|error|warn|info|debug|trace)", s)
}

// Stage tags the subsystem that emitted a line. The Phase 1 list is the
// binding research 16.3 set for the subsystems that exist today; later
// phases extend it with their own stages.
type Stage string

// Stage constants (research 16.3).
const (
	StageCLI     Stage = "cli"
	StageLife    Stage = "lifecycle"
	StageReady   Stage = "readiness"
	StageControl Stage = "control"
	StagePerApp  Stage = "perapp"
	StageShell   Stage = "shell"
	StageStatus  Stage = "status"
	StageSyswide Stage = "syswide"
	StageDoctor  Stage = "doctor"
	StageVerify  Stage = "verify"
)

// Logger writes stage-tagged leveled lines to a writer plus an optional
// tee file. The zero value is unusable; use New.
type Logger struct {
	mu        sync.Mutex
	threshold Level
	out       io.Writer
	file      io.Writer
	color     bool
	now       func() time.Time
}

// New builds a logger. out is the primary sink (stderr in the product).
func New(out io.Writer, threshold Level) *Logger {
	return &Logger{
		threshold: threshold,
		out:       out,
		color:     false,
		now:       time.Now,
	}
}

// SetTee installs a secondary sink receiving the plain (uncolored) line.
func (l *Logger) SetTee(w io.Writer) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.file = w
}

// SetColor toggles ANSI coloring of the level token.
func (l *Logger) SetColor(on bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.color = on
}

// SetThreshold changes the display threshold.
func (l *Logger) SetThreshold(t Level) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.threshold = t
}

// Threshold reports the current display threshold.
func (l *Logger) Threshold() Level {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.threshold
}

// Enabled reports whether a record at lv would render. Callers gate
// expensive message building on this (zero-cost disabled lines).
func (l *Logger) Enabled(lv Level) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return lv <= l.threshold
}

// Logf renders one log line when lv is enabled. The threshold check
// runs before Sprintf so disabled lines cost nothing (G5).
func (l *Logger) Logf(lv Level, stage Stage, format string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if lv > l.threshold {
		return
	}
	msg := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("%s %s %s: %s", l.now().Format("15:04:05.000"), lv.tag(), stage, msg)
	l.emitLocked(line, lv)
}

// Verdictf writes a bare terminal line (no timestamp prefix) when the
// info threshold is enabled, and tees it to the log file. Verdict lines
// are product surface pinned verbatim by research 16.3, so they never
// carry the log-line prefix.
func (l *Logger) Verdictf(format string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if Info > l.threshold {
		return
	}
	l.emitLocked(fmt.Sprintf(format, args...), Info)
}

func (l *Logger) emitLocked(line string, lv Level) {
	plain := line + "\n"
	if l.file != nil {
		_, _ = io.WriteString(l.file, plain)
	}
	if l.out == nil {
		return
	}
	if l.color {
		_, _ = io.WriteString(l.out, colorize(lv, plain))
		return
	}
	_, _ = io.WriteString(l.out, plain)
}

func colorize(lv Level, s string) string {
	var code string
	switch lv {
	case Error:
		code = "31"
	case Warn:
		code = "33"
	case Info:
		code = "32"
	case Debug:
		code = "36"
	default:
		code = "90"
	}
	return "\x1b[" + code + "m" + s + "\x1b[0m"
}

// ---------------------------------------------------------------------------
// Package-level channel used by the product.
// ---------------------------------------------------------------------------

var (
	defMu  sync.Mutex
	defLog = New(os.Stderr, Warn)
)

func init() {
	defLog.SetColor(isTTY(os.Stderr) && os.Getenv("NO_COLOR") == "")
}

// Logf writes through the package logger.
func Logf(lv Level, stage Stage, format string, args ...any) {
	defLog.Logf(lv, stage, format, args...)
}

// Enabled reports the package threshold.
func Enabled(lv Level) bool { return defLog.Enabled(lv) }

// Verdictf writes a terminal verdict line through the package logger.
func Verdictf(format string, args ...any) { defLog.Verdictf(format, args...) }

// Threshold reports the package threshold.
func Threshold() Level { return defLog.Threshold() }

func isTTY(f *os.File) bool {
	fi, err := f.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

// ---------------------------------------------------------------------------
// Flag plumbing: shared state, flag-set registration, argv pre-scan.
// ---------------------------------------------------------------------------

// flagState accumulates verbosity flags from both recognized positions
// (argv pre-scan before the command, and each subcommand flag set) into
// one ordered stack.
type flagState struct {
	mu          sync.Mutex
	stack       Level
	stacked     bool
	lastWasV    bool
	explicit    string
	explicitSet bool
	logFile     string
	logFileSet  bool
}

var fsState = &flagState{stack: Warn}

func (s *flagState) pushV() {
	if s.stacked && s.lastWasV && s.stack < Trace {
		s.stack++
	} else {
		s.stack = Info
	}
	s.stacked = true
	s.lastWasV = true
}

func (s *flagState) pushQuiet() {
	s.stack = Error
	s.stacked = true
	s.lastWasV = false
}

func (s *flagState) reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stack = Warn
	s.stacked = false
	s.lastWasV = false
	s.explicit = ""
	s.explicitSet = false
	s.logFile = ""
	s.logFileSet = false
}

type stackValue struct {
	s     *flagState
	quiet bool
	// n is how many -v pushes one flag occurrence means (1 for -v,
	// 2 for -vv, 3 for -vvv; ignored for -q).
	n int
}

func (v *stackValue) String() string {
	if v == nil || v.s == nil {
		return ""
	}
	return ""
}

// IsBoolFlag makes "-v" legal without a value (and "-v=false" a no-op,
// matching Go bool-flag conventions).
func (v *stackValue) IsBoolFlag() bool { return true }

func (v *stackValue) Set(x string) error {
	if x == "false" || x == "0" {
		return nil
	}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	if v.quiet {
		v.s.pushQuiet()
	} else {
		for i := 0; i < v.n; i++ {
			v.s.pushV()
		}
	}
	return nil
}

type levelValue struct{ s *flagState }

func (v *levelValue) String() string {
	if v == nil || v.s == nil {
		return ""
	}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	return v.s.explicit
}

func (v *levelValue) Set(x string) error {
	if _, err := ParseLevel(x); err != nil {
		return err
	}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	v.s.explicit = x
	v.s.explicitSet = true
	return nil
}

type fileValue struct{ s *flagState }

func (v *fileValue) String() string {
	if v == nil || v.s == nil {
		return ""
	}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	return v.s.logFile
}

func (v *fileValue) Set(x string) error {
	if strings.TrimSpace(x) == "" {
		return fmt.Errorf("diag: --log-file needs a path")
	}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	v.s.logFile = x
	v.s.logFileSet = true
	return nil
}

// Register adds the global verbosity flags to fs (research 16.4
// position b: inside a torshim subcommand's flag set). Flags the
// command already defines are left untouched.
func Register(fs *flag.FlagSet) {
	if fs.Lookup("v") == nil {
		fs.Var(&stackValue{s: fsState, n: 1}, "v", "verbose: -v info, -vv debug, -vvv trace (stackable)")
	}
	if fs.Lookup("vv") == nil {
		fs.Var(&stackValue{s: fsState, n: 2}, "vv", "verbose twice: debug level")
	}
	if fs.Lookup("vvv") == nil {
		fs.Var(&stackValue{s: fsState, n: 3}, "vvv", "verbose thrice: trace level")
	}
	if fs.Lookup("q") == nil {
		fs.Var(&stackValue{s: fsState, quiet: true, n: 1}, "q", "errors only")
	}
	if fs.Lookup("log-level") == nil {
		fs.Var(&levelValue{s: fsState}, "log-level", "quiet|error|warn|info|debug|trace (wins over -v/-q)")
	}
	if fs.Lookup("log-file") == nil {
		fs.Var(&fileValue{s: fsState}, "log-file", "tee all log lines to FILE (bug reports)")
	}
}

// globalToken reports whether argv[i] is a recognized global verbosity
// flag and, when it takes a separate value, that the value exists.
// Returns the number of argv slots consumed (0 = not a global flag).
func globalToken(argv []string, i int) int {
	a := argv[i]
	takeValue := func() int {
		if i+1 >= len(argv) {
			return 0 // missing value: leave it for the flag set to reject
		}
		return 2
	}
	switch a {
	case "-v", "--v":
		fsState.mu.Lock()
		fsState.pushV()
		fsState.mu.Unlock()
		return 1
	case "-vv", "--vv":
		fsState.mu.Lock()
		fsState.pushV()
		fsState.pushV()
		fsState.mu.Unlock()
		return 1
	case "-vvv", "--vvv":
		fsState.mu.Lock()
		fsState.pushV()
		fsState.pushV()
		fsState.pushV()
		fsState.mu.Unlock()
		return 1
	case "-q", "--q":
		fsState.mu.Lock()
		fsState.pushQuiet()
		fsState.mu.Unlock()
		return 1
	case "-log-level", "--log-level":
		if takeValue() == 0 {
			return 0
		}
		if _, err := ParseLevel(argv[i+1]); err != nil {
			return 0 // invalid value: the command's flag set rejects it (exit 2)
		}
		fsState.mu.Lock()
		fsState.explicit = argv[i+1]
		fsState.explicitSet = true
		fsState.mu.Unlock()
		return 2
	case "-log-file", "--log-file":
		if takeValue() == 0 {
			return 0
		}
		if strings.TrimSpace(argv[i+1]) == "" {
			return 0
		}
		fsState.mu.Lock()
		fsState.logFile = argv[i+1]
		fsState.logFileSet = true
		fsState.mu.Unlock()
		return 2
	}
	if v, ok := strings.CutPrefix(a, "-log-level="); ok {
		if _, err := ParseLevel(v); err != nil {
			return 0
		}
		fsState.mu.Lock()
		fsState.explicit = v
		fsState.explicitSet = true
		fsState.mu.Unlock()
		return 1
	}
	if v, ok := strings.CutPrefix(a, "--log-level="); ok {
		if _, err := ParseLevel(v); err != nil {
			return 0
		}
		fsState.mu.Lock()
		fsState.explicit = v
		fsState.explicitSet = true
		fsState.mu.Unlock()
		return 1
	}
	if v, ok := strings.CutPrefix(a, "-log-file="); ok {
		if strings.TrimSpace(v) == "" {
			return 0
		}
		fsState.mu.Lock()
		fsState.logFile = v
		fsState.logFileSet = true
		fsState.mu.Unlock()
		return 1
	}
	if v, ok := strings.CutPrefix(a, "--log-file="); ok {
		if strings.TrimSpace(v) == "" {
			return 0
		}
		fsState.mu.Lock()
		fsState.logFile = v
		fsState.logFileSet = true
		fsState.mu.Unlock()
		return 1
	}
	return 0
}

// Prescan consumes recognized global verbosity flags from the front of
// argv (research 16.4 position a: before the command name) and returns
// the remainder. It stops at the first token that is not one of those
// flags - including the first non-flag token, so the bare form
// `torshim curl -v https://...` keeps handing -v to curl.
func Prescan(argv []string) []string {
	for i := 0; i < len(argv); {
		n := globalToken(argv, i)
		if n == 0 {
			return argv[i:]
		}
		i += n
	}
	return nil
}

// Options finalize a diag run after flag parsing.
type Options struct {
	// JSON marks a run whose stdout carries only a JSON payload: the
	// level drops to warn unless --log-level or --log-file was given
	// explicitly (research 16.3).
	JSON bool
}

var (
	teeFile *os.File
	teePath string
)

// Apply computes the final threshold and opens the log file. Every
// command calls it once after its flag set parsed.
func Apply(o Options) error {
	fsState.mu.Lock()
	th := Warn
	if fsState.stacked {
		th = fsState.stack
	}
	if fsState.explicitSet {
		if lv, err := ParseLevel(fsState.explicit); err == nil {
			th = lv
		}
	}
	jsonKeep := fsState.explicitSet || fsState.logFileSet
	logPath, wantFile := fsState.logFile, fsState.logFileSet
	fsState.mu.Unlock()
	if o.JSON && !jsonKeep {
		th = Warn
	}
	defLog.SetThreshold(th)
	if wantFile && (teeFile == nil || teePath != logPath) {
		f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
		if err != nil {
			return fmt.Errorf("diag: open --log-file %s: %w", logPath, err)
		}
		if teeFile != nil {
			_ = teeFile.Close()
		}
		teeFile, teePath = f, logPath
		defLog.SetTee(f)
	}
	return nil
}

// Close releases the log-file tee (called once before exit).
func Close() {
	defMu.Lock()
	defer defMu.Unlock()
	defLog.SetTee(nil)
	if teeFile != nil {
		_ = teeFile.Close()
		teeFile = nil
		teePath = ""
	}
}

// Reset restores pristine flag state (tests only).
func Reset() { fsState.reset() }

// ---------------------------------------------------------------------------
// Torsocks child mapping (Linux, -vv and up).
// ---------------------------------------------------------------------------

// TorsocksLogLevel maps the torshim threshold onto torsocks'
// TORSOCKS_LOG_LEVEL for child processes. Research 16.3: at -vv the
// torsocks library joins the transcript. torsocks scale (man torsocks):
// 1 none, 2 errors, 3 warnings (default), 4 notices, 5 debug. Returns
// "" when no mapping is due, so the child keeps torsocks defaults.
func TorsocksLogLevel() string {
	if Threshold() >= Debug {
		return "5"
	}
	return ""
}
