# Claude Code Instructions

## Conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), no attribution lines, no emojis.
- British English in prose, comments and story text: colour, behaviour, centre, organise. Code
  and CSS names keep the spelling the language or the standard fixes (`color`, `--color-*`,
  `colorScheme`).
- Apps install this package and never copy from it: a component an app needs to differ gets a new
  option here, never a local edit in the app.
- `tokens/tokens.json` is the only place a token is defined. Run `bun run tokens` after editing it;
  `src/styles/tokens.css` is generated and never edited by hand.
- Comments say what the thing does, or the constraint the code cannot show. Rationale goes in the
  commit message.
- Every component has stories, including complex compositions with real-shaped data, and is
  looked at in both palettes, dark and light, before it merges.
