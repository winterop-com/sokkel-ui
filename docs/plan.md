# Plan

The library comes first; apps adopt it once it is whole. Every component has a story in Storybook
with real-shaped data, held to screenshot baselines in both schemes at desktop and phone width.

## Distribution

`dist/` is built, not committed, so an install from a git URL gets no compiled code (bun also
blocks a git dependency's install scripts). When apps adopt the library it is published to a
registry (npm under `@winterop`, or GitHub Packages) by a tag workflow, and apps pin that version.
Until then nothing installs it.

## Primitives

The shadcn `base-nova` set on Base UI, restyled to the tokens: accordion, alert, alert-dialog,
aspect-ratio, attachment, avatar, badge, breadcrumb, bubble, button, button-group, calendar, card,
carousel, checkbox, code-block, collapsible, combobox, command, context-menu, dialog,
direction, drawer, dropdown-menu, empty, field, hover-card, input, input-group, input-otp, item,
kbd, label, marker, menubar, message, message-scroller, native-select, navigation-menu, pagination,
popover, progress, questionnaire, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toggle,
toggle-group, tooltip, trace.

## Patterns

Shell, Rail, Page, PageHeader, Section, Surface, Field, CodeField, SwitchField, SearchField,
FilterChip, ListTable, StatusChip, AccountMenu, SidePanel, DialogShell, ConfirmDialog.

## Still to build

- AsyncSelect: a searchable popover select that loads its options.
- A filterable picker with capability chips.
- A toggle for the side panel in the top bar.

## Validation and notification

Research before building. The owner's words: a red label under an input box is "basically the
worst we can do". To study:

- how good form libraries and apps say a value is wrong: inline, at the field, as a summary at the
  form's head that links to each field, or as a status in the dialog footer beside the verb;
- when a message appears: on blur, on submit, or as a value is typed;
- how a refusal from the server lands back on the field it concerns;
- what announces it to a screen reader;
- how notification differs from validation: toasts, banners, the status strip, and an inbox for
  events a person missed.

The result is a set of rendered options for the owner to pick from, then Field, DialogShell and the
toasts built to the pick.

## Later

- Find a better name for the library than `winterop-ui`, then rename the repository and the package.
- Publish to a registry when apps adopt the library (see Distribution).
- Pick the themes to keep from the candidates in Storybook and fold them into `tokens/tokens.json`;
  name each for how it looks.
- One focus treatment for every control: today inputs draw an accent border and a 3px halo, which
  reads as a double frame on large controls (the code editor now draws the border alone).
- Validation and notification, after the research above.
