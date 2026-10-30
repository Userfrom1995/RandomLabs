'use strict';

// Contract tests for the site nav pill classifier (issue #786).
//
// The macOS 390x844 failure was an assertion that demanded scrollLeft > 0
// whenever the nav overflowed, while the Releases pill fit fully inside the
// overflowing nav and site-nav.js correctly left it unscrolled. The
// classifier now asks the honest question: a pill clipped without a scroll
// must have been scrolled into view, and a pill that fits must stay put.
//
// Run: node --test web/e2e/tests/nav-pill.test.js

const test = require('node:test');
const assert = require('node:assert');
const { navPillScrollState } = require('../nav-pill.js');

function pill(overrides) {
  return {
    left: 100,
    right: 200,
    boxLeft: 0,
    boxRight: 300,
    scrollLeft: 0,
    unscrolledLeft: 100,
    unscrolledRight: 200,
    ...overrides,
  };
}

test('a fitting pill with no scroll is ok', () => {
  const state = navPillScrollState(pill());
  assert.equal(state.visible, true);
  assert.equal(state.clippedWithoutScroll, false);
  assert.equal(state.scrollRequired, false);
  assert.equal(state.ok, true);
});

test('a fitting pill left in a stale scroll position is not ok', () => {
  const state = navPillScrollState(pill({ scrollLeft: 20 }));
  assert.equal(state.clippedWithoutScroll, false);
  assert.equal(state.ok, false);
});

test('a clipped pill scrolled into view is ok', () => {
  const state = navPillScrollState(pill({
    left: 200,
    right: 300,
    scrollLeft: 160,
    unscrolledLeft: 360,
    unscrolledRight: 460,
  }));
  assert.equal(state.visible, true);
  assert.equal(state.clippedWithoutScroll, true);
  assert.equal(state.scrollRequired, true);
  assert.equal(state.ok, true);
});

test('a clipped pill left unscrolled is not ok', () => {
  const state = navPillScrollState(pill({
    left: 360,
    right: 460,
    scrollLeft: 0,
    unscrolledLeft: 360,
    unscrolledRight: 460,
  }));
  assert.equal(state.visible, false);
  assert.equal(state.clippedWithoutScroll, true);
  assert.equal(state.ok, false);
});

test('a clipped pill scrolled but still clipped is not ok', () => {
  const state = navPillScrollState(pill({
    left: 320,
    right: 420,
    scrollLeft: 40,
    unscrolledLeft: 360,
    unscrolledRight: 460,
  }));
  assert.equal(state.visible, false);
  assert.equal(state.clippedWithoutScroll, true);
  assert.equal(state.ok, false);
});

test('a pill wider than the nav box can never be ok', () => {
  const state = navPillScrollState(pill({
    left: -10,
    right: 400,
    boxLeft: 0,
    boxRight: 300,
    scrollLeft: 0,
    unscrolledLeft: -10,
    unscrolledRight: 400,
  }));
  assert.equal(state.visible, false);
  assert.equal(state.ok, false);
});

test('a one-pixel clip tolerance still counts as fitting', () => {
  const state = navPillScrollState(pill({
    left: 0.5,
    right: 300.5,
    boxLeft: 0,
    boxRight: 300,
    unscrolledLeft: 0.5,
    unscrolledRight: 300.5,
  }));
  assert.equal(state.clippedWithoutScroll, false);
  assert.equal(state.ok, true);
});

test('a missing measurement is never ok', () => {
  const state = navPillScrollState(null);
  assert.equal(state.visible, false);
  assert.equal(state.ok, false);
});
