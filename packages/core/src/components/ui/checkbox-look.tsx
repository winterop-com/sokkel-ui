import { CheckIcon, MinusIcon } from 'lucide-react'

import { INVALID_EDGE } from '../../lib/issue-edge'

/** The checkbox's box, drawn from its `data-checked` and `data-indeterminate`. */
export const CHECKBOX = `peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-input transition-colors outline-none group-has-disabled/field:opacity-disabled group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-disabled aria-invalid:aria-checked:border-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:bg-input/30 dark:data-indeterminate:bg-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary ${INVALID_EDGE}`

/** The mark inside a checked or indeterminate box. */
export const CHECKBOX_INDICATOR = 'grid place-content-center text-current transition-none [&>svg]:size-3.5'

export interface PlainCheckboxProps {
    checked: boolean
    indeterminate?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    'aria-label'?: string
    className?: string
}

/**
 * A checkbox as a button, in the look of Base UI's, for a box that only ticks and unticks, as in a
 * form's own label: a press on the label presses it, and Space or Enter does from the keyboard. It
 * carries none of Base UI's checkbox, so a forms page that draws only these never loads it.
 */
export function PlainCheckbox({ checked, indeterminate = false, onCheckedChange, disabled, className, ...rest }: PlainCheckboxProps) {
    // Base UI marks an indeterminate box as that alone, and a box as checked or unchecked otherwise.
    const state = indeterminate ? { 'data-indeterminate': '' } : checked ? { 'data-checked': '' } : { 'data-unchecked': '' }
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? 'mixed' : checked}
            disabled={disabled}
            data-slot="checkbox"
            {...state}
            {...rest}
            className={className === undefined ? CHECKBOX : `${CHECKBOX} ${className}`}
            onClick={() => onCheckedChange?.(!checked)}
        >
            {(checked || indeterminate) && (
                <span data-slot="checkbox-indicator" {...state} className={CHECKBOX_INDICATOR}>
                    <CheckboxMarks />
                </span>
            )}
        </button>
    )
}

/** A check, or a dash when the box is indeterminate. */
export function CheckboxMarks() {
    return (
        <>
            <CheckIcon className="in-data-indeterminate:hidden" />
            <MinusIcon className="hidden in-data-indeterminate:block" />
        </>
    )
}
