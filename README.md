# winterop-ui

A shared React component library: one set of tokens and themes, Base UI primitives, the patterns
apps are built from, and the Storybook stories that show and test them. Apps install it as a
package and never copy from it, so one fix here reaches every app at its next version.

- `tokens/tokens.json` is the only place a token is defined. `bun run tokens` writes
  `src/styles/tokens.css` from it, and `bun scripts/build-tokens.ts --check` fails when the two
  disagree.
- Themes are named for how they look, never for an app: `default` defines every token and the
  others (paper, contrast, tokyo, vinyl, cassette, neon) override what they change, which may be
  any token, colors, radius, type or density. An app picks its default theme on
  `<html data-theme>`, `.dark` picks dark mode, and `data-theme-scope` draws one element in a
  theme of its own, as a theme picker's preview does.
- `bun run storybook` serves the stories on port 6106, with the scheme, the theme, the density
  and the corner radius in the toolbar. The theme menu also lists candidate themes collected from
  apps (`bun scripts/import-candidates.ts`), for judging before one is adopted into the tokens.
- Every corner radius derives from `--radius`, which a theme or an app sets.
- An app that brings its own Tailwind imports `@winterop/ui/tokens.css` (the tokens, themes and density levels); one that does not imports `@winterop/ui/styles.css` (Tailwind, the fonts, the tokens and base styles). It is not published yet; apps will install it from a registry by version.

## License

Proprietary: published for reference only, all rights reserved. See `LICENSE`, and
`THIRD_PARTY_NOTICES.md` for the code carried under other licenses.
