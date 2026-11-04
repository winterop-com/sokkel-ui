# winterop-ui

The shared UI library for dirigent, Maneki, stabbur and dhis2w-fhir: one set of tokens, Base UI
components, and the Storybook stories that show and test them. Apps install it as a package and
never copy from it, so one fix here reaches every app at its next version.

- `tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  `src/styles/tokens.css` from it, and `bun scripts/build-tokens.ts --check` fails when the two
  disagree.
- `bun run storybook` serves the stories on port 6106, with the palette, the density and light or
  dark in the toolbar.
- Apps import `@winterop/ui/styles.css` for the tokens and base styles.
