'use client'

/*
 * The searchable list of commands `primitives/command` draws: a root that holds the search, the
 * active row and the keys, an input, a list, groups, rows, separators and the empty line. Taken from
 * cmdk 1.1.1 (MIT, see THIRD_PARTY_NOTICES.md) without its dialog and its Radix helpers, so the list
 * brings no dialog of its own; the library's dialog holds it. Its `cmdk-*` attributes, `data-value`,
 * `data-selected` and `data-disabled` stay as cmdk writes them, so its rows are found and styled the
 * same way.
 */

import * as React from 'react'

type DivProps = React.ComponentPropsWithoutRef<'div'>

/** How well a row's value and keywords match the search, from 0 (hidden) to 1. */
export type CommandFilter = (value: string, search: string, keywords?: string[]) => number

export type CommandRootProps = DivProps & {
    /** What the list is called to a screen reader. */
    label?: string
    /** `false` leaves the filtering and the order to the app, which draws only the rows that match. */
    shouldFilter?: boolean
    /** How a row is scored against the search; `commandScore` when not given. */
    filter?: CommandFilter
    /** The active row's value when it first draws. */
    defaultValue?: string
    /** The active row's value, held by the app. */
    value?: string
    onValueChange?: (value: string) => void
    /** Lets the arrows wrap from the last row to the first and back. */
    loop?: boolean
    /** Leaves the active row to the keys alone, never to the pointer. */
    disablePointerSelection?: boolean
    /** Ctrl+N and Ctrl+J move down, Ctrl+P and Ctrl+K up. On by default. */
    vimBindings?: boolean
}

export type CommandEmptyProps = DivProps

export type CommandListProps = DivProps & {
    /** What the list of rows is called to a screen reader. */
    label?: string
}

export type CommandItemProps = Omit<DivProps, 'onSelect' | 'value'> & {
    disabled?: boolean
    /** Runs when the row is chosen, by a press or by Enter. */
    onSelect?: (value: string) => void
    /** The row's value; its text when not given. */
    value?: string
    /** More words it is found by. */
    keywords?: string[]
    /** Draws the row whatever the search. */
    forceMount?: boolean
}

export type CommandGroupProps = Omit<DivProps, 'value'> & {
    heading?: React.ReactNode
    /** The group's value, needed when it has no heading. */
    value?: string
    /** Draws the group and its rows whatever the search. */
    forceMount?: boolean
}

export type CommandSeparatorProps = DivProps & {
    /** Draws it while a search is typed too. */
    alwaysRender?: boolean
}

export type CommandInputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'> & {
    value?: string
    onValueChange?: (search: string) => void
}

type Context = {
    value: (id: string, value: string, keywords?: string[]) => void
    item: (id: string, groupId: string | undefined) => () => void
    group: (id: string) => () => void
    filter: () => boolean
    label: string | undefined
    getDisablePointerSelection: () => boolean
    listId: string
    labelId: string
    inputId: string
    listInnerRef: React.RefObject<HTMLDivElement | null>
}

type State = {
    search: string
    value: string
    selectedItemId?: string
    filtered: { count: number; items: Map<string, number>; groups: Set<string> }
}

type Store = {
    subscribe: (callback: () => void) => () => void
    snapshot: () => State
    setState: <K extends keyof State>(key: K, value: State[K], keepScroll?: boolean) => void
    emit: () => void
}

type Group = { id: string; forceMount?: boolean }

const GROUP_SELECTOR = `[cmdk-group=""]`
const GROUP_ITEMS_SELECTOR = `[cmdk-group-items=""]`
const GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`
const ITEM_SELECTOR = `[cmdk-item=""]`
const VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`
const SELECT_EVENT = `cmdk-item-select`
const VALUE_ATTR = `data-value`

const CommandContext = React.createContext<Context | undefined>(undefined)
const StoreContext = React.createContext<Store | undefined>(undefined)
const GroupContext = React.createContext<Group | undefined>(undefined)

function useCommand(): Context {
    const context = React.useContext(CommandContext)
    if (context === undefined) throw new Error('A command list part is drawn outside its Command')
    return context
}

function useStore(): Store {
    const store = React.useContext(StoreContext)
    if (store === undefined) throw new Error('A command list part is drawn outside its Command')
    return store
}

const useLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/** Sets each ref to the node. */
function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
    return (node) => {
        for (const ref of refs) {
            if (typeof ref === 'function') ref(node)
            else if (ref !== null && ref !== undefined) ref.current = node
        }
    }
}

function CommandRoot({ ref: forwardedRef, ...props }: CommandRootProps & { ref?: React.Ref<HTMLDivElement> }) {
    const state = useLazyRef<State>(() => ({
        search: '',
        value: props.value ?? props.defaultValue ?? '',
        selectedItemId: undefined,
        filtered: { count: 0, items: new Map(), groups: new Set() },
    }))
    // Every row, every group's rows, each row's value and keywords, and the parts that redraw on a change.
    const allItems = useLazyRef<Set<string>>(() => new Set())
    const allGroups = useLazyRef<Map<string, Set<string>>>(() => new Map())
    const ids = useLazyRef<Map<string, { value: string; keywords?: string[] }>>(() => new Map())
    const listeners = useLazyRef<Set<() => void>>(() => new Set())
    const propsRef = useAsRef(props)
    const {
        label,
        children,
        value,
        onValueChange: _onValueChange,
        filter: _filter,
        shouldFilter: _shouldFilter,
        loop: _loop,
        disablePointerSelection: _disablePointerSelection,
        vimBindings = true,
        ...etc
    } = props

    const listId = React.useId()
    const labelId = React.useId()
    const inputId = React.useId()
    const listInnerRef = React.useRef<HTMLDivElement>(null)
    const schedule = useScheduleLayoutEffect()

    // A held `value` becomes the active row.
    useLayoutEffect(() => {
        if (value !== undefined) {
            state.current.value = value.trim()
            store.emit()
        }
    }, [value])

    useLayoutEffect(() => {
        schedule(6, scrollSelectedIntoView)
    }, [])

    const store: Store = React.useMemo(
        () => ({
            subscribe: (callback) => {
                listeners.current.add(callback)
                return () => listeners.current.delete(callback)
            },
            snapshot: () => state.current,
            setState: (key, next, keepScroll) => {
                if (Object.is(state.current[key], next)) return
                state.current[key] = next
                if (key === 'search') {
                    // Filters at once, before the rows redraw.
                    filterItems()
                    sort()
                    schedule(1, selectFirstItem)
                } else if (key === 'value') {
                    // Focus stays on the search, or on the list, so a screen reader follows the active row.
                    const active = document.activeElement
                    if (active?.hasAttribute('cmdk-input') === true || active?.hasAttribute('cmdk-root') === true) {
                        const input = document.getElementById(inputId)
                        if (input !== null) input.focus()
                        else document.getElementById(listId)?.focus()
                    }
                    schedule(7, () => {
                        state.current.selectedItemId = getSelectedItem()?.id
                        store.emit()
                    })
                    if (keepScroll !== true) schedule(5, scrollSelectedIntoView)
                    if (propsRef.current.value !== undefined) {
                        // A held value only tells the app; the app hands it back.
                        propsRef.current.onValueChange?.((next ?? '') as string)
                        return
                    }
                }
                store.emit()
            },
            emit: () => {
                for (const listener of listeners.current) listener()
            },
        }),
        [],
    )

    const context: Context = React.useMemo(
        () => ({
            value: (id, next, keywords) => {
                if (next !== ids.current.get(id)?.value) {
                    ids.current.set(id, { value: next, keywords })
                    state.current.filtered.items.set(id, score(next, keywords))
                    schedule(2, () => {
                        sort()
                        store.emit()
                    })
                }
            },
            item: (id, groupId) => {
                allItems.current.add(id)
                if (groupId !== undefined) {
                    const group = allGroups.current.get(groupId)
                    if (group === undefined) allGroups.current.set(groupId, new Set([id]))
                    else group.add(id)
                }
                // Rows mount many at a time, so they are filtered and sorted once for all of them.
                schedule(3, () => {
                    filterItems()
                    sort()
                    if (!state.current.value) selectFirstItem()
                    store.emit()
                })
                return () => {
                    ids.current.delete(id)
                    allItems.current.delete(id)
                    state.current.filtered.items.delete(id)
                    const selectedItem = getSelectedItem()
                    schedule(4, () => {
                        filterItems()
                        // The active row went away: the first row is active.
                        if (selectedItem?.getAttribute('id') === id) selectFirstItem()
                        store.emit()
                    })
                }
            },
            group: (id) => {
                if (!allGroups.current.has(id)) allGroups.current.set(id, new Set())
                return () => {
                    ids.current.delete(id)
                    allGroups.current.delete(id)
                }
            },
            filter: () => propsRef.current.shouldFilter !== false,
            label: label ?? props['aria-label'],
            getDisablePointerSelection: () => propsRef.current.disablePointerSelection === true,
            listId,
            inputId,
            labelId,
            listInnerRef,
        }),
        [],
    )

    function score(of: string, keywords?: string[]) {
        const filter = propsRef.current.filter ?? commandScore
        return of ? filter(of, state.current.search, keywords) : 0
    }

    /** Sorts the rows by their score, and the groups by their best row's. */
    function sort() {
        if (!state.current.search || propsRef.current.shouldFilter === false) return
        const scores = state.current.filtered.items
        const groups: [string, number][] = []
        for (const groupId of state.current.filtered.groups) {
            let max = 0
            for (const item of allGroups.current.get(groupId) ?? []) max = Math.max(scores.get(item) ?? 0, max)
            groups.push([groupId, max])
        }
        const listInsertionElement = listInnerRef.current
        for (const item of getValidItems().sort(
            (a, b) => (scores.get(b.getAttribute('id') ?? '') ?? 0) - (scores.get(a.getAttribute('id') ?? '') ?? 0),
        )) {
            const group = item.closest(GROUP_ITEMS_SELECTOR)
            const moved = item.parentElement === (group ?? listInsertionElement) ? item : item.closest(`${GROUP_ITEMS_SELECTOR} > *`)
            if (moved === null) continue
            if (group !== null) group.appendChild(moved)
            else listInsertionElement?.appendChild(moved)
        }
        for (const [groupId] of groups.sort((a, b) => b[1] - a[1])) {
            const element = listInnerRef.current?.querySelector(`${GROUP_SELECTOR}[${VALUE_ATTR}="${encodeURIComponent(groupId)}"]`)
            element?.parentElement?.appendChild(element)
        }
    }

    function selectFirstItem() {
        const item = getValidItems().find((row) => row.getAttribute('aria-disabled') !== 'true')
        store.setState('value', item?.getAttribute(VALUE_ATTR) || '')
    }

    /** Scores every row against the search and counts the rows and the groups left. */
    function filterItems() {
        if (!state.current.search || propsRef.current.shouldFilter === false) {
            state.current.filtered.count = allItems.current.size
            return
        }
        state.current.filtered.groups = new Set()
        let itemCount = 0
        for (const id of allItems.current) {
            const rank = score(ids.current.get(id)?.value ?? '', ids.current.get(id)?.keywords ?? [])
            state.current.filtered.items.set(id, rank)
            if (rank > 0) itemCount++
        }
        for (const [groupId, group] of allGroups.current) {
            for (const itemId of group) {
                if ((state.current.filtered.items.get(itemId) ?? 0) > 0) {
                    state.current.filtered.groups.add(groupId)
                    break
                }
            }
        }
        state.current.filtered.count = itemCount
    }

    function scrollSelectedIntoView() {
        const item = getSelectedItem()
        if (item === null || item === undefined) return
        // The first row of a group brings its heading into view with it.
        if (item.parentElement?.firstChild === item)
            item.closest(GROUP_SELECTOR)?.querySelector(GROUP_HEADING_SELECTOR)?.scrollIntoView({ block: 'nearest' })
        item.scrollIntoView({ block: 'nearest' })
    }

    function getSelectedItem() {
        return listInnerRef.current?.querySelector(`${ITEM_SELECTOR}[aria-selected="true"]`)
    }

    function getValidItems() {
        return Array.from(listInnerRef.current?.querySelectorAll(VALID_ITEM_SELECTOR) ?? [])
    }

    function updateSelectedToIndex(index: number) {
        const item = getValidItems()[index]
        if (item !== undefined) store.setState('value', item.getAttribute(VALUE_ATTR) ?? '')
    }

    function updateSelectedByItem(change: 1 | -1) {
        const selected = getSelectedItem()
        const items = getValidItems()
        const index = items.findIndex((item) => item === selected)
        let next = items[index + change]
        if (propsRef.current.loop === true)
            next = index + change < 0 ? items[items.length - 1] : index + change === items.length ? items[0] : items[index + change]
        if (next !== undefined) store.setState('value', next.getAttribute(VALUE_ATTR) ?? '')
    }

    function updateSelectedByGroup(change: 1 | -1) {
        let group = getSelectedItem()?.closest(GROUP_SELECTOR) ?? null
        let item: Element | null = null
        while (group !== null && item === null) {
            group = change > 0 ? findNextSibling(group, GROUP_SELECTOR) : findPreviousSibling(group, GROUP_SELECTOR)
            item = group?.querySelector(VALID_ITEM_SELECTOR) ?? null
        }
        if (item !== null) store.setState('value', item.getAttribute(VALUE_ATTR) ?? '')
        else updateSelectedByItem(change)
    }

    const last = () => updateSelectedToIndex(getValidItems().length - 1)

    // Down moves a row, Alt a group, Meta to the last row; Up the same the other way.
    const move = (event: React.KeyboardEvent, change: 1 | -1) => {
        event.preventDefault()
        if (event.metaKey) {
            if (change > 0) last()
            else updateSelectedToIndex(0)
        } else if (event.altKey) updateSelectedByGroup(change)
        else updateSelectedByItem(change)
    }

    return (
        <div
            ref={forwardedRef}
            tabIndex={-1}
            {...etc}
            cmdk-root=""
            onKeyDown={(event) => {
                etc.onKeyDown?.(event)
                // A key that finishes an input method's composition is the composition's, not the list's.
                const isComposing = event.nativeEvent.isComposing || event.keyCode === 229
                if (event.defaultPrevented || isComposing) return
                switch (event.key) {
                    case 'n':
                    case 'j':
                        if (vimBindings && event.ctrlKey) move(event, 1)
                        break
                    case 'ArrowDown':
                        move(event, 1)
                        break
                    case 'p':
                    case 'k':
                        if (vimBindings && event.ctrlKey) move(event, -1)
                        break
                    case 'ArrowUp':
                        move(event, -1)
                        break
                    case 'Home':
                        event.preventDefault()
                        updateSelectedToIndex(0)
                        break
                    case 'End':
                        event.preventDefault()
                        last()
                        break
                    case 'Enter': {
                        event.preventDefault()
                        getSelectedItem()?.dispatchEvent(new Event(SELECT_EVENT))
                    }
                }
            }}
        >
            <label cmdk-label="" htmlFor={context.inputId} id={context.labelId} style={SR_ONLY}>
                {label}
            </label>
            <StoreContext.Provider value={store}>
                <CommandContext.Provider value={context}>{children}</CommandContext.Provider>
            </StoreContext.Provider>
        </div>
    )
}

/** A row: active under the pointer or the arrows, chosen by a press or Enter. */
function CommandItem({ ref: forwardedRef, ...props }: CommandItemProps & { ref?: React.Ref<HTMLDivElement> }) {
    const id = React.useId()
    const ref = React.useRef<HTMLDivElement>(null)
    const groupContext = React.useContext(GroupContext)
    const context = useCommand()
    const propsRef = useAsRef(props)
    const forceMount = props.forceMount ?? groupContext?.forceMount

    useLayoutEffect(() => {
        if (forceMount !== true) return context.item(id, groupContext?.id)
    }, [forceMount])

    const value = useValue(id, ref, [props.value, props.children, ref], props.keywords)
    const store = useStore()
    const selected = useCmdk((state) => Boolean(state.value) && state.value === value.current)
    const render = useCmdk((state) =>
        forceMount === true || !context.filter() || !state.search ? true : (state.filtered.items.get(id) ?? 0) > 0,
    )

    React.useEffect(() => {
        const element = ref.current
        if (element === null || props.disabled === true) return
        element.addEventListener(SELECT_EVENT, onSelect)
        return () => element.removeEventListener(SELECT_EVENT, onSelect)
    }, [render, props.onSelect, props.disabled])

    function onSelect() {
        select()
        propsRef.current.onSelect?.(value.current ?? '')
    }

    function select() {
        store.setState('value', value.current ?? '', true)
    }

    if (!render) return null
    const { disabled, value: _value, onSelect: _onSelect, forceMount: _forceMount, keywords: _keywords, ...etc } = props
    return (
        <div
            ref={composeRefs(ref, forwardedRef)}
            {...etc}
            id={id}
            cmdk-item=""
            role="option"
            aria-disabled={Boolean(disabled)}
            aria-selected={selected}
            data-disabled={Boolean(disabled)}
            data-selected={selected}
            onPointerMove={disabled === true || context.getDisablePointerSelection() ? undefined : select}
            onClick={disabled === true ? undefined : onSelect}
        >
            {props.children}
        </div>
    )
}

/** Rows under a heading, shown while one of them matches. */
function CommandGroup({ ref: forwardedRef, ...props }: CommandGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
    const { heading, children, forceMount, value: _value, ...etc } = props
    const id = React.useId()
    const ref = React.useRef<HTMLDivElement>(null)
    const headingRef = React.useRef<HTMLDivElement>(null)
    const headingId = React.useId()
    const context = useCommand()
    const render = useCmdk((state) => (forceMount === true || !context.filter() || !state.search ? true : state.filtered.groups.has(id)))

    useLayoutEffect(() => context.group(id), [])
    useValue(id, ref, [props.value, props.heading, headingRef])
    const contextValue = React.useMemo(() => ({ id, forceMount }), [forceMount])

    return (
        <div ref={composeRefs(ref, forwardedRef)} {...etc} cmdk-group="" role="presentation" hidden={render ? undefined : true}>
            {heading !== undefined && heading !== null && heading !== false && (
                <div ref={headingRef} cmdk-group-heading="" aria-hidden id={headingId}>
                    {heading}
                </div>
            )}
            <div cmdk-group-items="" role="group" aria-labelledby={heading ? headingId : undefined}>
                <GroupContext.Provider value={contextValue}>{children}</GroupContext.Provider>
            </div>
        </div>
    )
}

/** A rule between rows or groups, drawn while no search is typed unless `alwaysRender`. */
function CommandSeparator({ ref, alwaysRender, ...etc }: CommandSeparatorProps & { ref?: React.Ref<HTMLDivElement> }) {
    const render = useCmdk((state) => !state.search)
    if (alwaysRender !== true && !render) return null
    return <div ref={ref} {...etc} cmdk-separator="" role="separator" />
}

/** The search, a combobox over the list whose active row it names. */
function CommandInput({ ref, ...props }: CommandInputProps & { ref?: React.Ref<HTMLInputElement> }) {
    const { onValueChange, ...etc } = props
    const isControlled = props.value !== undefined && props.value !== null
    const store = useStore()
    const search = useCmdk((state) => state.search)
    const selectedItemId = useCmdk((state) => state.selectedItemId)
    const context = useCommand()

    React.useEffect(() => {
        if (props.value !== undefined && props.value !== null) store.setState('search', props.value)
    }, [props.value])

    return (
        <input
            ref={ref}
            {...etc}
            cmdk-input=""
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-autocomplete="list"
            role="combobox"
            aria-expanded={true}
            aria-controls={context.listId}
            aria-labelledby={context.labelId}
            aria-activedescendant={selectedItemId}
            id={context.inputId}
            type="text"
            value={isControlled ? props.value : search}
            onChange={(event) => {
                if (!isControlled) store.setState('search', event.target.value)
                onValueChange?.(event.target.value)
            }}
        />
    )
}

/** The listbox holding the rows; `--cmdk-list-height` follows the height of what it holds. */
function CommandList({ ref: forwardedRef, ...props }: CommandListProps & { ref?: React.Ref<HTMLDivElement> }) {
    const { children, label = 'Suggestions', ...etc } = props
    const ref = React.useRef<HTMLDivElement>(null)
    const height = React.useRef<HTMLDivElement>(null)
    const selectedItemId = useCmdk((state) => state.selectedItemId)
    const context = useCommand()

    React.useEffect(() => {
        const element = height.current
        const wrapper = ref.current
        if (element === null || wrapper === null) return
        let frame = 0
        const observer = new ResizeObserver(() => {
            frame = requestAnimationFrame(() => wrapper.style.setProperty('--cmdk-list-height', `${element.offsetHeight.toFixed(1)}px`))
        })
        observer.observe(element)
        return () => {
            cancelAnimationFrame(frame)
            observer.unobserve(element)
        }
    }, [])

    return (
        <div
            ref={composeRefs(ref, forwardedRef)}
            {...etc}
            cmdk-list=""
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={selectedItemId}
            aria-label={label}
            id={context.listId}
        >
            <div ref={composeRefs(height, context.listInnerRef)} cmdk-list-sizer="">
                {children}
            </div>
        </div>
    )
}

/** Drawn while no row matches the search. */
function CommandEmpty({ ref, ...props }: CommandEmptyProps & { ref?: React.Ref<HTMLDivElement> }) {
    const render = useCmdk((state) => state.filtered.count === 0)
    if (!render) return null
    return <div ref={ref} {...props} cmdk-empty="" role="presentation" />
}

export { CommandRoot, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator }

function findNextSibling(element: Element, selector: string): Element | null {
    let sibling = element.nextElementSibling
    while (sibling !== null) {
        if (sibling.matches(selector)) return sibling
        sibling = sibling.nextElementSibling
    }
    return null
}

function findPreviousSibling(element: Element, selector: string): Element | null {
    let sibling = element.previousElementSibling
    while (sibling !== null) {
        if (sibling.matches(selector)) return sibling
        sibling = sibling.previousElementSibling
    }
    return null
}

function useAsRef<T>(data: T) {
    const ref = React.useRef<T>(data)
    useLayoutEffect(() => {
        ref.current = data
    })
    return ref
}

function useLazyRef<T>(make: () => T) {
    const ref = React.useRef<T | undefined>(undefined)
    if (ref.current === undefined) ref.current = make()
    return ref as React.RefObject<T>
}

/** Reads the list's state, redrawing when what `selector` picks changes. */
function useCmdk<T>(selector: (state: State) => T): T {
    const store = useStore()
    const read = () => selector(store.snapshot())
    return React.useSyncExternalStore(store.subscribe, read, read)
}

/** Keeps a row's or group's value: its `value`, else its text, as `data-value` and in the list. */
function useValue(
    id: string,
    ref: React.RefObject<HTMLElement | null>,
    deps: (string | React.ReactNode | React.RefObject<HTMLElement | null>)[],
    aliases: string[] = [],
) {
    const valueRef = React.useRef<string | undefined>(undefined)
    const context = useCommand()
    useLayoutEffect(() => {
        const value = (() => {
            for (const part of deps) {
                if (typeof part === 'string') return part.trim()
                if (typeof part === 'object' && part !== null && 'current' in part) {
                    if (part.current !== null) return part.current.textContent?.trim()
                    return valueRef.current
                }
            }
            return undefined
        })()
        context.value(
            id,
            value ?? '',
            aliases.map((alias) => alias.trim()),
        )
        if (value !== undefined) ref.current?.setAttribute(VALUE_ATTR, value)
        valueRef.current = value
    })
    return valueRef
}

/** Runs a function on the next layout effect, once per key however often it is asked. */
function useScheduleLayoutEffect() {
    const [tick, setTick] = React.useState<object>()
    const fns = useLazyRef(() => new Map<number, () => void>())
    useLayoutEffect(() => {
        for (const fn of fns.current.values()) fn()
        fns.current = new Map()
    }, [tick])
    return (key: number, fn: () => void) => {
        fns.current.set(key, fn)
        setTick({})
    }
}

const SR_ONLY = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
} as const

// How well `abbreviation` matches `string` and its aliases, from 0 to 1: a run of matching letters
// scores 1, a match at a word's start after a space 0.9 and after another break 0.8, any other match
// 0.17, and a transposed pair 0.1; each skipped letter, a case mismatch and an unmatched tail cost a
// little more.
const SCORE_CONTINUE_MATCH = 1
const SCORE_SPACE_WORD_JUMP = 0.9
const SCORE_NON_SPACE_WORD_JUMP = 0.8
const SCORE_CHARACTER_JUMP = 0.17
const SCORE_TRANSPOSITION = 0.1
const PENALTY_SKIPPED = 0.999
const PENALTY_CASE_MISMATCH = 0.9999
const PENALTY_NOT_COMPLETE = 0.99
const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g
const IS_SPACE_REGEXP = /[\s-]/
const COUNT_SPACE_REGEXP = /[\s-]/g

function commandScoreInner(
    string: string,
    abbreviation: string,
    lowerString: string,
    lowerAbbreviation: string,
    stringIndex: number,
    abbreviationIndex: number,
    memo: Map<string, number>,
): number {
    if (abbreviationIndex === abbreviation.length) return stringIndex === string.length ? SCORE_CONTINUE_MATCH : PENALTY_NOT_COMPLETE
    const key = `${stringIndex},${abbreviationIndex}`
    const known = memo.get(key)
    if (known !== undefined) return known

    const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex)
    let index = lowerString.indexOf(abbreviationChar, stringIndex)
    let highScore = 0
    while (index >= 0) {
        let score = commandScoreInner(string, abbreviation, lowerString, lowerAbbreviation, index + 1, abbreviationIndex + 1, memo)
        if (score > highScore) {
            if (index === stringIndex) {
                score *= SCORE_CONTINUE_MATCH
            } else if (IS_GAP_REGEXP.test(string.charAt(index - 1))) {
                score *= SCORE_NON_SPACE_WORD_JUMP
                const wordBreaks = string.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP)
                if (wordBreaks !== null && stringIndex > 0) score *= Math.pow(PENALTY_SKIPPED, wordBreaks.length)
            } else if (IS_SPACE_REGEXP.test(string.charAt(index - 1))) {
                score *= SCORE_SPACE_WORD_JUMP
                const spaceBreaks = string.slice(stringIndex, index - 1).match(COUNT_SPACE_REGEXP)
                if (spaceBreaks !== null && stringIndex > 0) score *= Math.pow(PENALTY_SKIPPED, spaceBreaks.length)
            } else {
                score *= SCORE_CHARACTER_JUMP
                if (stringIndex > 0) score *= Math.pow(PENALTY_SKIPPED, index - stringIndex)
            }
            if (string.charAt(index) !== abbreviation.charAt(abbreviationIndex)) score *= PENALTY_CASE_MISMATCH
        }
        // A transposed pair, or a doubled letter, is tried as the two letters swapped.
        if (
            (score < SCORE_TRANSPOSITION && lowerString.charAt(index - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1)) ||
            (lowerAbbreviation.charAt(abbreviationIndex + 1) === lowerAbbreviation.charAt(abbreviationIndex) &&
                lowerString.charAt(index - 1) !== lowerAbbreviation.charAt(abbreviationIndex))
        ) {
            const transposed = commandScoreInner(
                string,
                abbreviation,
                lowerString,
                lowerAbbreviation,
                index + 1,
                abbreviationIndex + 2,
                memo,
            )
            if (transposed * SCORE_TRANSPOSITION > score) score = transposed * SCORE_TRANSPOSITION
        }
        if (score > highScore) highScore = score
        index = lowerString.indexOf(abbreviationChar, index + 1)
    }
    memo.set(key, highScore)
    return highScore
}

/** Lower case, with every space and hyphen a space, so they match each other. */
function formatInput(string: string): string {
    return string.toLowerCase().replace(COUNT_SPACE_REGEXP, ' ')
}

/** The list's own matching: how well `abbreviation` matches `string` and its aliases, from 0 to 1. */
export function commandScore(string: string, abbreviation: string, aliases?: string[]): number {
    const all = aliases !== undefined && aliases.length > 0 ? `${string} ${aliases.join(' ')}` : string
    return commandScoreInner(all, abbreviation, formatInput(all), formatInput(abbreviation), 0, 0, new Map())
}
