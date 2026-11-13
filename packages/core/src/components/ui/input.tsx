import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { INVALID_EDGE } from '../../lib/issue-edge'
import { cn } from '../../lib/utils'

const FRAMED =
    'max-md:min-h-finger h-(--density-control) w-full min-w-0 rounded-control border border-input bg-field px-2.5 py-1 text-base text-foreground transition-colors outline-none file:inline-flex file:h-(--density-control-xs) file:border-0 file:bg-field file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:disabled:bg-input/80'

/** No frame of its own: the input inherits its text size and takes its height and padding from `className`. */
const BARE = 'w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground'

export type InputProps = React.ComponentProps<'input'> & { bare?: boolean }

/**
 * A one-line text input. `bare` drops its border, background and focus ring, for an input that
 * sits inside another frame, such as a search box or a field of chips, which draws them instead.
 */
function Input({ className, type, bare = false, ...props }: InputProps) {
    return <InputPrimitive type={type} data-slot="input" className={cn(bare ? BARE : [FRAMED, INVALID_EDGE], className)} {...props} />
}

export { Input }
