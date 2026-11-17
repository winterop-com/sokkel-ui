# Unreleased

What changed since 0.29.3, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Added

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

## Changed

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

## Fixed

- `VideoPlayer` (and so `AttachmentList`'s videos) and the `Composer`'s video thumbnails show the
  first frame in WebKit. Under `preload="metadata"` WebKit stopped at the video's length and drew
  an empty picture until it played; a paused video with no poster now seeks to where it stands once
  it has its length, which makes WebKit fetch that frame. `media/video-source` exports the check,
  `wantsFirstFrame`.
