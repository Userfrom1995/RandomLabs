# torshim Makefile - stdlib only, no network at build time.
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
MANDIR ?= $(PREFIX)/share/man/man1

.PHONY: build test vet cross install uninstall clean

build:
	CGO_ENABLED=0 go build -o torshim .

test:
	go test ./...

vet:
	go vet ./...

# Cross-platform smoke: every supported target must compile.
cross:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tmp/torshim-linux-amd64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o /tmp/torshim-linux-arm64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o /tmp/torshim-darwin-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o /tmp/torshim-darwin-arm64 .
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o /tmp/torshim-windows-amd64.exe .

install: build
	install -d $(BINDIR) $(MANDIR)
	install -m 0755 torshim $(BINDIR)/torshim
	install -m 0644 torshim.1 $(MANDIR)/torshim.1

uninstall:
	rm -f $(BINDIR)/torshim $(MANDIR)/torshim.1

clean:
	rm -f torshim
