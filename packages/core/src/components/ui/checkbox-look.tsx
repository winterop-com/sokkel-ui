import { CheckIcon, MinusIcon } from 'lucide-react'

/** The checkbox's box, drawn from its `data-checked` and `data-indeterminate`. */
export const CHECKBOX =
    'peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-input transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-indeterminate:bg-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary'

/** The mark inside a checked or indeterminate box. */
export const CHECKBOX_INDICATOR = 'grid place-content-center text-current transition-none [&>svg]:size-3.5'

/** A check, or a dash when the box is indeterminate. */
export function CheckboxMarks() {
    return (
        <>
            <CheckIcon className="in-data-indeterminate:hidden" />
            <MinusIcon className="hidden in-data-indeterminate:block" />
        </>
    )
}
