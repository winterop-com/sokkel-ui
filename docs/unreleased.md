# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

Added:

- `NetworkGraph` takes `layout="force"`: a live force layout on d3-force, loaded the first time one
  is drawn, whose dots can be dragged, the rest following and settling again. The graph package
  now depends on `d3-force`.
- `GraphCanvas` takes `onNodeDrag`, so a canvas that is no editor can let its nodes be dragged.
- `CodeEditor` takes `onFollowLink`, which follows a `[[link]]` clicked with Mod held (Cmd on a
  Mac, Ctrl elsewhere); `wikiLinkAt` reads the link at a position.
- `CodeEditor`'s `activeLine` takes `'always'`, keeping the caret's line shaded while the editor is
  not focused, for a reader who chooses it.
- `CodeEditor`'s schema completion puts in a key whose object requires keys as a snippet: the
  whole object with each required key and a field for its value, Tab going from one to the next.
- `Markdown` and `PlainMarkdown` take `live={false}`, which draws every link as its words, and
  `highlight`, which marks where some words stand: a backlink's line drawn in the row that opens
  its note.
- `Tree` takes `openOnChoose`, which opens a closed branch as it is chosen.
- `highlightMark` (`Highlight`) gives the classes of a mark, for a part that marks words itself.
