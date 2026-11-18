# Unreleased

What changed since 0.30.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `AccountMenu` no longer takes `scheme` and `onSchemeChange`, nor the words `scheme`, `light`,
  `dark` and `system`: the menu has no Light, Dark and System rows. Put the scheme in Settings ›
  Appearance (`themeSettings`) and in the palette (`appearanceCommands`), and give the menu
  `onAppearance` to open Settings at Appearance.
- `CodeSchemaWords` (`SCHEMA_WORDS`) says each kind of schema issue as a phrase of its own
  (`required`, `type`, `minLength`, ..., `deprecatedKey`, `other`), each with a catalog message, in
  place of `say(issue)`; `sayIssue(words, issue)` (from `CodeEditor`) picks the phrase.
- `LETTER_WORDS.to` takes the recipients already listed (`(names: string) => string`); the letter
  lists them in the locale (`Intl.ListFormat`).
- `RepeatedGroup`'s and `SchemaForm`'s `item` takes the row's place counted from 1, not its index,
  and a row's controls are named by `itemAction(action, item)` ("Move up: Item 2", "Remove: Item
  2", one form for all three); the words `first` and `last` say why a shut Move is shut.
- `SECRET_FIELD_WORDS.replaceLabel` is given the label as it reads mid-sentence ("password"); the
  field lowercases a capitalized first word itself.
- `TREE_SELECT_WORDS` no longer holds `actions`, which a tree select never said.

## Added

- `LocaleProvider` (`@winterop-com/sokkel-ui/LocaleProvider`) gives every part under it a `locale`
  (BCP 47, `en-US` without one) and `messages`, a catalog of ICU MessageFormat strings by message
  id. A part's own `words` still win over the catalog, word by word, and a word the catalog does not
  hold stays English. `useLocale()` and `useWords(PART, words)` (`lib/words`) read them.
- Every word has a message id, `<part>.<word>` (`dataTable.rows`, `callBar.leave`,
  `emojiPicker.groups.recent`), and each package ships its English catalog as
  `messages/en.json` (`@winterop-com/sokkel-ui/messages/en.json`, and the charts, maps, graph,
  media and terminal add-ons' own), written by `bun run messages`. Phrases that count are ICU
  plurals, chosen by the locale's rules.
- Each part exports `<NAME>_PART` beside its `<NAME>_WORDS` (its id, the names of its phrases'
  arguments and the parts it takes words from) and, where it has phrases, `<NAME>_MESSAGES`, their
  English as ICU messages. The words constants that were private are exported under names made
  from their types (`TREE_WORDS`, `MAP_POPUP_WORDS`, `CODE_BLOCK_WORDS`).
- Health states, known to every status part without a map: `ok` (good), `warn` (warning), `fail`
  and `error` (critical), said by their names (`HEALTH_STATUSES`, `HEALTH_STATUS_MAP` and the type
  `HealthStatus` in `lib/status`; `StatusChip`'s `Status` takes them). An app's map still wins.
- `JSON_TREE_WORDS.items`: a folded list says how many items it holds, as a folded object says its
  keys. `PANEL_WORDS` and `PANEL_PART` (charts' `dashboard/series`) give a panel's data-view column
  names (Category, Series, Value) their ids, `panel.*`. `writeCount` (`lib/numbers`) writes a count
  in an English default word.
- Every word that had no catalog message now has one where it says rather than formats:
  `letter.to`, `secretField.replaceLabel`, `repeatedGroup.item`, `schemaForm.item`, the schema
  issues (`schema.*`) and the panel's column names. `secretField.setWhen` (it takes the live
  relative time) and `schemaForm.say` (it takes an issue and a schema) still format.
- `lib/message-format`: `formatMessage`, `compileMessage` and `messageArguments`, the library's
  ICU subset, for an app's own messages.

## Changed

- Numbers, dates, lists and sorting follow the provider's locale instead of a fixed `en-US`: the
  data table's sort, inline edits, the filter bar, the file field, the uptime bar, the run timeline,
  the conversation history, the time range, thresholds, charts (`ChartSpec.locale`) and maps
  (`sequentialScale`'s and `divergingScale`'s `locale`). A part's own `locale` or formatter still
  wins, and without a provider everything reads as before.
- `TERMINAL_WORDS` spreads `TERMINAL_VIEW_WORDS`, `MAP_LEGEND_WORDS` holds the class words, and
  `CHART_FRAME_WORDS` the windowed pane's and panel state's, so each word has one id.

## Fixed

- `ThemePicker`'s `typefaces` and `TYPEFACES` say that Geist's fonts are optional peers an app installs
  and imports when it offers Geist; without them a reader who picks it gets the system font.
- The themes that set their table heads in capitals (terminal, phosphor, phosphor-bright) keep
  them at the cells' size: capitals with their tracking already stand a step above the rows, and at
  the larger head size they read loud and cut their words short.
- Counts read the same with and without `LocaleProvider`: every English default that says a count
  or a place groups its thousands ("1,200 errors"), as the catalogs' ICU messages do, and a number
  in a plain ICU argument (`{count}`) is written in the locale, as ICU writes it. A year is written
  `{year, number, ::group-off}` in the period labels' messages, so it never reads "2,026". The follower and
  like counts' messages keep a decimal (`::compact-short .#`, "12.3K") as their English does.
- `SecretField` in a field wears the issue edge and the invalid ring on focus, as every typed field
  does; it showed the plain focus ring.
- `YesNoField` draws the issue's edge on its choice, and `PeriodPicker` in a `Field` on its trigger
  with the mark's room there, rather than on a wrapper with no edge that the room squeezed. A control
  that draws its own edge marks its root `data-field-edge="own"`, and `Field` leaves it alone.
- `RepeatedGroup`'s and `SchemaForm`'s shut Move up and Move down stay reachable and say why
  (principle 13), as a shut `IconButton` does.
- `TreeSelect`'s Clear beside the search wears the frame's focus look; `Problem`'s mark is in its
  tone's ink and its rule and rounding sit on its logical sides; `SidePanel` writes in
  `sidebar-foreground` on its `sidebar` ground.
