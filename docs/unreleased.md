# Unreleased

What changed since 0.32.1, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `PromptDialog` (`@winterop-com/sokkel-ui/PromptDialog`): a dialog that asks for one value. One
  text field, or a `SecretField` with `secret`, Cancel and Submit, Enter submitting; `validate` gives
  the issue under the field and shuts Submit, an async `onSubmit` holds the dialog busy, and a failed
  one leaves it open with why above the verbs. Its words are `PROMPT_DIALOG_WORDS`, ids
  `promptDialog.*`.
- The `candlestick` chart kind, for prices or readings over time as open, high, low and close: a
  candle per category, rises in `good` and falls in `critical` (or what `colors` names for Rise and
  Fall), with the spec fields `ohlc` (`{ open, high, low, close, volume?, style? }`, `style: 'bars'`
  for OHLC bars; a `volume` field draws bars in a panel under the candles) and `averages` (moving
  averages of the closes, `[5, 20]`), and `zoom` as the linked chart has. New chart words `open`,
  `close` and `average` (ids `chart.open`, `chart.close`, `chart.average`). Story Charts/Candlestick.
- `CodeEditor` takes `yamlVersion` (`'1.2'` by default, or `'1.1'`): with `1.1` the schema check, its
  hover and completion and `onDocument` read a YAML document's plain values as a YAML 1.1 server
  does, so yes, no, on, off, y and n are booleans, `010` is octal, `0o10` a string, `0b101` binary,
  `1_000` a thousand and `1:30` ninety. A string the completion writes is quoted when either version
  would read it as something else.

## Fixed

- `GraphCanvas` (sokkel-ui-graph): clicking an edge while editing makes the edge the only choice. It
  calls `onSelect(null)` and `onSelectionChange([])`, so Delete removes the edge alone rather than
  the chosen step with it; Shift, Cmd or Ctrl still adds to the choice where several may be chosen.
- The schema checker imports `ajv/dist/2020.js` with its extension, so Node's resolver loads the
  built module without the app inlining it.
