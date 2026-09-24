# Snippets and result presentation

A ranked list is only useful if a user can tell why each result matched.
That is the job of the snippet: a short window of the document, chosen to
show the query terms in context, with the matches highlighted.

The naive approach is to take the first characters of the document. It is
wrong most of the time, because the interesting match is usually somewhere
in the middle. The better approach, which Meridian uses, is to choose a
window around the matches themselves.

Every matched term's byte span in the document becomes a candidate anchor.
For each candidate, Meridian opens a window of the requested length and
counts how many distinct query terms fall inside it. The window containing
the most distinct terms wins; ties go to the earlier match. This favors a
cluster like "search engine ranks results" over a run of one repeated word,
which is exactly the signal a user wants.

The window is snapped to word boundaries - a snippet never starts or ends
mid-word - and ellipses mark where text was cut on either side. The
highlights are returned as exact byte ranges, so the presentation layer can
wrap the matched words in a highlight without re-deriving them.

There is a subtlety hiding in the offsets. The engine works in bytes, not
characters, and unicode complicates everything: an ellipsis character is
three bytes, and case folding can change a word's length. The snippet code
computes highlight ranges against the original document text and then
adjusts them for the leading ellipsis, so the ranges always land on valid
character boundaries.

Presenting a result is more than text, of course. Meridian's web UI shows
the title, the source path, the snippet with highlighted terms, and a
per-term score breakdown - so a user can see that a document ranked first
because of "seismic" and not because of a common word. Transparency about
why something matched is part of good result presentation.