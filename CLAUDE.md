# Claude Code Instructions

## Conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), no attribution lines, no emojis.
- American English everywhere, prose, comments and story text as well as code: color, behavior,
  center, organize.
- The library knows no app. No app's name, domain words or data appear in components, stories,
  comments or docs: stories use a neutral fictional workspace (jobs such as nightly-export, people
  such as ada and grace, projects such as atlas). Themes are named for how they look.
- Apps install this package and never copy from it: a component an app needs to differ gets a new
  option here, never a local edit in the app.
- `tokens/tokens.json` is the only place a token is defined. Run `bun run tokens` after editing it;
  `src/styles/tokens.css` is generated and never edited by hand.
- Comments say what the thing does, or the constraint the code cannot show. Rationale goes in the
  commit message.
- A story's name is one to three words ("Open", "Layer panel"); what it shows goes in its doc
  comment, not its name.
- Every component has stories, including complex compositions with real-shaped data, and is
  looked at in both palettes, dark and light, before it merges.
- The license is proprietary, as `LICENSE` says; code carried under another license is listed in
  `THIRD_PARTY_NOTICES.md` in the same change that adds it.
