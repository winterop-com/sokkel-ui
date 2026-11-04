import { cn } from '../lib/cn'

/** One option of a segmented control: what it answers with and what it is called. */
export interface Segment<T extends string> {
    value: T
    label: string
}

/**
 * A choice from a small fixed set, drawn as one control with every option in view.
 *
 * `sm` is a settings row's control. `md` stands beside a form field at its height; below the `md`
 * breakpoint it becomes a grid two cells wide, an odd last option spanning both, each cell a finger
 * tall.
 *
 * `fill` stretches it to its container and gives every option an equal share, so controls stacked
 * in one column line up on both edges whatever their labels.
 */
export function Segmented<T extends string>({
    label,
    value,
    options,
    size = 'sm',
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
                'overflow-hidden rounded-md border border-border',
                size === 'md' ? 'grid w-full grid-cols-2 md:flex md:h-8' : 'inline-flex min-h-finger md:min-h-0',
                size === 'md' && !fill && 'md:w-auto',
                size === 'sm' && fill && 'flex w-full',
                className,
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    disabled={disabled}
                    className={cn(
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        size === 'md'
                            ? 'min-h-finger flex-1 px-3 py-1 text-sm last:odd:col-span-2 md:min-h-0 md:py-0 md:whitespace-nowrap'
                            : 'px-2 py-1 text-xs whitespace-nowrap',
                        fill && 'flex-1 basis-0',
                        option.value === value
                            ? 'bg-primary font-medium text-primary-foreground'
                            : 'text-muted-foreground hover:bg-secondary',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                    onClick={() => onChoose(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}
