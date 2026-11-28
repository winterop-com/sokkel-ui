import { Combobox } from '@base-ui/react'
import { Check, Search } from 'lucide-react'
import { useRef, useState, type ReactNode, type Ref } from 'react'

import { cn } from '../lib/cn'

/** One value a list offers. */
export interface ListOption {
    value: string
    /** Said in the list and matched by the search; the value itself when absent. */
    label?: string
    /** Drawn before the label, such as a status dot or an avatar. */
    icon?: ReactNode
    /** Drawn as the row in place of the icon and label, such as a colored label. */
    row?: ReactNode
    /** A quiet fact at the row's end. */
    detail?: ReactNode
}

export interface OptionListWords {
    search: string
    empty: string
}

export interface OptionListProps {
    options: readonly ListOption[]
    /** Ticks several values, each pick toggling one; one pick otherwise. */
    multiple?: boolean
    /** The chosen values; at most one without `multiple`. */
    value: readonly string[]
    onValueChange: (value: string[]) => void
    /** Draws a row's end mark: a check for the chosen, or nothing; a tick box in `multiple`. */
    marks?: 'check' | 'none'
    words: OptionListWords
    /** The search box, for the popup holding the list to focus first. */
    inputRef?: Ref<HTMLInputElement>
    className?: string
}

const labelOf = (option: ListOption) => option.label ?? option.value

/**
 * A list of values with a search box over it, drawn inline in whatever popup holds it: typing
 * narrows the rows by their labels, the arrows move through them and Enter picks one. With
 * `multiple` each row carries a tick box and a pick toggles it, the list staying as it is; the
 * values ticked when it opens lead it.
 */
export function OptionList({
    options,
    multiple = false,
    value,
    onValueChange,
    marks = 'check',
    words,
    inputRef,
    className,
}: OptionListProps) {
    const byValue = useRef(new Map<string, ListOption>())
    byValue.current = new Map(options.map((option) => [option.value, option]))
    // Ticked values lead a long list as it opens, and keep their places while it stays open.
    const [leading] = useState(() => (multiple ? new Set(value) : new Set<string>()))
    const items = [...options.filter((option) => leading.has(option.value)), ...options.filter((option) => !leading.has(option.value))].map(
        (option) => option.value,
    )
    const label = (item: string) => {
        const option = byValue.current.get(item)
        return option === undefined ? item : labelOf(option)
    }
    const row = (item: string) => {
        const option = byValue.current.get(item)
        if (option === undefined) return item
        return (
            option.row ?? (
                <>
                    {option.icon}
                    <span className="min-w-0 truncate">{labelOf(option)}</span>
                </>
            )
        )
    }
    // The search is held here, so a pick never writes the picked label into it as a select would.
    const [query, setQuery] = useState('')
    const shared = {
        inline: true,
        open: true,
        items,
        autoHighlight: true,
        itemToStringLabel: label,
        inputValue: query,
        onInputValueChange: (next: string, details: { reason: string }) => {
            if (details.reason !== 'item-press') setQuery(next)
        },
    } as const
    const body = (
        <>
            <div className="flex items-center gap-2 border-b border-border px-2.5">
                <Search className="size-4 shrink-0 text-faint" aria-hidden />
                <Combobox.Input
                    ref={inputRef}
                    data-autofocus
                    placeholder={words.search}
                    aria-label={words.search}
                    className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground max-md:min-h-finger md:text-sm"
                />
            </div>
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">{words.empty}</Combobox.Empty>
            <Combobox.List className="max-h-72 overflow-y-auto overscroll-contain p-1 empty:hidden">
                {(item: string) => {
                    const option = byValue.current.get(item)
                    return (
                        <Combobox.Item
                            key={item}
                            value={item}
                            className="group/option relative flex min-h-(--density-control) w-full cursor-default items-center gap-2 rounded-md px-2 py-0.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground pointer-coarse:min-h-finger"
                        >
                            {multiple && (
                                <span
                                    aria-hidden
                                    className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-input text-primary-foreground group-data-[selected]/option:border-primary group-data-[selected]/option:bg-primary dark:bg-input/30 dark:group-data-[selected]/option:bg-primary"
                                >
                                    <Check className="invisible size-3.5 group-data-[selected]/option:visible" />
                                </span>
                            )}
                            <span className={cn('flex min-w-0 flex-1 items-center gap-2', !multiple && marks === 'check' && 'pr-6')}>
                                {row(item)}
                            </span>
                            {option?.detail !== undefined && (
                                <span className="shrink-0 text-xs text-muted-foreground group-data-highlighted/option:text-accent-foreground">
                                    {option.detail}
                                </span>
                            )}
                            {!multiple && marks === 'check' && (
                                <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                                    <Check className="size-4" aria-hidden />
                                </Combobox.ItemIndicator>
                            )}
                        </Combobox.Item>
                    )
                }}
            </Combobox.List>
        </>
    )
    return (
        <div data-slot="option-list" className={cn('flex min-h-0 flex-col', className)}>
            {multiple ? (
                <Combobox.Root
                    {...shared}
                    multiple
                    value={[...value]}
                    onValueChange={(next) =>
                        onValueChange(options.map((option) => option.value).filter((item) => (next as string[]).includes(item)))
                    }
                >
                    {body}
                </Combobox.Root>
            ) : (
                <Combobox.Root
                    {...shared}
                    value={value[0] ?? null}
                    onValueChange={(next) => onValueChange(next === null ? [] : [next as string])}
                >
                    {body}
                </Combobox.Root>
            )}
        </div>
    )
}
