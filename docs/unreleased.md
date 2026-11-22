# Unreleased

What changed since 0.34.0, for the next release's notes. A release copies this into its GitHub
release and empties it.

## Changed

- A text size kept by 0.33 or earlier is read under its name now, once: smaller as small, small as
  normal, regular as large and large as larger, so a saved choice keeps its size. The kept look
  carries `version` (`APPEARANCE_VERSION`, 1) from now on; a look without it is taken as the earlier
  names. A look kept by 0.34.0 has no version either, so a text size chosen there moves one step;
  an app that renamed its own kept text size drops that rename.

- Text is one weight step lighter: medium 450, semibold 500 and bold 600 (`--font-weight-medium`,
  `-semibold` and `-bold` in tokens.json), and every text role and the table head with them (500 to
  450, 600 to 500, 700 to 600). Charts read the medium and semibold weights from the tokens
  (`ChartLook.weight`), and the code editor and captions the weight tokens. The code face, which is
  not variable, draws 450 at 500.

## Fixed

- AccountMenu centers its neutral figure (`local`) and the initial in the avatar's circle; the
  figure stood at the circle's top left.
