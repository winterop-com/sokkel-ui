import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/** Whether a wait has lasted `delay` milliseconds; false again as soon as it is over. */
export function useLongWait(waiting: boolean, delay: number): boolean {
    const [long, setLong] = useState(waiting && delay <= 0)
    useEffect(() => {
        if (!waiting) {
            setLong(false)
            return
        }
        if (delay <= 0) {
            setLong(true)
            return
        }
        const timer = setTimeout(() => setLong(true), delay)
        return () => clearTimeout(timer)
    }, [waiting, delay])
    return long
}

/**
 * A thin bar for a wait: filled to `value` (0 to 100) when the progress is known, a sliding segment
 * when it is not.
 */
export function LoadingBar({
    value = null,
    label = 'Loading',
    tone = 'primary',
    className,
}: {
    value?: number | null
    label?: string
    tone?: 'primary' | 'muted'
    className?: string
}) {
    const known = value !== null
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={known ? 0 : undefined}
            aria-valuemax={known ? 100 : undefined}
            aria-valuenow={known ? Math.round(value) : undefined}
            className={cn('relative h-0.5 w-full overflow-hidden', tone === 'primary' ? 'bg-primary/15' : 'bg-muted', className)}
        >
            <span
                className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    tone === 'primary' ? 'bg-primary' : 'bg-muted-foreground',
                    known ? 'transition-[width] duration-300 ease-out' : 'w-2/5 animate-[loading-slide_1.4s_ease-in-out_infinite]',
                )}
                style={known ? { width: `${Math.max(0, Math.min(100, value))}%` } : undefined}
            />
        </div>
    )
}

/**
 * The bar along the top of a page while it loads: shown only once the load has taken `delay`
 * milliseconds, it runs to the end and fades when the load is over. Placed in the shell's top bar
 * or at the top of a page; `fixed` pins it to the window's top edge instead.
 */
export function PageProgress({
    loading,
    value = null,
    delay = 200,
    fixed = false,
    label = 'Loading the page',
}: {
    loading: boolean
    value?: number | null
    delay?: number
    fixed?: boolean
    label?: string
}) {
    const long = useLongWait(loading, delay)
    const [finishing, setFinishing] = useState(false)
    const [shown, setShown] = useState(false)
    useEffect(() => {
        if (long) {
            setShown(true)
            setFinishing(false)
            return
        }
        if (!shown) return
        setFinishing(true)
        const timer = setTimeout(() => {
            setShown(false)
            setFinishing(false)
        }, 400)
        return () => clearTimeout(timer)
    }, [long, shown])
    if (!shown) return null
    return (
        <div
            className={cn(
                'pointer-events-none inset-x-0 top-0 z-50 transition-opacity duration-300',
                fixed ? 'fixed' : 'absolute',
                finishing && 'opacity-0',
            )}
        >
            <LoadingBar value={finishing ? 100 : value} label={label} className="h-[3px] bg-transparent" />
        </div>
    )
}

/**
 * An element that is loading again: once the wait has taken `delay` milliseconds its content dims
 * and stops taking input, a bar runs along its top edge, and a screen reader hears that it is
 * busy. The content stays in place, so nothing jumps when it returns.
 */
export function LoadingOverlay({
    loading,
    delay = 300,
    label = 'Loading',
    className,
    children,
}: {
    loading: boolean
    delay?: number
    label?: string
    className?: string
    children: ReactNode
}) {
    const long = useLongWait(loading, delay)
    return (
        <div aria-busy={loading || undefined} className={cn('relative', className)}>
            <div className={cn('transition-opacity duration-200', long && 'pointer-events-none opacity-50 select-none')}>{children}</div>
            {long && (
                <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden rounded-t-[inherit]">
                    <LoadingBar label={label} className="bg-transparent" />
                </div>
            )}
        </div>
    )
}
