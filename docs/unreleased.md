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
