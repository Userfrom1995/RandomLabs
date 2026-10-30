'use strict';

// Classify the horizontal site nav's current pill from measured geometry.
//
// A nav can overflow while the active pill still fits fully inside it
// (macOS Chrome at 390x844: scrollWidth 411 vs clientWidth 362, with the
// Releases pill inside the box). The honest requirement is therefore not
// "an overflowing nav must be scrolled" but "a pill that is clipped
// without a scroll must have been scrolled into view". `site-nav.js`
// returns early when the pill fits and never resets a stale `scrollLeft`,
// so a fully visible pill is valid at any scroll offset: only a clipped
// pill must have been scrolled.
//
// Input fields come from the page measurement in site-e2e.js:
//   left, right, boxLeft, boxRight, scrollLeft,
//   unscrolledLeft, unscrolledRight
// where the unscrolled coordinates are the pill's position before the
// nav scroll is applied (pill.left + nav.scrollLeft).
function navPillScrollState(pill) {
  if (!pill) {
    return {
      visible: false,
      clippedWithoutScroll: false,
      scrollRequired: false,
      ok: false,
    };
  }
  const visible = pill.left >= pill.boxLeft - 1
    && pill.right <= pill.boxRight + 1;
  const clippedWithoutScroll = pill.unscrolledLeft < pill.boxLeft - 1
    || pill.unscrolledRight > pill.boxRight + 1;
  const scrollRequired = clippedWithoutScroll;
  const ok = visible && (!scrollRequired || pill.scrollLeft > 0);
  return { visible, clippedWithoutScroll, scrollRequired, ok };
}

module.exports = { navPillScrollState };
