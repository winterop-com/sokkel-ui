import * as React from 'react'

import { cn } from '../../lib/utils'

const FRAMED =
    'flex field-sizing-content min-h-28 w-full rounded-control border border-input bg-field px-2.5 py-2 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:focus-visible:ring-destructive/40'

/** No frame of its own: the text area inherits its text size and takes its height and padding from `className`. */
const BARE = 'field-sizing-content w-full min-w-0 resize-none bg-transparent outline-none placeholder:text-muted-foreground'

export type TextareaProps = React.ComponentProps<'textarea'> & { bare?: boolean }

/**
 * A text area that grows with its text. `bare` drops its border, background and focus ring, for a
 * text area inside another frame, such as a message composer, which draws them instead.
 */
function Textarea({ className, bare = false, ...props }: TextareaProps) {
    return <textarea data-slot="textarea" className={cn(bare ? BARE : FRAMED, className)} {...props} />
}

export { Textarea }
