# Gap map: the records app on sokkel-ui

What converting the records app onto the library takes, screen by screen. The records app is a
data-entry front end: it serves forms, files what is filled in as responses with a receipt each,
forwards them to an upstream register, reads the register's people back, and shows the places a
record may come from on a tree and a map. Its screens were laid beside the library's parts and
rebuilt, in Tidevann's neutral world, as this example (`examples/records`): the same kinds of
screen, built only from the packages' public parts.

Words used here, for the app's own: **the register** is the upstream system responses are
forwarded to; **periodic report**, **single event**, **registration** and **follow-up** are the four
kinds of form; **people** are the register's tracked people (households in the example); **places**
are its hierarchy of places; **receipt** is a stored response.

**Covered** means a library part draws it today and the app only maps its data onto it. **Partly**
says what is missing. **Not covered** has no part yet.

## Library work still left, in order

1. **Resizable sheets.** Every sheet in the app drags from its left edge and keeps its width (384
   px to most of the window). `DetailSheet` and `SourceSheet` have a fixed width; give them a
   draggable edge with a remembered size, as panels have.
2. **Repeating answers.** A question answered more than once (rows of a control, each with its
   remove button, and Add answer). No part holds a list of one control yet.
3. **Examples in tabs beside an editor, and a side rail that folds.** The expressions page keeps a
   rail of runnable examples grouped under headings, in tabs per language, that folds to a strip
   with its name written down it, as the playground's presets do. Neither the grouped list in tabs
   nor a rail folding to a strip is a part (`Split` and `Inspector` hold a fixed side).
4. **Two themes by their look.** The app offers seven themes; five match the library's (its
   default is tidevann, then indigo, paper, contrast and terminal). The other two are a steel-blue
   chrome over the familiar gray and a warm white with an ember accent spent only where the app
   acts. Add them to `tokens.json` named for how they look (such as `steel` and `ember`).
5. **A row's own detail in `DataTable`.** The server page opens a row of a resource type into a
   free-form detail (each search parameter with its documentation) that is not more rows of the same
   shape. `childRows` only adds rows; add a detail drawn under an opened row.
6. **`ApiPlayground`, the rest.** An actions slot after Copy as curl (the app's Open in a new
   tab), the body in `CodeEditor` with JSON colors in place of a text area, parameter names
   completed from the hints, and the presets side folding and resizing.
7. **The entry grid, the rest.** Per run of numbers: rows or columns as the reader chooses
   (remembered), bands by the smallest category when a cut has five or more cells, and a search with
   Unfilled only over long runs. `DataTable` with `tableEditing`, `groupBy` and `aggregate` draws the
   grid, its totals and its folding to cards today.
8. **`TreeSelect` scopes.** Places outside a form's assignment drawn shut with why, and a Clear row
   for an optional place question.
9. **Counts beside a bar.** Closed: a `BarList` item's `note` is said after its share, so the
   health page's translations read "1,740 of 2,866 strings" beside each bar.
10. **The palette's foot and rows, the rest.** The foot's verb follows the chosen row (Open, Switch,
    Run) where `paletteFoot` says Open, and a row ends with its kind (Page, Form, Receipt) where its
    group does not already say it.
11. **`ApiLink` that opens.** The app's API chip opens the address in a new tab; the library's
    copies it. An `href` (or `open`) option on `ApiLink`.
12. **A larger tile.** Done: `Stat` `size="lg"` draws the one figure that asks for work at the
    display size, larger than its neighbors, beside `emphasis`; the overview's Received tile uses it.

Parts added for this conversion, in this branch: `PeriodPicker` with `lib/periods`, `ApiPlayground`,
`ServerMenu`, `ComputedField`, `YesNoField`, `Columns` `fields` (fields lined up in a row),
`DataTable` `chevron`, `CommandPalette` `foot` (`Shell` `paletteFoot`), `TextLink` for a link inside text
or among facts, and a description for every theme with `ThemePicker` `themeList`. `Field` no longer
mounts its control afresh as an issue comes or goes, which closed the period picker's typed field.

## The frame

| The app's part                                                                                                                      | Library part now                                                                          | Coverage | What the app changes                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Left rail: mark and name home, entries with a second line, active bar, collapse button, drag to resize, a nested entry under Server | `Shell`, `Rail` (`description`, nested `entries`, `collapsed`, `defaultSize`, `markHref`) | Covered  | Drop its own layout; its nav items become `RailGroup` entries. Hidden entries (forms off on a package) are left out of the groups.                                    |
| Rail foot: a Settings button                                                                                                        | `AccountMenu` with `local` and `onSettings`                                               | Covered  | The gear becomes the account row's Settings item; there is no sign-in row unless the server asks for one.                                                             |
| Phone: a strip of nav buttons scrolling sideways                                                                                    | `Shell`'s drawer from the top bar                                                         | Covered  | The strip goes; the drawer carries the same rail.                                                                                                                     |
| Header: section name on detail pages, identity, Sign out, palette button                                                            | `TopBar` (`trail`, `actions`), the palette's button                                       | Covered  | The section name becomes the trail; identity and Sign out move to `AccountMenu`.                                                                                      |
| Server state in the header (dot, the server's name, version, menu with Check again)                                                 | `ServerMenu`                                                                              | Covered  | Map ok, unreachable, unknown and checking onto `up`, `down`, `checking`; its lines (software, version, store mode) become `facts`; the check's toasts stay the app's. |
| Status bar (a summary or a trail of links, a note at the right)                                                                     | `StatusLine` with `StatusItem`s as `Shell`'s `foot`                                       | Covered  | Its `useStatusLine` becomes a page-held foot, as the example's `useFoot` does.                                                                                        |
| Keys: ? for shortcuts, Cmd/Ctrl K, Cmd/Ctrl B for the rail                                                                          | `Shell` (`?`, the palette keys), `useShortcuts`, `ShortcutsDialog`                        | Covered  | Cmd/Ctrl B is the app's own binding toggling `Rail`'s `collapsed`.                                                                                                    |
| Toasts (submit outcomes, test data, clipboard, server check)                                                                        | `Toaster` from `primitives/sonner`                                                        | Covered  | Unchanged calls to `toast`.                                                                                                                                           |
| Sign-in panel (token, credentials, issuer)                                                                                          | `SignIn` (`optional`, its own fields, server line, `probe`)                               | Covered  | Each posture is a set of `SignIn` fields and an error line.                                                                                                           |
| Not found, a project with no forms                                                                                                  | `PageState` (404 status), `Empty`                                                         | Covered  | Their sentences pass as the state's words.                                                                                                                            |
| Delivery notices above a page                                                                                                       | `Banner` with an action                                                                   | Covered  | One banner per notice, Open as its action.                                                                                                                            |

## The palette

| The app's part                                                   | Library part now                                         | Coverage | What the app changes                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| Pages, Forms, Responses, Appearance, View, Help, Session groups  | `Shell` `palette`, `placeCommands`, `appearanceCommands` | Covered  | Pages come from the rail through `placeCommands`; forms and recent receipts are groups the app builds. |
| Its own ranking (an id prefix first, then a label start)         | `paletteFilter` as a function                            | Covered  | Its scoring moves into the filter function.                                                            |
| Receipts found by an id prefix, a register lookup row            | `paletteSearch`                                          | Covered  | The lookup row is one search result opening the register's search.                                     |
| Foot: the mark and name, the verb with Enter, the palette's keys | `paletteFoot`                                            | Partly   | The verb is always Open; see item 10.                                                                  |
| A kind noun at a row's end                                       | `hint` or `code`                                         | Partly   | Use `hint`; see item 10.                                                                               |

## Overview

| The app's part                                                                  | Library part now                                                       | Coverage | What the app changes                    |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- | --------------------------------------- |
| Receipt tiles by state, each a link, Received edged                             | `Stat` `variant="tile"` with `dot`, `note`, `href`, `emphasis`, `size` | Covered  | Received is `size="lg"` while it waits. |
| Start a record: form cards with a kind chip and a count                         | `ItemCard`, `Badge` `kind`                                             | Covered  | Five kinds map onto five kind colors.   |
| This server: a strip with the server's name, its version, operations and a link | `Section`, `DescriptionList`, `StatusChip`, `Button` as a link         | Covered  |                                         |

## Forms

| The app's part                                                             | Library part now                                                                     | Coverage | What the app changes                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------- |
| Sections by how a form is filed, each with a count and an explainer        | `Section` (`meta`, `description`)                                                    | Covered  |                                                           |
| Card grid per section                                                      | `ItemCard` in `Columns`                                                              | Covered  |                                                           |
| A program's registration with its stages under it, each row with a chevron | `DataTable` `variant="list"` with `chevron` and `onOpen`; `childRows` for the indent | Covered  | Stages as child rows of the registration give the indent. |

## Filling in a form

| The app's part                                                                                       | Library part now                                                       | Coverage    | What the app changes                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header: back to All forms, title, kind, id, question count, API chip                                 | `PageHeader` (`onBack`, `code`, `meta`, `actions`), `ApiLink`          | Covered     |                                                                                                                                                                                |
| Context cards side by side, each a label, a long sentence and a control                              | `Section` with `Columns` `fields` and `Field`                          | Covered     | Every control in a row lines up whatever its sentence's length.                                                                                                                |
| Reporting from: a place picker with search and browse                                                | `TreeSelect`                                                           | Partly      | Places outside the form's scope and Clear are item 8.                                                                                                                          |
| Reporting period: recent periods of the form's type, Other period typed in                           | `PeriodPicker`, `lib/periods`                                          | Covered     | Its period types map onto `daily` to `yearly`; the uncommon ones (two-weekly, financial years, weeks from other days) are typed through Other period, which the server grades. |
| Visit date with seconds                                                                              | `DateTimeField` (`seconds`), `DateField`                               | Covered     |                                                                                                                                                                                |
| The category the values are filed under (a list with entries shut by date or place)                  | `Field` with `Select`, a disabled item with its reason                 | Covered     |                                                                                                                                                                                |
| Who a registration is about: New, or Find in the register with a search and the chosen person's card | `ChoiceList`, `Search`, `DescriptionList`                              | Covered     | Composed; the example draws the minted identifier with `ComputedField` before it exists.                                                                                       |
| Answering for: the person's registration a visit reports against                                     | `Field` with a select of the registered people, a link to register one | Covered     |                                                                                                                                                                                |
| Questions in cards by group, loose ones under Questions                                              | `Section` per group, `Columns` `fields`                                | Covered     |                                                                                                                                                                                |
| Number, text, date, time, URL answers                                                                | `NumberField`, `TextField`, `DateField`, `TimeField`                   | Covered     | Ranges move from hints to the fields' own `min` and `max`, which say a value outside them with the issue mark.                                                                 |
| A yes or no with Unanswer, and a yes-only question                                                   | `YesNoField` (`yesOnly`)                                               | Covered     |                                                                                                                                                                                |
| A computed answer, read only, with the rule that works it out                                        | `ComputedField`                                                        | Covered     | The rule's sentence is `why`, its condition `formula`.                                                                                                                         |
| Choices: a select with a clear, a search over long lists, an open choice                             | `NativeSelect` with Not answered, `AsyncSelect` (`onCreate`)           | Covered     |                                                                                                                                                                                |
| A question answered more than once                                                                   | none                                                                   | Not covered | Item 2.                                                                                                                                                                        |
| Attachment and quantity questions, which the app does not fill                                       | `FileField`; `NumberField` with a unit                                 | Partly      | The app could start filling attachments with `FileField`.                                                                                                                      |
| The grid of counts: a row per question, a column per category, a total, folding to rows              | `DataTable` with `tableEditing`, `groupBy`, `aggregate`, `stackBelow`  | Partly      | Orientation, bands and the filter are item 7.                                                                                                                                  |
| The rules the register enforces beyond the form, folded                                              | `Unfoldable` with a list                                               | Covered     |                                                                                                                                                                                |
| Breaches and server refusals as alerts under the form                                                | `IssueMark` through `Field` `error`, `IssueCount` in `FormBar`         | Covered     | Issues move onto the fields they are about; the count opens each.                                                                                                              |
| The bar: Submit, Fill with test data, a seed, Clear, the reasons Submit is shut                      | `FormBar` (`start`, `note`), `Button` `reason`, `IssueCount`           | Covered     | The stacked reasons become the button's reason and the count.                                                                                                                  |

## Responses and receipts

| The app's part                                                                                                        | Library part now                                                | Coverage | What the app changes                                       |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| State filter with counts and dots, kept in the address                                                                | `Segmented` (`count`, `dot`)                                    | Covered  |                                                            |
| Form filter, Reload                                                                                                   | `FilterChip`, `Button`                                          | Covered  |                                                            |
| Files set aside as unreadable, above the table                                                                        | `Banner` with a list                                            | Covered  | Composed.                                                  |
| The table: received, form, kind, state with a warning mark, answers, receipt                                          | `DataTable` with `rowActions` and `opened`                      | Covered  | The warning mark beside a state is an icon with a tooltip. |
| A receipt in a sheet over the list                                                                                    | `DetailSheet` (`chips`, `actions`, `foot`)                      | Partly   | The sheet's width is item 1.                               |
| A receipt on a page                                                                                                   | `PageHeader`, the same body                                     | Covered  |                                                            |
| What arrived, what the record is filed for, the answers in form order, warnings, the register's refusal, a withdrawal | `Section`, `DescriptionList`, `DataTable`, `Banner`, `Timeline` | Covered  |                                                            |
| Raw response                                                                                                          | `SourceSheet`                                                   | Partly   | Its width is item 1.                                       |

## The register's people

| The app's part                                                                                           | Library part now                                               | Coverage | What the app changes                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Search by identifier, with what it searches said                                                         | `SearchField` in `DataTable`'s `search`, `Field` `description` | Covered  |                                                                                                                             |
| Type chips, attribute and value filter                                                                   | `Segmented`, `FilterBar` or `FilterChip`                       | Covered  |                                                                                                                             |
| The table of a page, Previous and Next                                                                   | `DataTable` `paging="server"` with `chevron`                   | Covered  |                                                                                                                             |
| A person's page or sheet: identifiers, other values, registrations, visits folding open to their answers | `DescriptionList`, `DataTable` `variant="list"`, `Unfoldable`  | Partly   | Answers nested under groups with a rule down their side draw one level with `DescriptionList`; the sheet's width is item 1. |
| One person's events under the responses                                                                  | `Search` and the same body                                     | Covered  |                                                                                                                             |

## Places

| The app's part                                                                                | Library part now                                                                 | Coverage | What the app changes |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------- |
| The hierarchy: a filter, a lazy tree with levels, detached roots                              | `SubNav`, `Tree` (`query`, `loadChildren`, `meta`)                               | Covered  |                      |
| The map: boundaries, points, three emphasis tiers, a legend, notes on what could not be drawn | `MapView`, `BoundaryLayer`, `PointLayer`, `MapLegend` (`AREA_EMPHASIS`), `notes` | Covered  |                      |
| Map controls: full screen, globe, basemap menu with None, recenter                            | `MapView` `controls`, `BasemapSwitcher`                                          | Covered  |                      |
| A popup with Select over a clicked place                                                      | `MapPopup`                                                                       | Covered  |                      |
| The inspector: header, forms by kind, recorded here, children                                 | `Inspector`, `InspectorSection`                                                  | Covered  |                      |
| Three resizable panes, a narrow layout with tabs                                              | `SubNav` and `Inspector` sizes, `Tabs`                                           | Covered  |                      |

## Metadata health

| The app's part                                                               | Library part now                                 | Coverage | What the app changes                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------ | -------- | ------------------------------------ |
| Errors, warnings and notes as tiles                                          | `Stat` tiles                                     | Covered  |                                      |
| Translations per language with a bar and counts, each folding to its objects | `BarList` with `note`, `Unfoldable`, `DataTable` | Covered  | The counts go in each item's `note`. |
| A filter that opens every section while typing                               | `SearchField`, `Unfoldable` `forced`             | Covered  |                                      |
| Findings by severity, then by kind of object                                 | `Unfoldable` per severity, `DataTable` `groupBy` | Covered  |                                      |

## Playground, expressions, server, code lists

| The app's part                                                                                                                | Library part now                                                                     | Coverage | What the app changes                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| The playground: method, path, parameter rows with chips, body, Send, status and time, body, Copy as curl, history, presets    | `ApiPlayground`                                                                      | Partly   | Open in a new tab, a JSON body editor, name completion and a folding side are item 6. The app's `fetch` becomes `send`. |
| Expressions: language, define, source editor, context picker, results per define with Table and Raw, diagnostics with a caret | `CodeEditor` (`defineLanguage`, ranged marks), `Select`, `Tabs`, `DataTable`, `Code` | Partly   | The examples rail is item 3; its grammars are stream languages through `defineLanguage`.                                |
| The server: identity, authentication, operations, resource types folding to their parameters, raw document                    | `Section`, `DescriptionList`, `DataTable`, `TagChips`, `Code`                        | Partly   | The row detail is item 5.                                                                                               |
| Code lists: tabs with counts, shelves, tables with chevrons, a concept table with paging, a code lookup sheet                 | `Segmented` or `Tabs`, `Section`, `DataTable` (`paging`), `DetailSheet`              | Covered  | Not built in the example; every part it needs is in use on other pages.                                                 |

## Settings and themes

| The app's part                                      | Library part now                                                        | Coverage | What the app changes          |
| --------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ----------------------------- |
| Settings: search, Appearance and Keyboard shortcuts | `SettingsDialog`, `ShortcutsDialog`                                     | Covered  |                               |
| Themes as a list of names with a line on each       | `ThemePicker` `themeList`, `THEMES` with `description`                  | Partly   | Two of its themes are item 4. |
| Light and dark                                      | `ThemePicker`'s scheme, `AccountMenu` scheme rows, `appearanceCommands` | Covered  |                               |

## Small parts

| The app's part                                             | Library part now                                | Coverage    | What the app changes             |
| ---------------------------------------------------------- | ----------------------------------------------- | ----------- | -------------------------------- |
| API chip                                                   | `ApiLink`                                       | Partly      | Item 11.                         |
| Links inside text and among facts (a place, a form, an id) | `TextLink` (`code`, `external`)                 | Covered     | Plain anchors become `TextLink`. |
| Kind badges, domain and machine badges                     | `Badge` (`kind`, `outline`, mono)               | Covered     |                                  |
| Identifier chips                                           | `Badge` `outline` in a wrapping row, `TagChips` | Covered     |                                  |
| Text with machine parts in backticks                       | `ProseText`                                     | Covered     |                                  |
| A heading that opens what is under it                      | `Unfoldable`                                    | Covered     |                                  |
| Links into the platform's other apps                       | `IconButton` with a tooltip                     | Covered     |                                  |
| A side rail folding to a strip                             | none                                            | Not covered | Item 3.                          |
| Page states (reading, refused, not answering, empty)       | `PageState` (`status`)                          | Covered     |                                  |

## Notes from building the example

- An add-on package installed with `file:` needs `"overrides": { "@winterop-com/sokkel-ui":
  "file:../../../packages/core" }` beside it, since the add-ons name the core as `workspace:*`.
- A page that changes the shell's foot holds it through a small context (the example's `useFoot`);
  `Shell` has no per-page foot of its own.
- The app's optional peers for these pages: `shiki` (raw records and the playground's answer),
  `sonner` (toasts), `react-day-picker` and `date-fns` (the date fields' calendar).
