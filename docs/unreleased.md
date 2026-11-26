# Unreleased

What changed since 0.35.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- `@winterop-com/sokkel-ui-graph` runs on React Flow 13 (`@xyflow/react` 13). Its parts work as
  before. An app that also imports `@xyflow/react` itself moves to 13 with it: `useStore` gives way to
  `useNodesStore`, `useEdgesStore`, `useViewportStore` and `useOptionsStore`, `onNodesChange` and
  `onEdgesChange` receive a changeset (`toArray()` gives the list), and a bare number as fit padding
  now means pixels.
