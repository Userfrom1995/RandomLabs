/// Storage codecs: canonical JSON workbooks plus CSV/TSV import/export
/// (research 11, normative).
///
/// JSON workbook (canonical): `{version, sheets, names}`. Formulas persist as
/// source text (ASTs rebuild on load; a parse error on load becomes a
/// `#VALUE!` cell that keeps its source, so load never fails). The version
/// field gates migrations: an unknown major refuses with
/// `CodecError.versionMismatch`, never a silent drop.
///
/// CSV: per-sheet; export writes computed values (General rendering, errors
/// as codes); import parses each field as number (General grammar) else text,
/// never as a formula (leading `=` imports as text unless the caller passes
/// `formulas: true`, which prevents formula injection). Round-trip invariant
/// `export(import(export(w))) == export(w)` field-wise (Phase 3 property
/// test). Clipboard TSV follows the same value rules; paste adjusts refs via
/// `Workbook.paste`, never through these codecs.
import Foundation

public enum CodecError: Error, Hashable, Sendable {
    case versionMismatch(found: Int)
    case malformed(String)
}

/// Canonical codec version. Major bumps refuse old loaders; minor additions
/// stay backward-compatible.
public let tabulaCodecVersion = 1

struct JSONCell: Codable {
    var n: Double?
    var s: String?
    var b: Bool?
    var f: String?

    static func from(_ cell: Cell) -> JSONCell {
        switch cell.content {
        case .blank: return JSONCell()
        case .num(let x): return JSONCell(n: x)
        case .text(let t): return JSONCell(s: t)
        case .bool(let v): return JSONCell(b: v)
        case .formula(let src, _, _): return JSONCell(f: src)
        }
    }

    func toCell() -> Cell {
        if let f = f { return Cell(content: .formula(source: f, expr: nil, parsePos: nil)) }
        if let n = n { return Cell(content: .num(n)) }
        if let s = s { return Cell(content: .text(s)) }
        if let b = b { return Cell(content: .bool(b)) }
        return Cell()
    }
}

struct JSONSheet: Codable {
    var name: String
    /// Cell keys are `R<row1>C<col1>` (1-based, e.g. `R1C1` = A1).
    var cells: [String: JSONCell]
}

struct JSONName: Codable {
    /// Absolute addresses as `R<row1>C<col1>@<sheet>`; absent means dangling.
    var addrs: [String]?
}

struct JSONWorkbook: Codable {
    var version: Int
    var sheets: [JSONSheet]
    var names: [String: JSONName]
}

public enum Codecs {
    // MARK: - JSON

    /// Encode the workbook canonically: sorted sheets in order, cells keyed
    /// by address, formulas as source text.
    public static func encodeJSON(_ wb: Workbook) throws -> Data {
        let doc = JSONWorkbook(
            version: tabulaCodecVersion,
            sheets: wb.sheets.map { sheet in
                var cells: [String: JSONCell] = [:]
                for (pos, cell) in sheet.cells {
                    if case .blank = cell.content { continue }
                    cells["R\(pos.row + 1)C\(pos.col + 1)"] = JSONCell.from(cell)
                }
                return JSONSheet(name: sheet.name, cells: cells)
            },
            names: Dictionary(
                uniqueKeysWithValues: wb.names.map { (k, v) in
                    switch v {
                    case .cells(let a):
                        (k, JSONName(addrs: a.map {
                            "R\($0.row + 1)C\($0.col + 1)@\($0.sheet)"
                        }))
                    case .dangling:
                        (k, JSONName(addrs: nil))
                    }
                }
            )
        )
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        return try enc.encode(doc)
    }

    /// Decode a canonical workbook. Formulas rebuild their ASTs via the
    /// parser (parse errors become `#VALUE!` cells with source retained).
    /// Unknown majors throw `versionMismatch`; malformed JSON throws instead
    /// of crashing (research 12.6: loaders never crash).
    public static func decodeJSON(
        _ data: Data, todaySerial: Int = 0
    ) throws -> Workbook {
        let doc: JSONWorkbook
        do {
            doc = try JSONDecoder().decode(JSONWorkbook.self, from: data)
        } catch {
            throw CodecError.malformed("invalid workbook JSON")
        }
        guard doc.version == tabulaCodecVersion else {
            throw CodecError.versionMismatch(found: doc.version)
        }
        var wb = Workbook(todaySerial: todaySerial)
        wb.sheets = []
        for js in doc.sheets {
            var sheet = Sheet(name: js.name)
            for (key, jc) in js.cells {
                guard let pos = parseCellKey(key) else { continue }
                var cell = jc.toCell()
                // Rebuild formula ASTs now (source retained either way).
                if case .formula(let src, _, _) = cell.content, src.hasPrefix("=") {
                    let host = Addr(
                        sheet: wb.sheets.count, col: pos.col, row: pos.row
                    )
                    let sheetsArg = ParseSheets.list(
                        doc.sheets.map(\.name)
                    )
                    switch FormulaParser.parse(
                        src, host: host, sheets: sheetsArg
                    ) {
                    case .success(let e):
                        cell = Cell(content: .formula(
                            source: src, expr: e, parsePos: nil
                        ))
                    case .failure(let err):
                        cell = Cell(content: .formula(
                            source: src, expr: nil, parsePos: err.pos
                        ))
                    }
                } else if case .formula(let src, _, _) = cell.content {
                    // Stored `f` without `=`: treat as text (never crash).
                    cell = Cell(content: .text(src))
                }
                sheet.cells[pos] = cell
            }
            wb.sheets.append(sheet)
        }
        if wb.sheets.isEmpty { wb.sheets = [Sheet(name: "Sheet1")] }
        for (k, jn) in doc.names {
            if let addrs = jn.addrs {
                let parsed = addrs.compactMap(parseAddrKey)
                    .filter { $0.sheet < wb.sheets.count }
                wb.names[k.uppercased()] = parsed.isEmpty && !addrs.isEmpty
                    ? .dangling : .cells(parsed.sorted())
            } else {
                wb.names[k.uppercased()] = .dangling
            }
        }
        wb.recalcAll()
        return wb
    }

    static func parseCellKey(_ key: String) -> CellPos? {
        guard key.hasPrefix("R") else { return nil }
        let rest = String(key.dropFirst())
        guard let c = rest.firstIndex(of: "C") else { return nil }
        guard let r = Int(rest[..<c]), let col = Int(rest[rest.index(after: c)...]),
              r >= 1, col >= 1,
              r <= TabulaCore.maxRows, col <= TabulaCore.maxColumns
        else { return nil }
        return CellPos(col: col - 1, row: r - 1)
    }

    static func parseAddrKey(_ key: String) -> Addr? {
        let parts = key.split(separator: "@")
        guard parts.count == 2, let sheet = Int(parts[1]),
              let pos = parseCellKey(String(parts[0]))
        else { return nil }
        return Addr(sheet: sheet, col: pos.col, row: pos.row)
    }

    // MARK: - CSV

    /// Export one sheet's COMPUTED values field-wise (research 11): numbers
    /// via General rendering, bools as TRUE/FALSE, errors as codes, blanks
    /// empty. The used range is the bounding box of stored cells.
    public static func exportCSV(_ wb: Workbook, sheet s: Int) -> String {
        guard wb.sheets.indices.contains(s) else { return "" }
        let cells = wb.sheets[s].cells
        guard !cells.isEmpty else { return "" }
        let maxRow = cells.keys.map(\.row).max() ?? 0
        let maxCol = cells.keys.map(\.col).max() ?? 0
        var lines: [String] = []
        for r in 0...maxRow {
            var fields: [String] = []
            for c in 0...maxCol {
                let a = Addr(sheet: s, col: c, row: r)
                fields.append(csvField(csvValue(wb.values[a] ?? .blank)))
            }
            lines.append(fields.joined(separator: ","))
        }
        return lines.joined(separator: "\n") + "\n"
    }

    static func csvValue(_ v: Value) -> String {
        switch v {
        case .num(let x): return formatGeneral(x)
        case .str(let s): return s
        case .bool(let b): return b ? "TRUE" : "FALSE"
        case .err(let e): return e.rawValue
        case .blank: return ""
        }
    }

    static func csvField(_ s: String) -> String {
        guard s.contains(",") || s.contains("\"") || s.contains("\n")
                || s.hasPrefix(" ") || s.hasSuffix(" ")
        else { return s }
        return "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }

    /// Import CSV into one sheet starting at `origin`. Every field becomes a
    /// number (General grammar) or text, never a formula unless
    /// `formulas: true` and the field starts with `=`. Malformed rows pad
    /// short (never crash).
    public static func importCSV(
        _ text: String, into wb: inout Workbook, sheet s: Int,
        origin: CellPos = CellPos(col: 0, row: 0), formulas: Bool = false
    ) {
        guard wb.sheets.indices.contains(s) else { return }
        var edited = Set<Addr>()
        for (r, row) in parseCSV(text).enumerated() {
            for (c, field) in row.enumerated() {
                let raw: String
                if formulas, field.hasPrefix("=") { raw = field }
                else if field.hasPrefix("=") { raw = "'" + field }
                else { raw = field }
                let col = origin.col + c, rowI = origin.row + r
                wb.setCell(sheet: s, col: col, row: rowI, raw: raw)
                edited.insert(Addr(sheet: s, col: col, row: rowI))
            }
        }
        wb.recalc(edits: edited)
    }

    /// Minimal RFC-4180 reader: quoted fields with `""` escapes, CRLF/CR/LF
    /// line breaks. Never throws; unterminated quotes run to end of input.
    public static func parseCSV(_ text: String) -> [[String]] {
        var rows: [[String]] = []
        var row: [String] = []
        var field = ""
        var quoted = false
        var i = text.startIndex
        func commitField() {
            row.append(field)
            field = ""
        }
        while i < text.endIndex {
            let ch = text[i]
            if quoted {
                if ch == "\"" {
                    let n = text.index(after: i)
                    if n < text.endIndex, text[n] == "\"" {
                        field.append("\"")
                        i = text.index(after: n)
                    } else {
                        quoted = false
                        i = n
                    }
                } else {
                    field.append(ch)
                    i = text.index(after: i)
                }
            } else if ch == "\"", field.isEmpty {
                quoted = true
                i = text.index(after: i)
            } else if ch == "," {
                commitField()
                i = text.index(after: i)
            } else if ch == "\r" || ch == "\n" {
                commitField()
                row.append(contentsOf: [])
                rows.append(row)
                row = []
                let n = text.index(after: i)
                if ch == "\r", n < text.endIndex, text[n] == "\n" {
                    i = text.index(after: n)
                } else {
                    i = n
                }
            } else {
                field.append(ch)
                i = text.index(after: i)
            }
        }
        // Trailing content without a line break still forms a row, unless the
        // input was empty or ended exactly on a break.
        if !field.isEmpty || !row.isEmpty {
            commitField()
            rows.append(row)
        }
        return rows
    }

    // MARK: - TSV clipboard

    /// Export a rectangle's computed values as TSV (Excel-compatible).
    public static func exportTSV(
        _ wb: Workbook, sheet s: Int, rect: RangeRect
    ) -> String {
        var lines: [String] = []
        for r in rect.loRow...rect.hiRow {
            var fields: [String] = []
            for c in rect.loCol...rect.hiCol {
                let v = wb.values[Addr(sheet: s, col: c, row: r)] ?? .blank
                let s0 = csvValue(v)
                fields.append(
                    s0.contains("\t") || s0.contains("\n") || s0.contains("\"")
                        ? "\"" + s0.replacingOccurrences(
                            of: "\"", with: "\"\"") + "\"" : s0
                )
            }
            lines.append(fields.joined(separator: "\t"))
        }
        return lines.joined(separator: "\n")
    }
}
