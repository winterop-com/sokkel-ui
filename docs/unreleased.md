# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `Letter` (`@winterop-com/sokkel-ui/Letter`): one letter in a thread of mail, its head (the
  sender's picture, name and address, the time, a paperclip when files came along, the recipients
  or the first words) folding over its body. `open`/`onOpenChange` or `defaultOpen`, `foldable`,
  `words`.
- `DetailPane` (`@winterop-com/sokkel-ui/DetailPane`): one thing's detail as a side panel's tab
  holds it, titled sections of a sentence (`summary`), facts (`facts`) and content, then the
  thing's verbs (`actions`).
- `BoardItemPanel` and `BoardChecklist` (`@winterop-com/sokkel-ui/board/BoardItemPanel`): a work
  item in the side panel, its code, title, column chip, labels, description, fields, checklist and
  activity; the checklist counts its steps done, fills a bar and ticks each step through
  `onChecklistChange` (`onStepChange`).
- `CheckboxField` takes `dot`, a kind color drawn as a dot before the label (calendar toggles), and
  `quiet`, which sets the label quiet while `unchecked`, or struck through while `checked` (a
  checklist's done step).
- `Rail`'s `body` takes `places: 'above'`, drawing the places over the body, both shown at once,
  in place of the row that shows them in the body's place.
