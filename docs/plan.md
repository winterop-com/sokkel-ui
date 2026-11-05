# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, held to screenshot baselines in both schemes at desktop and phone width.

## Distribution

`dist/` is built, not committed, so an install from a git URL gets no compiled code (bun also
blocks a git dependency's install scripts). The library is published as `@winterop-com/sokkel-ui` to
GitHub Packages by the tag workflow, and apps pin that version.

## Typefaces

Plex Sans and Plex Mono are the default. Geist and Geist Mono are the one alternative a theme sets,
through `--typeface-sans` and `--typeface-mono`, with mono's x-height at `--mono-x-height: 0.462`
and `--mono-x-height-small: 0.503`, the same share of Geist's x-height as the default's of Plex's.
Both pairs were picked from the typeface research once mono was sized to its sans.

## Primitives

The shadcn `base-nova` set on Base UI, restyled to the tokens: accordion, alert, alert-dialog,
aspect-ratio, attachment, avatar, badge, breadcrumb, bubble, button, button-group, calendar, card,
carousel, checkbox, code-block, collapsible, combobox, command, context-menu, dialog,
direction, drawer, dropdown-menu, empty, field, hover-card, input, input-group, input-otp, item,
kbd, label, marker, menubar, message, message-scroller, native-select, navigation-menu, pagination,
popover, progress, questionnaire, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toggle,
toggle-group, tooltip, trace.

## Patterns

Shell, Rail, Page, PageHeader, Section, Surface, Field, CodeField, SwitchField, SearchField,
FilterChip, ListTable, DataTable, StatusChip, AccountMenu, SidePanel, DialogShell, ConfirmDialog,
TreeSelect, AsyncSelect, CapabilityPicker.

DataTable is the table for many rows: only the rows in view are drawn, at the density's one row
height, so 50k rows sort, scroll and select at once. It sorts from its heads, selects with a bulk
bar, hides columns, pins its first column and its row menu, opens child rows, and moves by the
keyboard. It pages in the browser or from a server, loads more as its end comes near, and shows
the same rows as a grid of cards (an album view) that keeps the selection, menus and sort.

## Graphs

Their own entry under `graph/`, so an app that draws no graph loads neither React Flow nor elk.
GraphCanvas (React Flow in the tokens, fit, zoom buttons, a stage or a fitted frame), GraphNode
(the node box), the layout (a rank layout at once, elk loaded lazily and answering after),
useGraphLayout and useNodeGraph, and the views PipelineGraph, RunGraph, DependencyGraph (a lineage
of datasets and jobs) and StateMachine (labeled transitions, initial and final markers, the
current state). A canvas given `editing`, and PipelineGraph with it, becomes an editor: ports
to connect, Delete to remove, boxes to drag, a menu on right-click and a connection dropped on
empty ground, each reported to the app, which owns the graph. Views select only by default.
An editor also refuses a connection with the reason said on the canvas, adds a step from the add
button at a node's output or an edge's middle, takes blocks dragged in from a palette, and chooses
several nodes with Shift. BlockPalette, BlockPicker, GraphOverlay, GraphNotice, GraphToolbar and
useGraphHistory are its parts; the Pipeline editor stories show each way of building a pipeline.

## Validation

Option F, picked from the validation research. A field with a problem gets a colored
edge and a mark at the end of its input; pressing the mark opens what is wrong, what to do, and a
fix when one is plain. The dialog footer counts what stops the submit, beside the verb, and pressing
the count opens the first. Nothing is inserted between fields, so a form never changes height.
Issues show once a field is left with a value, or once the form is submitted, and go the moment the
value is put right. A server's refusal lands on its field until that field is changed.

`IssueMark` and `IssueCount` carry it for any form; SchemaForm is built on them, and checks values
with ajv against JSON Schema 2020-12.

For what happens outside a form, the activity list was picked from the notification research: what
happened while a person was away, newest first, unread drawn stronger, each item with its own way to
act. `ActivityList`, `ActivityButton` and `ActivityMenu` carry it (Patterns/Activity).

What comes next is in `docs/roadmap.md`.
