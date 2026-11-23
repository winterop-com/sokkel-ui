# Unreleased

What changed since 0.34.7, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Fixed

- Markdown: `\[...\]` on lines of their own inside a quote or callout is display math, and inline
  math over several lines of a quote leaves the quote's markers out; before, the `>` markers were
  read into the formula.
- Markdown: a `$` inside an autolink or a raw HTML tag stays as written; before, it gained a
  backslash, so a link's address changed.
- Markdown: a long line of `$`, `\(`, `\[` or `==` openers that never close is read in time that
  grows with its length; 120 KB of `$a ` took 13 s and now takes milliseconds.
- Markdown and the code editor's markdown: a tag, a frontmatter key, a mention and a heading's
  anchor read letters with their combining marks, so `#हिंदी` is one tag.
