import { cn } from '../lib/cn'
import { Dot } from './Dot'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

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
    track: 'rounded-mini',
    tint: 'rounded-control',
    outline: '',
    solid: '',
}

/** A small option's least height: a finger tall below `md`, where each option is pressed, and a line of options with its frame a small control's height from `md`. */
const LINE: Record<SegmentedVariant, string> = {
    track: 'min-h-finger md:min-h-[calc(var(--density-control-sm)-4px)]',
    tint: 'min-h-finger md:min-h-(--density-control-sm)',
    outline: 'min-h-finger md:min-h-[calc(var(--density-control-sm)-2px)]',
    solid: 'min-h-finger md:min-h-[calc(var(--density-control-sm)-2px)]',
}

const CHOSEN: Record<SegmentedVariant, string> = {
    track: 'bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.10)] ring-1 ring-border-strong dark:bg-input/70 dark:shadow-none dark:ring-input',
    tint: 'bg-primary/15 font-medium text-primary-ink',
    outline: 'bg-secondary font-medium text-foreground',
    solid: 'bg-primary font-medium text-primary-foreground',
}

const HOVER: Record<SegmentedVariant, string> = {
    track: 'hover:bg-foreground/5 hover:text-foreground',
    tint: 'hover:bg-hover hover:text-foreground',
    outline: 'hover:bg-hover hover:text-foreground',
    solid: 'hover:bg-hover hover:text-foreground',
}

/** One option of a segmented control: what it answers with and what it is called. */
export interface Segment<T extends string> {
    value: T
    label: string
    /** The option shows but cannot be chosen. It still takes focus, so its `hint` can say why. */
    disabled?: boolean
    /** A tooltip on hover and focus, such as why the option is off. */
    hint?: string
    /** How many the option holds, after its label in figures: the rows in a state, the codes of a sort. */
    count?: number
    /** A CSS color drawn as a dot before the label, such as `var(--status-failed)`: the state the option filters to. */
    dot?: string
}

export interface SegmentedProps<T extends string> {
    /** The group's id, for a `Field` around it to point its label at. */
    id?: string
    /** What the group is called, for a screen reader. */
    label: string
    value: T
    options: readonly Segment<T>[]
    size?: 'sm' | 'md'
    variant?: SegmentedVariant
    disabled?: boolean
    fill?: boolean
    onValueChange: (value: T) => void
    className?: string
}

/**
 * A choice from a small fixed set, drawn as one control with every option in view.
 *
 * Every option takes an equal share, as wide as the widest label. `fill` stretches the control to
 * its container, so controls stacked in one column line up on both edges. When the room is
 * narrower than the options, they wrap onto more lines, each line shared out evenly, so the
 * control never overflows its container.
 *
 * `sm` is a settings row's control, each option a finger tall below the `md` breakpoint and a small
 * control's height from it. `md` stands beside a form field at its height; below the `md`
 * breakpoint it becomes a grid two cells wide, an odd last option spanning both, each cell a finger
 * tall.
 *
 * An option can be off on its own (`disabled`) with a `hint` saying why, shown on hover and focus.
 * An option that filters a list says how many it holds with `count`, and the state it filters to
 * with a `dot` in that state's color.
 */
export function Segmented<T extends string>({
    id,
    label,
    value,
    options,
    size = 'sm',
    variant = 'track',
    disabled = false,
    fill = false,
    onValueChange,
    className,
}: SegmentedProps<T>) {
    return (
        <div
            id={id}
            role="group"
            aria-label={label}
            className={cn(
                FRAME[variant],
                size === 'md'
                    ? cn('grid w-full grid-cols-2 md:flex md:min-h-(--density-control) md:flex-wrap', !fill && 'md:w-auto')
                    : cn('max-w-full flex-wrap', fill ? 'flex w-full' : 'inline-flex w-fit shrink-0'),
                disabled && 'opacity-disabled',
                className,
            )}
        >
            {options.map((option) => {
                const chosen = option.value === value
                const off = option.disabled === true
                const button = (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={chosen}
                        aria-disabled={off || undefined}
                        disabled={disabled}
                        className={cn(
                            'transition-colors outline-none focus-visible:z-10 focus-visible:outline-focus focus-visible:outline-offset-1 focus-visible:outline-ring',
                            OPTION[variant],
                            size === 'md'
                                ? cn(
                                      'min-h-finger px-3 py-1 text-sm last:odd:col-span-2 md:min-h-(--density-control-sm) md:py-0 md:whitespace-nowrap',
                                      fill ? 'md:flex-1 md:basis-0' : 'md:flex-1',
                                  )
                                : cn('flex-1 px-2.5 text-xs whitespace-nowrap', LINE[variant]),
                            chosen ? CHOSEN[variant] : cn('text-muted-foreground', !disabled && !off && HOVER[variant]),
                            off && !chosen && 'text-faint',
                            (disabled || off) && 'cursor-not-allowed',
                        )}
                        onClick={() => {
                            if (!off) onValueChange(option.value)
                        }}
                    >
                        {size === 'md' ? <Face option={option} /> : <Widest options={options} shown={option} />}
                    </button>
                )
                if (option.hint === undefined) return button
                return (
                    <Tooltip key={option.value}>
                        <TooltipTrigger render={button} />
                        <TooltipContent>{option.hint}</TooltipContent>
                    </Tooltip>
                )
            })}
        </div>
    )
}

/**
 * An option's label in a box as wide as the widest label: every label is laid in the same cell and
 * only the option's own is seen, so the options share one width with nothing measured.
 */
function Widest<T extends string>({ options, shown }: { options: readonly Segment<T>[]; shown: Segment<T> }) {
    return (
        <span className="grid">
            {options.map((other) => (
                <span
                    key={other.value}
                    aria-hidden={other === shown ? undefined : true}
                    className={cn('col-start-1 row-start-1', other !== shown && 'invisible')}
                >
                    <Face option={other} />
                </span>
            ))}
        </span>
    )
}

/** An option's face: its dot, its label and its count. */
function Face<T extends string>({ option }: { option: Segment<T> }) {
    if (option.dot === undefined && option.count === undefined) return option.label
    return (
        <span className="inline-flex items-center justify-center gap-1.5">
            {option.dot !== undefined && <Dot color={option.dot} size="sm" />}
            {option.label}
            {option.count !== undefined && <span className="font-mono font-normal tabular-nums opacity-70">{option.count}</span>}
        </span>
    )
}
