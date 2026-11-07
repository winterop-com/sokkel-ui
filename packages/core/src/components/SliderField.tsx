import { cn } from '../lib/cn'
import { Slider } from './ui/slider'

/**
 * A number chosen on a slider, its value written out in figures so the setting reads without
 * dragging. By default the name and the value sit on a line above the slider, with an optional help
 * line under it. `inline` drops the name, which a settings row already says, and writes the value
 * beside the slider instead.
 */
export function SliderField({
    id,
    label,
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    unit,
    format = (number) => String(number),
    help,
    inline = false,
    className,
}: {
    id: string
    /** The setting's name: shown above the slider, or only said to a screen reader when `inline`. */
    label: string
    value: number
    onChange: (value: number) => void
    min?: number
    max: number
    step?: number
    /** Written after the value: `ms`, `px`. */
    unit?: string
    /** How the value is written, such as to one decimal. */
    format?: (value: number) => string
    /** A sentence under the slider. */
    help?: string
    inline?: boolean
    className?: string
}) {
    const written = unit === undefined ? format(value) : `${format(value)} ${unit}`
    const slider = (
        <Slider
            id={id}
            aria-label={label}
            aria-describedby={help === undefined ? undefined : `${id}-help`}
            min={min}
            max={max}
            step={step}
            value={[value]}
            onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : (next as number))}
        />
    )
    if (inline)
        return (
            <div className={cn('flex w-56 items-center gap-3', className)}>
                {slider}
                <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{written}</span>
            </div>
        )
    return (
        <div className={cn('flex min-w-0 flex-col gap-2', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-medium">
                    {label}
                </label>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{written}</span>
            </div>
            {slider}
            {help !== undefined && (
                <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    {help}
                </p>
            )}
        </div>
    )
}
