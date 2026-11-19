# Unreleased

What changed since 0.32.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `Markdown` and `PlainMarkdown` read notes as vaults write them:
    - `frontmatter` (`'hide'`, the default, `'show'` or `'markdown'`): a YAML block at the top, every
      line of it reading as properties, is left out, shown as YAML code, or read as before;
      `splitFrontmatter` parts it from the body for the app to read.
    - HTML comments are never drawn, with `allowHtml` or without.
    - A callout's title is the rest of its first line (`> [!warning] Before a rerun`), and `-` or `+`
      after the marker folds it closed or open. The further markers notes use (`info`, `todo`,
      `success`, `question`, `danger`, `bug` and others) draw as the nearest of the five kinds.
    - `==words==` is drawn highlighted.
    - With `links`, `![[Note]]` is an embed (drawn by the new `links.embed`, or as a link in a frame),
      `![[image.png|300]]` an image 300 wide, and `![[file.pdf]]` a link to the file. No `!` is left over.
    - `resolveUrl(url, use)` rewrites each image's and link's address before it is drawn.
- Rust (`rust`, `rs`) is among the highlighter's built-in languages.

## Changed

- A text that opens with a `---` block of YAML properties no longer draws it as a rule and a
  heading; pass `frontmatter="markdown"` for the old reading. `markdownHeadings` skips the block too.
- An HTML comment with `allowHtml` off is no longer shown as typed.
