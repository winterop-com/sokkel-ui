# Unreleased

What changed since 0.36.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- Markdown: `\[...\]` is display math only on lines of its own; inside a sentence `\[` and `\]` are
  escaped brackets, as CommonMark has them, so a citation's `\[45\]` stays words. Inline math is
  `\(...\)` or `$...$`.
  `Markdown`'s `inlineBracketMath` keeps the old reading for chat replies, and `AssistantReply` turns
  it on, as models write `\[...\]` inside a sentence.
- Markdown: footnote references side by side keep a gap between them, and KaTeX no longer warns in
  the console about characters it has no metrics for in strict mode (`strict: 'ignore'`).
- Tree: a label cut short shows its whole text in a tooltip, under a resting pointer and while its
  row has keyboard focus, in place of the native `title`. `cut="middle"` cuts at the end where the
  head would keep fewer than four characters.

- TagChips: `href` makes each tag a link, and the +N chip's menu a menu of links, so a modified or
  middle click opens a tag in a new tab; a tag it gives no address for falls back to `onSelect`.
- Chip: a menu item may have `href`, drawn as a link item; `onSelect` is optional on `ChipMenuItem`.
- `DropdownMenuLinkItem` (`components/ui/dropdown-menu`): a menu row that is an anchor.

- Tree: a row's actions button no longer takes the label's room. It is drawn over the row's end while
  the row is hovered, has keyboard focus or has its menu open, and the row's words fade out under it.

## Fixed

- Rail: its body's scroll box is positioned, so a tall virtual list inside (a Tree) no longer counts
  in the shell's overflow, and `scrollIntoView` in the main area no longer slides the whole shell up.
