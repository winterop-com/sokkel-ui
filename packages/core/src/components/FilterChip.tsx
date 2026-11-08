import { ChevronDown, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

/** One value a filter can take. */
export interface FilterOption {
    value: string
    /** Said in the menu and on the chip; the value itself when absent. */
    label?: string
    /** Drawn before the label in the menu, such as a status dot or an avatar. */
    icon?: ReactNode
    /** Drawn as the menu row in place of the icon and label, such as a colored label. */
    row?: ReactNode
}

export interface FilterChipWords {
    /** The remove button's label. */
    clear: (facet: string) => string
    /** The single-choice menu's first row, which unsets the filter. */
    any: string
    /** Said after the first label when more than two are chosen: `failed +2`. */
    more: (count: number) => string
}

const WORDS: FilterChipWords = {
    clear: (facet) => `Clear ${facet}`,
    any: 'Any',
    more: (count) => `+${String(count)}`,
}

/** The chosen options said for the chip: one or two labels, or the first and how many more. */
function said(options: readonly FilterOption[], chosen: readonly string[], words: FilterChipWords): string | undefined {
    const labels = options.filter((option) => chosen.includes(option.value)).map((option) => option.label ?? option.value)
    if (labels.length === 0) return undefined
    if (labels.length <= 2) return labels.join(', ')
    return `${labels[0]} ${words.more(labels.length - 1)}`
}

/**
 * One filter in a toolbar: the facet it filters on, and what it is set to.
 *
 * Unset, it reads as an offer: the facet and a chevron, on the field's ground with a solid edge
 * and the ordinary ink, so it is plainly a control. Set, it says the value in the full ink on
 * the accent's wash, and carries a remove button.
 *
 * Given `options`, it owns its menu: pressing it opens the facet's values, one to pick (headed by
 * Any, which unsets it) or several to tick with `multiple`, and the chip says what is chosen. The
 * choice is held by the app through `selected`, or by the chip from `defaultSelected`. Without
 * options, pressing it calls `onOpen` and the app opens what it likes.
 *
 * The chip keeps its label on one line and never shrinks in a row of filters; a long value ends
 * in an ellipsis, and the remove button keeps its width.
 */
export function FilterChip({
    facet,
    value,
    options,
    multiple = false,
    selected,
    defaultSelected,
    onSelectedChange,
    open,
    defaultOpen,
    onOpenChange,
    onOpen,
    onClear,
    icon,
    className,
    words = WORDS,
}: {
    facet: string
    /** What the chip says it is set to, in place of the chosen labels; unset when absent and nothing is chosen. */
    value?: ReactNode
    /** The facet's values, which give the chip its own menu. */
    options?: readonly FilterOption[]
    /** Whether several values can be chosen at once. */
    multiple?: boolean
    /** The chosen values, held by the app; at most one without `multiple`. */
    selected?: readonly string[]
    /** The chosen values the chip starts from when it holds them itself. */
    defaultSelected?: readonly string[]
    onSelectedChange?: (selected: string[]) => void
    /** Holds the menu open or shut. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** Called on a press when the chip has no options of its own. */
    onOpen?: () => void
    onClear?: () => void
    icon?: ReactNode
    className?: string
    words?: FilterChipWords
}) {
    const chipRef = useRef<HTMLSpanElement>(null)
    const [own, setOwn] = useState<readonly string[]>(defaultSelected ?? [])
    const chosen = selected ?? own
    const choose = (next: string[]) => {
        if (selected === undefined) setOwn(next)
        onSelectedChange?.(next)
    }
    const shown = value ?? (options === undefined ? undefined : said(options, chosen, words))
    const set = shown !== undefined && shown !== null && shown !== ''
    const clear =
        options === undefined
            ? onClear
            : () => {
                  choose([])
                  onClear?.()
              }
    const face = 'flex min-w-0 items-center gap-1.5 px-2.5 whitespace-nowrap hover:bg-hover data-popup-open:bg-hover'
    const inner = (
        <>
            {icon}
            <span className={cn('shrink-0', set && 'text-muted-foreground')}>{facet}</span>
            {set && (
                <span className="max-w-48 min-w-0 truncate font-medium" title={typeof shown === 'string' ? shown : undefined}>
                    {shown}
                </span>
            )}
            {!set && <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        </>
    )
    const row = (option: FilterOption) =>
        option.row ?? (
            <>
                {option.icon}
                {option.label ?? option.value}
            </>
        )
    return (
        <span
            ref={chipRef}
            className={cn(
                'inline-flex h-(--density-control) max-w-full shrink-0 items-stretch overflow-hidden rounded-control border text-sm whitespace-nowrap',
                set ? 'border-primary/40 bg-accent text-foreground' : 'border-input bg-field text-foreground',
                className,
            )}
        >
            {options === undefined ? (
                <button type="button" className={face} aria-haspopup="menu" onClick={onOpen}>
                    {inner}
                </button>
            ) : (
                <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
                    <DropdownMenuTrigger className={face}>{inner}</DropdownMenuTrigger>
                    <DropdownMenuContent anchor={chipRef} align="start" className="w-max max-w-80 min-w-(--anchor-width)">
                        {multiple ? (
                            options.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    label={option.label ?? option.value}
                                    checked={chosen.includes(option.value)}
                                    onCheckedChange={(checked) =>
                                        choose(
                                            checked
                                                ? options
                                                      .map((other) => other.value)
                                                      .filter((other) => other === option.value || chosen.includes(other))
                                                : chosen.filter((other) => other !== option.value),
                                        )
                                    }
                                >
                                    {row(option)}
                                </DropdownMenuCheckboxItem>
                            ))
                        ) : (
                            <DropdownMenuRadioGroup
                                value={chosen[0] ?? ''}
                                onValueChange={(next: string) => choose(next === '' ? [] : [next])}
                            >
                                <DropdownMenuRadioItem value="" closeOnClick>
                                    {words.any}
                                </DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                {options.map((option) => (
                                    <DropdownMenuRadioItem
                                        key={option.value}
                                        value={option.value}
                                        label={option.label ?? option.value}
                                        closeOnClick
                                    >
                                        {row(option)}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {set && clear !== undefined && (
                <button
                    type="button"
                    aria-label={words.clear(facet)}
                    title={words.clear(facet)}
                    className="flex shrink-0 items-center border-l border-primary/30 px-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
                    onClick={clear}
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            )}
        </span>
    )
}
