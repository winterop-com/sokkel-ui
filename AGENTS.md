# Rules for agents

These rules hold for every agent and every change. When a request seems to conflict with one, stop
and ask before acting.

## The library knows no app

- Never write the name of a product or app that uses this library. Only the library's own name
  may appear. That covers files, story data, comments, docs, theme and story names, scripts,
  commit messages, PR titles and bodies, and the repository's description.
- No app's domain words or data either: no app's entities, codes, hosts or vocabulary. Every
  example belongs to one fictional app, Tidevann ("tidewater"), drawn with its mark from
  `src/stories/fixtures/TidevannMark.tsx`, and uses its neutral workspace:
    - jobs such as nightly-export, sync-inventory, rebuild-index, send-digest and import-orders;
    - run states succeeded, failed, running, queued, cancelled and skipped;
    - steps fetch, transform, validate, upload and notify;
    - people ada, grace, linus and margaret;
    - the app Tidevann, with the projects harbor, juniper and larkspur;
    - services api, worker and scheduler;
    - places by plain geography: continents, countries, cities, regions, sites;
    - hosts on example.org.
- Themes are named for how they look (paper, contrast, steel), never for where they came from.
- Before committing, search the change for app and product names and remove every hit.

## Building components

- Apps install this package and never copy from it. A component an app needs to differ gets an
  option here, never a local edit in the app.
- `tokens/tokens.json` is the only place a token is defined. Run `bun run tokens` after editing
  it; `src/styles/tokens.css` is generated and never edited by hand.
- Every corner derives from `--radius`. Every color, typeface and size comes from a token, so a
  theme can change it.
- A panel's resizing is opt-in: it appears only when the panel is given a size and a size
  handler.
- Words a component says are props with English defaults, so an app can translate them.
- Comments say what the thing does, or the constraint the code cannot show. Rationale goes in the
  commit message.
- American English everywhere: color, behavior, center. No emojis anywhere.

## Stories

- Every component has stories, including compositions with real-shaped neutral data.
- A story's name is one to three words ("Open", "Layer panel"). What it shows goes in its doc
  comment.
- The order of a file's exports is the sidebar's order: export stories from the simplest to the
  fullest (closed, short, long, then special cases), and put a new story where it belongs in that
  order rather than at the end.
- A story renders the same every time without interaction: no dates from the clock, no
  randomness, overlays opened by `open` or `defaultOpen`, and no network except the recorded map
  tiles.
- Look at every new or changed story in dark and light, at desktop and phone width, before
  committing it.
- Desktop is the main target; phones and tablets must still work. A story is written once, at
  full width, and the viewport toolbar shows it at the widths layouts are checked at: 360, 390
  and 430 for phones, 768 and 1024 for tablets, 1280, 1440 and 1920. No story exists only to
  show a narrower width.
- Screenshot baselines are Linux renders, taken in the Playwright image as CI takes them:
  `bun run test:visual:linux:update`. Never commit baselines taken on a Mac. A change that alters
  a story's look carries its retaken baselines in the same PR.

## Design

- Show a design as a rendered story and look at the rendering before showing it. Never use ASCII
  mockups.
- When the owner is unsure, render the options side by side in one story and let the owner pick.
- A second opinion from Codex is allowed:
  `codex exec --skip-git-repo-check -s read-only "<prompt>" < /dev/null`.

## Work and git

- Work on a branch with a draft PR. Stage named paths, never everything.
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), with no attribution lines.
- No tags and no releases unless the owner asks for one.
- Ask before any outward or hard-to-undo action: publishing, changing repository settings,
  rewriting history, force-pushing, deleting.
- Agents working in parallel each write scratch files in a folder of their own, and never touch
  another agent's files.

## License

- The license is proprietary, as `LICENSE` says. Code carried under another license is listed in
  `THIRD_PARTY_NOTICES.md` in the same change that adds it.
