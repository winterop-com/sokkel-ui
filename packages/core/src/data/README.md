# Data

`emoji-en.json` is the English emoji list `EmojiPicker` loads the first time a picker opens. It is
written by `bun run emoji-data` from `emojibase-data` 18.0.0 (https://emojibase.dev, MIT, Copyright
(c) 2017-2019 Miles Johnson), keeping each emoji's character, English name, keywords, group, version
and skin tones. That data is derived from the Unicode emoji data files and the Unicode CLDR
annotations, Copyright (c) 1991-2026 Unicode, Inc., under the Unicode License v3
(https://www.unicode.org/license.txt). Never edit it by hand: run `bun run emoji-data` after moving
the pinned `emojibase-data` version in the root `package.json`.
