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
  tree read elsewhere, such as on a server, as the text draws with `links` given. `parseMarkdown` (from
  `lib/markdown-tree`, no React) reads a text into it: mdast with `yaml` (the frontmatter, its
  `properties` read as JSON), `callout`, `calloutTitle`, `wikiLink`, `embed`, `tag`, `highlight` and
  `part`, plain objects that cross a wire unchanged; `frontmatterOf(tree)` gives the frontmatter and its
  properties, and `markdownHeadings` takes a tree too. sokkel-design's `markdown/` holds the format,
  its schema and fixtures every reader must match.
- Rust (`rust`, `rs`) is among the highlighter's built-in languages.
- `sortableStep(key, layout)` (from `Sortable`): where a key moves a focused item, as the sortable list
  and grid read it. `ItemCard` names its pieces with `data-slot` (`item-card`, `item-card-cover`,
  `-body`, `-head`, `-icon`, `-check`, `-menu`, `-status`, `-description`, `-facts`).
- A highlight's words may run through inline nodes, as `==a **b** c==` and `==**bold**==`, on one
  line; the frontmatter's `yaml` value has `\n` line ends, whatever the text was written with.
- Markdown, from a review of the tree: a given tree's `data` is never drawn (it could name any
  element and property); with `allowHtml`, callouts, highlights and note embeds keep the attributes
  they are drawn by (sanitizing dropped them); `anchors` ids and `markdownHeadings` agree, from text or
  a tree, through footnotes, math, links and HTML in a heading; `markdownSection` skips frontmatter,
  finds setext headings and a repeated heading by its `-1` id; `==` is read in linear time and keeps
  a `[[link]]`'s words whole; frontmatter keys may be in any script and a few words long, and a key
  written twice keeps its last value; text can no longer reach a `data:` image through `resolveUrl`;
  a given tree is rebuilt from the fields a node may hold, each of its kind, so a malformed one (no
  children, numbers for words, deep nesting) draws rather than throws, and a table's alignment is only
  `left`, `right` or `center`; raw HTML naming an unknown callout kind no longer throws.
- The code editor's markdown colors vault syntax: the frontmatter's `---` lines and keys, callout
  markers, `![[embeds]]`, `==highlights==` and HTML comments, over lines too.
- `MARKDOWN_WORDS` is exported from `Markdown` and `PlainMarkdown`, as other parts export their words.
- `markdownSection(content, heading)` gives the text under one heading, for a `![[Note#Heading]]`
  embed; an embed drawn by `links.embed` is set off by a rule at its start.

## Changed

- A text that opens with a `---` block of YAML properties no longer draws it as a rule and a
  heading; pass `frontmatter="markdown"` for the old reading. `markdownHeadings` skips the block too.
- An HTML comment with `allowHtml` off is no longer shown as typed.
