import { cn } from '../../lib/utils'

export type KbdProps = React.ComponentProps<'kbd'>

function Kbd({ className, ...props }: KbdProps) {
    return (
        <kbd
            data-slot="kbd"
            className={cn(
                "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
                className,
            )}
            {...props}
        />
    )
}

export type KbdGroupProps = React.ComponentProps<'div'>

function KbdGroup({ className, ...props }: KbdGroupProps) {
    return <kbd data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export interface KbdSequenceProps {
    /** The keys of the first press, held together. */
    keys: readonly string[]
    /** The keys of a sequence's second press, pressed after the first let go. */
    next?: readonly string[]
    /** The word between the two presses of a sequence. */
    sequence?: string
    className?: string
}

/** The keys of a shortcut: one press held together, or a sequence as its two presses with a word between, G then D. */
function KbdSequence({ keys, next, sequence = 'then', className }: KbdSequenceProps) {
    const press = (labels: readonly string[]) => (
        <KbdGroup>
            {labels.map((key, index) => (
                <Kbd key={`${String(index)}-${key}`}>{key}</Kbd>
            ))}
        </KbdGroup>
    )
    if (next === undefined) return press(keys)
    return (
        <span data-slot="kbd-sequence" className={cn('inline-flex items-center gap-1.5', className)}>
            {press(keys)}
            <span className="text-xs font-normal tracking-normal text-muted-foreground">{sequence}</span>
            {press(next)}
        </span>
    )
}

export { Kbd, KbdGroup, KbdSequence }
