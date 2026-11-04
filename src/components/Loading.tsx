import { LoaderCircle } from 'lucide-react'

import { cn } from '../lib/cn'

const LENGTHS = ['w-full', 'w-4/5', 'w-2/3', 'w-3/4']
const BAR = 'animate-pulse rounded-sm bg-muted motion-reduce:animate-none'

/**
 * The shape of a list before its rows arrive: rows of uneven length with a short value at the
 * end, or a grid of cards. It holds the list's height, so the page does not jump when it fills.
 */
export function ListSkeleton({
    rows,
    kind = 'row',
    label = 'Loading',
    className,
}: {
    rows: number
    kind?: 'row' | 'card'
    label?: string
    className?: string
}) {
    const places = Array.from({ length: rows }, (_, index) => index)
    if (kind === 'card') {
        return (
            <div role="status" aria-label={label} className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>
                {places.map((place) => (
                    <div key={place} className="flex flex-col gap-2 rounded-surface border border-border p-3">
                        <div className={cn(BAR, 'h-3 w-1/2')} />
                        <div className={cn(BAR, 'h-3', LENGTHS[place % LENGTHS.length])} />
                        <div className={cn(BAR, 'h-3 w-1/3')} />
                    </div>
                ))}
            </div>
        )
    }
    return (
        <div role="status" aria-label={label} className={className}>
            {places.map((place) => (
                <div key={place} className="flex h-(--density-row) min-h-9 items-center gap-3 border-b border-border px-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                        <div className={cn(BAR, 'h-3', LENGTHS[place % LENGTHS.length])} />
                    </div>
                    <div className={cn(BAR, 'h-3 w-12 shrink-0')} />
                </div>
            ))}
        </div>
    )
}

/**
 * A spinner for a wait of unknown length that appears only after a quarter second, so a fast
 * answer never flashes it. It centers itself in the space it is given.
 */
export function Pending({ label = 'Loading', className }: { label?: string; className?: string }) {
    return (
        <div role="status" aria-label={label} className={cn('flex h-full min-h-24 items-center justify-center p-8', className)}>
            <LoaderCircle
                aria-hidden
                className="size-6 animate-[spin_1s_linear_infinite,pending-in_150ms_ease-out_250ms_forwards] text-muted-foreground opacity-0 motion-reduce:animate-[pending-in_150ms_ease-out_250ms_forwards]"
            />
        </div>
    )
}
