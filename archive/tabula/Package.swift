// swift-tools-version: 6.0
// Tabula: from-scratch spreadsheet engine in Swift.
// Issue #282. Blueprint: ideas/2026-09-03-tabula-spreadsheet-engine.md.
// Spec: docs/research/issue-282-tabula-spreadsheet.md (binding).
//
// Targets:
//   TabulaCore   - pure Swift calculation core, zero JS imports, tested with `swift test`.
//   TabulaBridge - batch snapshot transfer (Bridge.swift, pure Swift, Codable wire
//                  shape). JavaScriptKit interop lands in WasmBridge.swift behind
//                  `#if canImport(JavaScriptKit)` once the SwiftWasm toolchain proof
//                  completes (see tabula/docs/architecture.md). No external package
//                  dependencies are declared until that proof lands, so `swift test`
//                  stays green offline.
import PackageDescription

let package = Package(
    name: "Tabula",
    products: [
        .library(name: "TabulaCore", targets: ["TabulaCore"]),
        .library(name: "TabulaBridge", targets: ["TabulaBridge"]),
    ],
    targets: [
        .target(
            name: "TabulaCore",
            path: "Sources/TabulaCore"
        ),
        .target(
            name: "TabulaBridge",
            dependencies: ["TabulaCore"],
            path: "Sources/TabulaBridge"
        ),
        .testTarget(
            name: "TabulaCoreTests",
            dependencies: ["TabulaCore", "TabulaBridge"],
            path: "Tests/TabulaCoreTests"
        ),
    ]
)
