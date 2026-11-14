/*
 * The edge a control wears for an issue with its value, written once for each way a part reaches the
 * control. At rest the edge alone, in the issue's color at 80 percent. While the focus shows, the edge
 * is the full color and a ring is drawn: for a refused value the invalid ring (`--invalid-ring`, the
 * critical color at 20 percent and 40 in dark, `--invalid-ring-width` wide), and for a warning a 1px
 * ring. Every form draws the same tints, so a bare primitive, a `Field` and a control given
 * `ISSUE_EDGE` agree in every scheme.
 */

/** A control that says `aria-invalid` and takes the focus itself, as every primitive that holds a value is. */
export const INVALID_EDGE =
    'aria-invalid:border-critical/80 aria-invalid:focus-visible:border-critical aria-invalid:focus-visible:ring-invalid aria-invalid:focus-visible:ring-invalid-ring'

/** A box around a control that says `aria-invalid`, holding the focus inside it, such as a box of chips. */
export const HOLDS_INVALID_EDGE =
    'has-aria-invalid:border-critical/80 has-aria-invalid:focus-within:border-critical has-aria-invalid:focus-within:ring-invalid has-aria-invalid:focus-within:ring-invalid-ring'

/** The edge for the worst issue's tone, on the control itself. */
export const ISSUE_EDGE = {
    critical: 'border-critical/80 focus-visible:border-critical focus-visible:ring-invalid focus-visible:ring-invalid-ring',
    warning: 'border-warning/80 focus-visible:border-warning focus-visible:ring-warning/25',
} as const

/** The edge for the worst issue's tone, on a box that holds the focus inside it, such as a field's frame around a bare input or an editor's frame. */
export const ISSUE_WITHIN_EDGE = {
    critical: 'border-critical/80 focus-within:border-critical focus-within:ring-invalid focus-within:ring-invalid-ring',
    warning: 'border-warning/80 focus-within:border-warning focus-within:ring-warning/25',
} as const

/** The edge for the worst issue's tone, put by a field on its control, the first child of the box that holds it. */
export const FIELD_EDGE = {
    critical:
        '[&>:first-child]:border-critical/80 [&>:first-child]:focus-visible:border-critical [&>:first-child]:focus-visible:ring-invalid [&>:first-child]:focus-visible:ring-invalid-ring',
    warning:
        '[&>:first-child]:border-warning/80 [&>:first-child]:focus-visible:border-warning [&>:first-child]:focus-visible:ring-warning/25',
} as const
