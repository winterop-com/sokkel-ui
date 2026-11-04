# winterop-ui

The shared UI library for dirigent, Maneki, stabbur and dhis2w-fhir: one set of tokens, Base UI
components, and the Storybook stories that show and test them. Apps install it as a package and
never copy from it, so one fix here reaches every app at its next version.

- `tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  `src/styles/tokens.css` from it, and `bun scripts/build-tokens.ts --check` fails when the two
  disagree.
- Themes are named for how they look, never for an app: `default` defines every token and the
  others (paper, contrast, tokyo, vinyl, cassette, neon) override what they change, which may be
  any token, colors, radius, type or density. An app picks its default theme on
  `<html data-theme>`, and `.dark` picks dark mode.
- `bun run storybook` serves the stories on port 6106, with the theme, the density and light or
  dark in the toolbar.
- An app that brings its own Tailwind imports `@winterop/ui/tokens.css` (the tokens, themes and density levels); one that does not imports `@winterop/ui/styles.css` (Tailwind, the fonts, the tokens and base styles). Apps install it by git tag: `"@winterop/ui": "github:winterop-com/winterop-ui#v0.1.0"`.
