import { createContext } from 'react'

/**
 * The gap between rows of fields that `Columns` with `fields` lines up, handed to each `Field` in
 * it, or null outside one. A field there spans four of the grid's rows (its label, description,
 * control and help) and shares them with its neighbors, so the controls of a row stand level
 * whichever field has a description.
 */
export const FieldRows = createContext<string | null>(null)
