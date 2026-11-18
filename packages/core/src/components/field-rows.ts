import { createContext } from 'react'

/**
 * The gap between rows of fields that `Columns` with `fields` lines up, handed to each `Field` in
 * it, or null outside one. A field there spans four of the grid's rows (its label, description,
 * control and help) and shares them with its neighbors, so the controls of a row stand level
 * whichever field has a description.
 */
export const FieldRows = createContext<string | null>(null)

/**
 * The worst issue's tone of the `Field` a control stands in, or null: a control whose bordered part
 * is not the field's first child (a choice beside its words, a select over a typed value) draws the
 * edge there itself, and marks its own root `data-field-edge="own"` so the field puts neither the
 * edge nor the mark's room on it.
 */
export const FieldTone = createContext<'critical' | 'warning' | null>(null)
