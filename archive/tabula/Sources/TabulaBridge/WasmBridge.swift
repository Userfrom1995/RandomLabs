/// WASM/JS interop landing zone (Phase 4). This file is the ONLY place that
/// may import JavaScriptKit (blueprint dependency rule: UI -> Bridge -> Core).
///
/// Phase 0 status: the SwiftWasm toolchain proof is deferred (see
/// tabula/docs/architecture.md: carton 1.1.3 and swift-wasm-6.3-RELEASE exist
/// upstream, but no SDK is installed in this image and no download was
/// attempted inside the Phase 0 timebox). Until the proof lands, `BridgeWasm`
/// compiles to this documented stub so `swift test` stays green on Linux and
/// no call site can accidentally assume live JS interop.
import TabulaCore

#if canImport(JavaScriptKit)
    // Phase 4: `import JavaScriptKit` plus the batched push/pull API go here:
    //   pushEdits([Edit]) -> DirtyBatch
    //   pullSnapshot() -> [CellView]
    //   dirtyRanges() -> [DirtyRange]
    // Typed-array fast path must decode to exactly the Bridge.swift structs.
#else
    /// Offline stub: records batches in memory so UI contract tests can run
    /// headlessly. It performs no evaluation; Core owns all semantics.
    public final class BridgeWasm {
        private var lastSeq: UInt64 = 0
        private var pending: [DirtyBatch] = []

        public init() {}

        /// Queue a Core-produced batch for delivery (test/UI-shell path).
        public func stage(_ batch: DirtyBatch) {
            pending.append(batch)
        }

        /// Drain staged batches newer than `since`, in sequence order.
        /// The UI drops batches at or below its last applied sequence.
        public func drain(since: UInt64) -> [DirtyBatch] {
            let fresh = pending.filter { $0.seq > since }.sorted { $0.seq < $1.seq }
            if let max = fresh.map(\.seq).max() { lastSeq = max }
            pending.removeAll()
            return fresh
        }

        public var lastDeliveredSeq: UInt64 { lastSeq }
    }
#endif
