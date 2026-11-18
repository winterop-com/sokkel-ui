# Unreleased

What changed since 0.31.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- The lean stylesheet (`sokkelStyles()`, or `styles-base.css` with the modules' lists of sources)
  carries every theme variable the library's code names outside a class: `--font-mono` and
  `--font-sans` in `CodeEditor`'s theme, the text sizes it and `MermaidDiagram` read, `--radius-node`
  in the graph canvas, `--spacing` in `Layout` and `RunTimeline`, and the rest. Tailwind writes an
  `@theme` variable only where a class uses it, so before, an app on the lean stylesheet could miss
  them: the code editor drew its text in the sans face. tokens.css now writes them in a static
  `@theme` block; `styles.css` reads the same as before.
