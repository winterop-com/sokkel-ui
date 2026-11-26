# Unreleased

What changed since 0.35.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- `@winterop-com/sokkel-ui-graph` runs on React Flow 13 (`@xyflow/react` 13). Its parts work as
  before. An app that also imports `@xyflow/react` itself moves to 13 with it: `useStore` gives way to
  `useNodesStore`, `useEdgesStore`, `useViewportStore` and `useOptionsStore`, `onNodesChange` and
  `onEdgesChange` receive a changeset (`toArray()` gives the list), and a bare number as fit padding
  now means pixels.
- In a desktop window with `trafficLights`, the expanded `Rail`'s head holds only its collapse
  button beside the window's buttons; the mark and name stand in a row just below, at the rail's full
  width, where the collapsed rail's mark already stood. A long product name no longer ends in an
  ellipsis there.
