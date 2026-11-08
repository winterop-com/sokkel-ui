import { cn } from '../../lib/cn'
import { Loader2Icon } from 'lucide-react'

export type SpinnerProps = React.ComponentProps<'svg'>

function Spinner({ className, ...props }: SpinnerProps) {
    return (
        <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn('size-4 animate-spin', className)} {...props} />
    )
}

export { Spinner }
