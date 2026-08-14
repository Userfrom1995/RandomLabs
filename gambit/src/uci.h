#pragma once

#include "position.h"
#include "search.h"
#include "tt.h"

namespace gambit {

// UCI protocol loop. Reads commands from stdin, responds on stdout, and runs
// searches on a background thread so "stop" can interrupt them.
void uci_loop(TranspositionTable& tt);

}  // namespace gambit