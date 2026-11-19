# Unreleased

What changed since 0.32.2, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Breaking

- `Markdown`, `PlainMarkdown` (and the parts drawn with them: `AssistantReply`, `AnswerColumn`,
  `MessageComposer`) read text with `unified` and `remark-parse` themselves, so an app lists both in
  its own `package.json` (`unified` ^11.0.5, `remark-parse` ^11.0.0). They are already installed under
  react-markdown, but a strict install does not let sokkel-ui reach them until the app lists them, and
  the build fails. `lib/markdown-tree` also needs `yaml` (^2.8.1).

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
- The markdown tree. `Markdown` reads a text once into its tree and draws the tree; `tree` draws a
  tree read elsewhere, such as on a server, exactly as the text would draw. `parseMarkdown` (from
  `lib/markdown-tree`, no React) reads a text into it: mdast with `yaml` (the frontmatter, its
  `properties` read as JSON), `callout`, `calloutTitle`, `wikiLink`, `embed`, `tag`, `highlight` and
  `part`, plain objects that cross a wire unchanged; `frontmatterOf(tree)` gives the frontmatter and its
  properties, and `markdownHeadings` takes a tree too. sokkel-design's `markdown/` holds the format,
  its schema and fixtures every reader must match.
- Rust (`rust`, `rs`) is among the highlighter's built-in languages.
- `MARKDOWN_WORDS` is exported from `Markdown` and `PlainMarkdown`, as other parts export their words.
- `markdownSection(content, heading)` gives the text under one heading, for a `![[Note#Heading]]`
  embed; an embed drawn by `links.embed` is set off by a rule at its start.

## Changed

- A text that opens with a `---` block of YAML properties no longer draws it as a rule and a
  heading; pass `frontmatter="markdown"` for the old reading. `markdownHeadings` skips the block too.
- An HTML comment with `allowHtml` off is no longer shown as typed.
