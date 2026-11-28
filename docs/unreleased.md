# Unreleased

What changed since 0.37.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- Every component module that calls a hook or makes a context, in every package, now starts with
  `'use client'` (282 more modules, beside the 22 primitives that had it), so a React server
  component can render it. The directive covers the whole module: a server component that imports
  a plain value from one of those modules (a `*_WORDS` constant, a helper such as `checkTree` or
  `parseAddresses`) gets a client reference, not the value, and must read it in a client component.
  An app that renders only in the browser sees no change.
