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
