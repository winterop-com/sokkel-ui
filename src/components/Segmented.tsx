import { cn } from '../lib/cn'

/**
 * How a segmented control is drawn:
 *
 * - `track`: a recessed track with the chosen option raised on it as a thumb. This is the default.
 * - `tint`: options with no frame, the chosen one on an accent tint.
 * - `outline`: a bordered group with dividers, the chosen option on a neutral wash.
 * - `solid`: a bordered group with the chosen option filled with the accent.
 */
export type SegmentedVariant = 'track' | 'tint' | 'outline' | 'solid'

const FRAME: Record<SegmentedVariant, string> = {
    track: 'rounded-control border border-border bg-muted p-px dark:border-border-strong dark:bg-background',
    tint: 'gap-0.5',
    outline: 'overflow-hidden rounded-control border border-border-strong divide-x divide-border-strong',
    solid: 'overflow-hidden rounded-control border border-border',
}

const OPTION: Record<SegmentedVariant, string> = {
    track: 'rounded-[calc(var(--radius)-2px)]',
    tint: 'rounded-control',
    outline: '',
    solid: '',
}

const CHOSEN: Record<SegmentedVariant, string> = {
    track: 'bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.10)] ring-1 ring-border-strong dark:bg-input/70 dark:shadow-none dark:ring-input',
    tint: 'bg-primary/15 font-medium text-primary-ink',
    outline: 'bg-secondary font-medium text-foreground',
    solid: 'bg-primary font-medium text-primary-foreground',
}

const HOVER: Record<SegmentedVariant, string> = {
    track: 'hover:bg-foreground/5 hover:text-foreground',
    tint: 'hover:bg-secondary hover:text-foreground',
    outline: 'hover:bg-secondary hover:text-foreground',
    solid: 'hover:bg-secondary hover:text-foreground',
}

/** One option of a segmented control: what it answers with and what it is called. */
export interface Segment<T extends string> {
    value: T
    label: string
}

/**
 * A choice from a small fixed set, drawn as one control with every option in view.
 *
 * Every option takes an equal share, as wide as the widest label. `fill` stretches the control to
 * its container, so controls stacked in one column line up on both edges.
 *
 * `sm` is a settings row's control. `md` stands beside a form field at its height; below the `md`
 * breakpoint it becomes a grid two cells wide, an odd last option spanning both, each cell a finger
 * tall.
 */
export function Segmented<T extends string>({
    label,
    value,
    options,
    size = 'sm',
    variant = 'track',
    disabled = false,
    fill = false,
    onChoose,
    className,
}: {
    /** What the group is called, for a screen reader. */
    label: string
    value: T
    options: readonly Segment<T>[]
    size?: 'sm' | 'md'
    variant?: SegmentedVariant
    disabled?: boolean
    fill?: boolean
    onChoose: (value: T) => void
    className?: string
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className={cn(
                FRAME[variant],
                size === 'md'
                    ? cn('grid w-full grid-cols-2 md:flex md:h-8', !fill && 'md:w-auto')
                    : cn(
                          'min-h-finger auto-cols-[minmax(max-content,1fr)] grid-flow-col md:h-7 md:min-h-0',
                          fill ? 'grid w-full' : 'inline-grid shrink-0',
                      ),
                disabled && 'opacity-50',
                className,
            )}
        >
            {options.map((option) => {
                const chosen = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={chosen}
                        disabled={disabled}
                        className={cn(
                            'transition-colors outline-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                            OPTION[variant],
                            size === 'md'
                                ? cn(
                                      'min-h-finger px-3 py-1 text-sm last:odd:col-span-2 md:min-h-0 md:py-0 md:whitespace-nowrap',
                                      fill ? 'md:flex-1 md:basis-0' : 'md:flex-1',
                                  )
                                : 'px-2.5 text-xs whitespace-nowrap',
                            chosen ? CHOSEN[variant] : cn('text-muted-foreground', !disabled && HOVER[variant]),
                            disabled && 'cursor-not-allowed',
                        )}
                        onClick={() => onChoose(option.value)}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
