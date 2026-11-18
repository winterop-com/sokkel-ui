# Unreleased

What changed since 0.30.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `AccountMenu` no longer takes `scheme` and `onSchemeChange`, nor the words `scheme`, `light`,
  `dark` and `system`: the menu has no Light, Dark and System rows. Put the scheme in Settings ›
  Appearance (`themeSettings`) and in the palette (`appearanceCommands`), and give the menu
  `onAppearance` to open Settings at Appearance.

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
