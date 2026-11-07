import { cn } from '../../lib/cn'

/**
 * How far a piece of work has come, drawn as a ring that fills clockwise from the top: an upload,
 * a download. `value` runs from 0 to 1. For work with no known end, use `Spinner`.
 */
function ProgressRing({ value, label = 'Progress', className }: { value: number; label?: string; className?: string }) {
    const share = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
    const radius = 6
    const around = 2 * Math.PI * radius
    return (
        <svg
            data-slot="progress-ring"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            viewBox="0 0 16 16"
            className={cn('size-4 -rotate-90', className)}
        >
            <circle cx="8" cy="8" r={radius} fill="none" strokeWidth="2" className="stroke-muted" />
            <circle
                cx="8"
                cy="8"
                r={radius}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={around}
                strokeDashoffset={around * (1 - share)}
                className="stroke-primary transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none"
            />
        </svg>
    )
}

export { ProgressRing }
