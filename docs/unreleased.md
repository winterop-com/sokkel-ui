# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

- `TimeSeriesPanel` takes `marks`: lines across at values, such as a target or a limit, dashed in
  their color with the label and value written at the end; the value axis reaches each. A chart's
  spec takes the same as `targets` (`ChartTarget`).
- `RAIL_SIZE` (`{ default, min, max }`, 240, 200 and 360, with its type `RailSize`) from
  `@winterop-com/sokkel-ui/Rail`: the widths the rail's props default to, for an app that keeps the
  width itself with `size` and `onSizeChange` to start from.
- `CallBar` (`@winterop-com/sokkel-ui/CallBar`): the controls of a video or audio call, a round bar
  floating over the call's picture (`placement="floating"`, the default) or docked across its foot
  (`docked`). The microphone (`muted`, `onMutedChange`) and the camera (`cameraOff`,
  `onCameraOffChange`) each take a chevron opening the app's lists of devices (`microphones`,
  `cameras`: `CallDeviceList`s under their headings, the chosen device checked); a muted microphone
  and a camera off are drawn in the critical tone. Sharing the screen (`sharing`,
  `onSharingChange`) and raising a hand (`handRaised`, `onHandRaisedChange`) are drawn pressed;
  reactions (`onReact`) is a toggle that stands the `ReactionBar` over the bar; more holds the app's
  rows (`more`, `CallBarItem`s, checked when they toggle, as captions); `onLeave` offers the
  destructive Leave. Each control is offered when its handler is given. One menu is open at a time
  (`openMenu`, `defaultOpenMenu`, `onOpenMenuChange`). Every control is round and a finger square
  below `md`; the arrows move between the buttons and stop at the ends; `shortcuts` binds ⌘D and ⌘E
  (Ctrl elsewhere, `CALL_BAR_SHORTCUTS`, or the app's own chords) for the microphone and the camera.
  Under 36rem of room the share and hand buttons move into more, and under 26rem the device lists
  follow as submenus there. Words are `words` (`CALL_BAR_WORDS`).
- Tokens `ansi-black` to `ansi-white` and `ansi-bright-black` to `ansi-bright-white`: the sixteen
  ANSI colors on the terminal ground, the contract's sixteen-color map. `TerminalView` gives xterm
  these (the same colors as before), so a theme or an app that overrides one changes what a
  terminal shows for that index.
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
- The English defaults of more parts' words, exported as every other part's are: `DATE_FIELD_WORDS`
  (`DateField`), `SCHEMA_WORDS` from `@winterop-com/sokkel-ui/CodeEditor` (a schema check's words),
  `DASHBOARD_PANEL_WORDS` (`dashboard/DashboardGrid`), `STAT_PANEL_WORDS` (`dashboard/StatPanel`),
  `THRESHOLD_LEGEND_WORDS` (`dashboard/ThresholdLegend`), and in the charts package
  `CHART_LEGEND_WORDS` (`ChartLegend`) and `CHART_WORDS` (`kinds`, a chart's own words).
- `LETTER_WORDS`, `BOARD_ITEM_PANEL_WORDS` and `BOARD_CHECKLIST_WORDS`: the English defaults of
  `Letter`'s, `BoardItemPanel`'s and `BoardChecklist`'s words, exported as every other part's are.
- `CheckboxField` takes `dot`, a kind color drawn as a dot before the label (calendar toggles), and
  `quiet`, which sets the label quiet while `unchecked`, or struck through while `checked` (a
  checklist's done step).
- `Rail`'s `body` takes `places: 'above'`, drawing the places over the body, both shown at once,
  in place of the row that shows them in the body's place.
- `NetworkGraph` takes `layout="force"`: a live force layout on d3-force, loaded the first time one
  is drawn, whose dots can be dragged, the rest following and settling again. The graph package
  now depends on `d3-force`.
- `GraphCanvas` takes `onNodeDrag`, so a canvas that is no editor can let its nodes be dragged.
- `CodeEditor` takes `onFollowLink`, which follows a `[[link]]` clicked with Mod held (Cmd on a
  Mac, Ctrl elsewhere); `wikiLinkAt` reads the link at a position.
- `CodeEditor`'s `activeLine` takes `'always'`, keeping the caret's line shaded while the editor is
  not focused, for a reader who chooses it.
- `CodeEditor`'s schema completion puts in a key whose object requires keys as a snippet: the
  whole object with each required key and a field for its value, Tab going from one to the next.
- `Markdown` and `PlainMarkdown` take `live={false}`, which draws every link as its words, and
  `highlight`, which marks where some words stand: a backlink's line drawn in the row that opens
  its note.
- `Tree` takes `openOnChoose`, which opens a closed branch as it is chosen.
- `highlightMark` (`Highlight`) gives the classes of a mark, for a part that marks words itself.
- `TimeRangePicker` takes `times` (and `clock`): a custom range starts and ends at a time of day,
  typed or picked in two fields under the calendar, the fields loading with the calendar. Its words
  add `start` and `end`. `rangeLabel` writes the times where an end is not at midnight and takes a
  `clock`; `timeOfDay` and `atTime` are new.
- A chart's spec takes `statuses`: `true` draws every series or category named for a run state in
  its status color, or an app's own `StatusMap` maps its values; a name in `colors` keeps its token.
- `MapView` takes `fallbackBasemap`, drawn while the chosen basemap cannot be had (offline, or its
  style or every tile fails), an `export` control that saves the map as a PNG named by `file`, and
  `handle` for an app's own export (`MapHandle`). Its words add `export`.
- `Basemap` takes `geometry`: outlines drawn as land, with no tile server. The maps package carries
  the world's countries (Natural Earth 1:110m, public domain), loaded on first use by `loadWorld` and
  `useWorld` in the new `world` module, which also holds `WORLD_BASEMAP`.
- `CountryLayer` (maps) fills countries by a value per ISO 3166-1 alpha-3 code from that geometry or
  the app's own, with `unvalued` to hatch or leave out the countries with no value.
- `useMediaSession` takes artwork drawn on a canvas (`MediaSessionDrawing`: a `key` and a
  `draw(context, size)`), drawn at `MEDIA_ARTWORK_SIZES` (96 to 512 pixels) as the system is told
  what plays and handed to it as JPEG data addresses (`drawArtwork`). `coverArtwork(cover)` in `Artwork` makes one
  of a drawn cover, in the colors the theme gives its tokens; `coverShapes`, `drawCover` and
  `COVER_INKS` in `cover-seed` are the shapes both the SVG and the canvas draw.
- `hlsSource` takes `skipMissing`, which lets hls.js skip a live stream's missing segment as it did
  before; `retriesMissing` and `waitingConfig` are the fragment policy it gives hls.js otherwise.
- `resumeCorrection`, `playedOn` and `RESUME_SLACK` in `media/video-source`.
- `DataTable` `searchBy`: a table or a list with a search of its own. The bar holds the table's own
  search field (`searchField` sets its placeholder, label, words and `/` key), and the rows are cut
  to those whose text holds every word typed. An app that keeps the query itself still passes
  `search`. The field and the finding load with the pager and the row menus, the first time a table
  with a `searchBy` is drawn; until then the bar keeps its place.
- `TrackList` `href`: a row links to its own page through the app's `LinkProvider`; with `onPlay`
  too, its number or cover is the button that plays it. Its link and play button load the first
  time a list has an `href`; until then the row plays as before.
- `TrackList` windowing: a list longer than `TRACK_WINDOW_FROM` (200) rows, or any with `windowed`,
  draws only the rows in view and a dozen either side; the current and the focused row stay drawn.
  The window loads the first time a list is windowed, drawing the first 40 rows until it is here
  (and on the server). `ReorderableTrackList` always draws every row.
- Themes `phosphor`, `phosphor-bright` and `tray`, each light and dark, in `themes.css` and as
  `themes/<name>.css`, and in `THEMES` for a picker. Phosphor is a green glow on a black screen in
  the code face with square corners (by day, dark green ink on a pale green paper);
  phosphor-bright is the same turned up, bright green on pure black with stronger lines; tray sets
  light cards on a gray tray with a forest green accent, under a pale blue rail and top bar by day
  and a deep blue one by night.

## Changed

- `CodeEditor`'s folding keys: Mod+. folds the block at the caret and Mod+Shift+. unfolds it,
  Mod+Alt+. folds every block and Mod+Alt+Shift+. unfolds them, so a keyboard that types `[` and `]`
  with Option or AltGr can fold. CodeMirror's bracket keys (Ctrl+Shift+[ and ], Ctrl+Alt+[ and ])
  stay as second keys. `FOLD_KEYS` is the keymap.
- A table's group heads (`groupBy`) are set as its column heads are: `text-head` in
  `table-head-ink`, in their own case, never louder than the rows under them, where they were the
  body size at weight 500 in the foreground.
- `StatPanel` wears the dashboard panel's edge (`border-strong`), and its tools the panel tools'
  focus outline, `focus-ring-offset` off; its target meter's track is `muted` (`on-fill` at 25
  percent on a filled tile) where it was the reading's own color at 15 percent.
- A chart legend's hidden entry fades at `disabled-opacity`, where it was 60 percent.

- `@winterop-com/sokkel-ui/vite` exports `sokkelStyles()`, a Vite plugin that gives an app the
  lean stylesheet from its own imports. Put it before `tailwindcss()` and keep importing
  `styles.css`: it becomes `styles-base.css` with the lists of sources of every library module the
  app's code imports (its own files, the files they reach by relative imports and any installed
  package that depends on the library), and the add-ons' `styles.css` are dropped. Apps without it
  are unchanged. The size apps' pages drop from about 52 to 22 kB of CSS gzipped, the notes example's
  from 57 to 35 kB.
- The command palette no longer depends on cmdk: `primitives/command` draws the library's own list,
  taken from cmdk 1.1.1 without its dialog and the Radix packages behind it, with the same keys,
  filtering, `cmdk-*` attributes and props. The palette's lazy chunk is about 13 kB smaller. An app
  that imported `cmdk` itself through the core's dependency adds it to its own.
- `DataTable` loads the pager's page size select and the rows' right-click menus the first time a
  table that pages or has row actions is drawn; until then the pager shows the page size as text and
  a right click on a row is the browser's.
- `hlsSource` waits on a segment a live stream lists but its server answers missing (a 4xx) rather
  than letting hls.js skip past it: hls.js fetches it again as it backs off, the player waits on it
  as on any stall, its tries taking over, and plays on from where it stood once the segment is
  there. An app's own `shouldRetry` in `config.fragLoadPolicy` stands over this.
- `VideoPlayer` says "Trying again" until the playhead plays on again, not once the media loads; a
  try for a video that was paused still ends once it loads.

## Fixed

- `CallBar`: a muted microphone or a camera that is off keeps its critical ink under the pointer,
  where the ghost button's hover ink turned it to the foreground's.
- `BoardChecklist`: its heading is a word, `words.title(done, total)` ("Checklist 2/4" by default,
  `BOARD_CHECKLIST_WORDS`), so an app can translate and reorder the count.
- `CheckboxField`: a disabled row fades once, at `disabled-opacity`, its box with it, where the row
  faded to a literal 60 percent and its box again on its own.
- A missing value is drawn as the dash, `—`, as everywhere else: in `DescriptionList` (and so
  `DetailPane` and `BoardItemPanel`), a chart's data table, the gauge, `BarGauge`, the dual axis
  and parallel charts' tooltips, and `ChartLegend`, which drew a hyphen.
- Text an app or a person gives is read in time in step with its length, where a long run of one
  character (spaces, zeros, dashes, backticks, brackets) took seconds before: `readNumber` and a
  schema field's number, `readTime` and `readDateTime`, `fileName`, `mentionsIn`, `withoutCode`
  and the wiki links read past code, `markdownHeadings` (and a `Markdown` table of contents),
  `DataTable`'s column widths (`widenTrack`), `isAddress` and `parseAddresses`, `requestAddress`
  (`ApiPlayground`), `TextLink`'s external mark and the charts' `bandLabel`. What each reads is
  unchanged.
- `useStored`, `createStore` and the stored values say they are not for secrets: they keep plain
  text any script on the page can read.
- `VideoPlayer` resumes a try where it stood under a browser's own HLS, which landed a try at a live
  stream's edge at the start of the segment it stood in and played up to a segment again: a try
  that picks up short is moved on there, or held paused under "Trying again" until the stream has
  grown and loaded again there.
- `VideoPlayer` (and so `AttachmentList`'s videos) and the `Composer`'s video thumbnails show the
  first frame in WebKit. Under `preload="metadata"` WebKit stopped at the video's length and drew
  an empty picture until it played; a paused video with no poster now seeks to where it stands once
  it has its length, which makes WebKit fetch that frame. `media/video-source` exports the check,
  `wantsFirstFrame`.
- `DataTable`: a press on a stacked card's `stack: 'lead'` column opens the row unless it lands on a
  control in it; before, every press there was kept from the row.
- `DataTable`: a stacked card whose `primary` value may take more than one line is as tall as its
  values take, so a short value no longer leaves blank space under it. Such cards, and cards with
  `stackTitle: 'free'`, which drew every card before, are windowed by their measured heights: only
  the cards in view and half a view either side are drawn, each placed at the least it takes until
  it is measured, and the view stays put as cards above it are measured.
