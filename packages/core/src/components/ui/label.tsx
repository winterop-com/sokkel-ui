import * as React from 'react'

import { cn } from '../../lib/utils'

export type LabelProps = React.ComponentProps<'label'>

function Label({ className, ...props }: LabelProps) {
    return (
        <label
            data-slot="label"
            className={cn(
                'flex items-center gap-2 text-label select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-disabled peer-disabled:cursor-not-allowed peer-disabled:opacity-disabled',
                className,
            )}
            {...props}
        />
    )
}

export { Label }
