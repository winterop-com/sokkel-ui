import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '../../lib/utils'

const FRAMED =
    'h-8 w-full min-w-0 rounded-lg border border-input bg-field px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-field file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

/** No frame of its own: the input inherits its text size and takes its height and padding from `className`. */
const BARE = 'w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground'

/**
 * A one-line text input. `bare` drops its border, background and focus ring, for an input that
 * sits inside another frame, such as a search box or a field of chips, which draws them instead.
 */
function Input({ className, type, bare = false, ...props }: React.ComponentProps<'input'> & { bare?: boolean }) {
    return <InputPrimitive type={type} data-slot="input" className={cn(bare ? BARE : FRAMED, className)} {...props} />
}

export { Input }
