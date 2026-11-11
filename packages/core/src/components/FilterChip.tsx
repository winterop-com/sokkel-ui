import { ChevronDown, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { OptionList } from './option-list'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** One value a filter can take. */
export interface FilterOption {
    value: string
    /** Said in the menu and on the chip, and matched by the menu's search; the value itself when absent. */
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
    /** The search box over a long menu. */
    search: string
    /** Said when the search matches no value. */
    empty: string
}

const WORDS: FilterChipWords = {
    clear: (facet) => `Clear ${facet}`,
    any: 'Any',
    more: (count) => `+${String(count)}`,
    search: 'Search',
    empty: 'Nothing matches.',
}

/** Past this many values a chip's menu holds a search over them. */
const SEARCH_PAST = 8

/**
 * The chosen options said for the chip: one or two labels, or the first and how many more. In the
 * options' order, or with `picked` in the order of `chosen`.
 */
export function saidOptions(
    options: readonly FilterOption[],
    chosen: readonly string[],
    more: (count: number) => string = WORDS.more,
    picked = false,
): string | undefined {
    const ordered = picked
        ? chosen.flatMap((value) => options.filter((option) => option.value === value))
        : options.filter((option) => chosen.includes(option.value))
    const labels = ordered.map((option) => option.label ?? option.value)
    if (labels.length === 0) return undefined
    if (labels.length <= 2) return labels.join(', ')
    return `${labels[0]} ${more(labels.length - 1)}`
}

/** Where a popup opened from a chip puts focus: on the field it marks with `data-autofocus`, else its first control. */
function focusMarked(popup: { current: HTMLElement | null }) {
    return (openType: string) => {
        if (openType === 'touch') return true
        return popup.current?.querySelector<HTMLElement>('[data-autofocus]') ?? true
    }
}

export interface FilterChipProps {
    facet: string
    /** How the filter compares, said in the quiet ink between the facet and the value: `is`, `at least`. */
    operator?: ReactNode
    /** What the chip says it is set to, in place of the chosen labels; unset when absent and nothing is chosen. */
    value?: ReactNode
    /** The facet's values, which give the chip its own menu. */
    options?: readonly FilterOption[]
    /** Whether several values can be chosen at once. */
    multiple?: boolean
    /** A search box over the menu's values, matching their labels; on past eight values. */
    search?: boolean
    /** The chosen values, held by the app; at most one without `multiple`. */
    selected?: readonly string[]
    /** The chosen values the chip starts from when it holds them itself. */
    defaultSelected?: readonly string[]
    onSelectedChange?: (selected: string[]) => void
    /**
     * The order of the chosen values, in `onSelectedChange` and on the chip: the options' order, or
     * `picked`, the order they were ticked in.
     */
    order?: 'options' | 'picked'
    /**
     * What a press opens in a popover under the chip, in place of a menu of options: the app's own
     * editor of the filter. A field in it marked `data-autofocus` takes focus as it opens.
     */
    editor?: ReactNode
    /** The editor's accessible name; the facet by default. */
    editorLabel?: string
    /** Holds the menu or the editor open or shut. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** Called on a press when the chip has neither options nor an editor of its own. */
    onOpen?: () => void
    onClear?: () => void
    icon?: ReactNode
    className?: string
    words?: Partial<FilterChipWords>
}

/**
 * One filter in a toolbar: the facet it filters on, how it compares, and what it is set to.
 *
 * Unset, it reads as an offer: the facet and a chevron, on the field's ground with a solid edge
 * and the ordinary ink, so it is plainly a control. Set, it says the value in the full ink on
 * the accent's wash, and carries a remove button.
 *
 * Given `options`, it owns its menu: pressing it opens the facet's values, one to pick (headed by
 * Any, which unsets it) or several to tick with `multiple`, and the chip says what is chosen. Past
 * eight values, or with `search`, the menu holds a search box that narrows the values as it is
 * typed in. The choice is held by the app through `selected`, or by the chip from
 * `defaultSelected`. Given an `editor` instead, a press opens it in a popover under the chip, as
 * `FilterBar` opens a filter's operator and value. With neither, pressing it calls `onOpen` and the
 * app opens what it likes.
 *
 * The chip keeps its label on one line and never shrinks in a row of filters; a long value ends
 * in an ellipsis, and the remove button keeps its width.
 */
export function FilterChip({
    facet,
    operator,
    value,
    options,
    multiple = false,
    search,
    selected,
    defaultSelected,
    onSelectedChange,
    order = 'options',
    editor,
    editorLabel,
    open,
    defaultOpen,
    onOpenChange,
    onOpen,
    onClear,
    icon,
    className,
    words: given,
}: FilterChipProps) {
    const words = { ...WORDS, ...given }
    const chipRef = useRef<HTMLSpanElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)
    const [own, setOwn] = useState<readonly string[]>(defaultSelected ?? [])
    const [ownOpen, setOwnOpen] = useState(defaultOpen ?? false)
    const opened = open ?? ownOpen
    const setOpened = (next: boolean) => {
        if (open === undefined) setOwnOpen(next)
        onOpenChange?.(next)
    }
    const chosen = selected ?? own
    const choose = (given: string[]) => {
        // In pick order, the ones kept stay where they were and a new one goes last.
        const next =
            order === 'picked' ? [...chosen.filter((one) => given.includes(one)), ...given.filter((one) => !chosen.includes(one))] : given
        if (selected === undefined) setOwn(next)
        onSelectedChange?.(next)
    }
    const shown = value ?? (options === undefined ? undefined : saidOptions(options, chosen, words.more, order === 'picked'))
    const set = shown !== undefined && shown !== null && shown !== ''
    const clear =
        options === undefined
            ? onClear
            : () => {
                  choose([])
                  onClear?.()
              }
    const searched = options !== undefined && (search ?? options.length > SEARCH_PAST)
    const face = 'flex min-w-0 items-center gap-1.5 px-2.5 whitespace-nowrap hover:bg-hover data-popup-open:bg-hover'
    const inner = (
        <>
            {icon}
            <span className={cn('shrink-0', set && 'text-muted-foreground')}>{facet}</span>
            {set && operator !== undefined && <span className="shrink-0 text-muted-foreground">{operator}</span>}
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
    const popover = (body: ReactNode, label: string, wide: string) => (
        <Popover open={opened} onOpenChange={setOpened}>
            <PopoverTrigger className={face}>{inner}</PopoverTrigger>
            <PopoverContent
                ref={popupRef}
                anchor={chipRef}
                align="start"
                aria-label={label}
                initialFocus={focusMarked(popupRef)}
                className={cn('max-w-(--available-width) gap-0 overflow-hidden p-0', wide)}
            >
                {body}
            </PopoverContent>
        </Popover>
    )
    let control: ReactNode
    if (editor !== undefined) {
        control = popover(editor, editorLabel ?? facet, 'w-80')
    } else if (options === undefined) {
        control = (
            <button type="button" className={face} aria-haspopup="menu" onClick={onOpen}>
                {inner}
            </button>
        )
    } else if (searched) {
        control = popover(
            <OptionList
                options={multiple ? options : [{ value: '', label: words.any }, ...options]}
                multiple={multiple}
                value={multiple ? chosen : chosen.slice(0, 1)}
                onValueChange={(next) => {
                    if (multiple) return choose(next)
                    choose(next[0] === undefined || next[0] === '' ? [] : [next[0]])
                    setOpened(false)
                }}
                words={{ search: words.search, empty: words.empty }}
                className="max-h-[min(24rem,var(--available-height))]"
            />,
            facet,
            'w-72',
        )
    } else {
        control = (
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
                        <DropdownMenuRadioGroup value={chosen[0] ?? ''} onValueChange={(next: string) => choose(next === '' ? [] : [next])}>
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
        )
    }
    return (
        <span
            ref={chipRef}
            data-slot="filter-chip"
            className={cn(
                'inline-flex h-(--density-control) max-w-full shrink-0 items-stretch overflow-hidden rounded-control border text-sm whitespace-nowrap max-md:min-h-finger',
                set ? 'border-primary/40 bg-accent text-foreground' : 'border-input bg-field text-foreground',
                className,
            )}
        >
            {control}
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
