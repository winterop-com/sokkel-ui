'use client'

import type { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import type { Menu as BaseMenu } from '@base-ui/react/menu'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useSyncExternalStore,
    type ComponentType,
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    type Ref,
    type RefObject,
} from 'react'

type MenuParts = (typeof import('./menu-engine'))['Menu']
type ContextMenuParts = (typeof import('./context-menu-engine'))['ContextMenu']

/** Parts fetched once and shared by every menu after: undefined until they arrive, a failed fetch tried again on the next ask. */
interface Fetched<T> {
    load: () => void
    get: () => T | undefined
    subscribe: (listener: () => void) => () => void
}

function fetched<T>(fetch: () => Promise<T>): Fetched<T> {
    let loading: Promise<void> | undefined
    let loaded: T | undefined
    const listeners = new Set<() => void>()
    return {
        load: () => {
            loading ??= fetch().then(
                (parts) => {
                    loaded = parts
                    for (const listener of listeners) listener()
                },
                () => {
                    loading = undefined
                },
            )
        },
        get: () => loaded,
        subscribe: (listener) => {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
    }
}

// Pure, so an app that draws no context menu bundles no context menu.
const menuParts = /* @__PURE__ */ fetched(() => import('./menu-engine').then((module) => module.Menu))
const contextMenuParts = /* @__PURE__ */ fetched(() => import('./context-menu-engine').then((module) => module.ContextMenu))

/** Base UI's menu handed down by a part that has it at once, such as a menu bar, whose menus are then never stand-ins. */
export const menuPartsAtOnce = createContext<MenuParts | undefined>(undefined)

const nothing = () => undefined

/** The parts once they are here, fetching them after the first paint; undefined until then. */
function useParts<T>(parts: Fetched<T>, given: T | undefined): T | undefined {
    const loaded = useSyncExternalStore(parts.subscribe, parts.get, nothing)
    useEffect(() => {
        if (given === undefined && loaded === undefined) parts.load()
    }, [parts, given, loaded])
    return given ?? loaded
}

function useMenuParts(): MenuParts | undefined {
    const given = useContext(menuPartsAtOnce)
    return useParts(menuParts, given)
}

function useContextMenuParts(): ContextMenuParts | undefined {
    return useParts(contextMenuParts, undefined)
}

/**
 * What a menu's stand-in was given before the parts arrived, done again on the real trigger: the
 * focus it held, a press that opens it, a right click at a point. Held by the menu's root, which
 * outlives the swap from stand-in to real trigger.
 */
interface Missed {
    focus: boolean
    press: boolean
    point?: { x: number; y: number }
    disabled: boolean
}

const MissedContext = createContext<Missed | undefined>(undefined)

type RootChildren = ReactNode | ((arg: { payload: unknown }) => ReactNode)

/**
 * A menu root's children around its record of what their stand-in missed, given to Base UI's root
 * once it is here (`real`). The root keeps the record, as it outlives the swap its children go through.
 */
function useMissed(children: RootChildren, disabled: boolean | undefined, real: boolean): RootChildren {
    const missed = useRef<Missed>({ focus: false, press: false, disabled: false }).current
    missed.disabled = disabled === true
    const wrap = (node: ReactNode) => <MissedContext.Provider value={missed}>{node}</MissedContext.Provider>
    if (typeof children !== 'function') return wrap(children)
    return real ? (arg: { payload: unknown }) => wrap(children(arg)) : wrap(children({ payload: undefined }))
}

/** Keeps the stand-in's focus in the record; a blur waits a beat, as the swap's removal blurs it too. */
function focusHandlers(missed: Missed | undefined, load: () => void) {
    return {
        onFocus: (event: FocusEvent) => {
            if (missed !== undefined && event.target === event.currentTarget) missed.focus = true
            load()
        },
        onBlur: (event: FocusEvent) => {
            if (missed === undefined || event.target !== event.currentTarget) return
            queueMicrotask(() => {
                missed.focus = false
            })
        },
    }
}

/** A trigger's `render` as `useRender` takes it, whose state type wants an index signature Base UI's state types lack. */
type StandInRender = useRender.RenderProp | undefined

/**
 * A menu's trigger before the menu has arrived: the same element with the same attributes as Base
 * UI's closed trigger. A press on it opens the menu once the parts are here.
 */
function MenuTriggerStandIn({
    render,
    className,
    style,
    disabled: own = false,
    nativeButton = true,
    // The rest of the trigger's options only matter to the real one.
    openOnHover: _openOnHover,
    delay: _delay,
    closeDelay: _closeDelay,
    handle: _handle,
    payload: _payload,
    ...props
}: BaseMenu.Trigger.Props) {
    const missed = useContext(MissedContext)
    const disabled = own || missed?.disabled === true
    const state: BaseMenu.Trigger.State = { disabled, open: false }
    const load = menuParts.load
    const press = () => {
        if (disabled) return
        if (missed !== undefined) missed.press = true
        load()
    }
    const button = nativeButton
        ? { type: 'button' as const, tabIndex: 0, disabled }
        : { role: 'button', tabIndex: disabled ? -1 : 0, 'aria-disabled': disabled || undefined }
    return useRender({
        defaultTagName: 'button',
        render: render as StandInRender,
        state: { ...state },
        props: mergeProps<'button'>(
            {
                ...button,
                'aria-haspopup': 'menu',
                'aria-expanded': false,
                className: typeof className === 'function' ? className(state) : className,
                style: typeof style === 'function' ? style(state) : style,
                onPointerEnter: load,
                ...focusHandlers(missed, load),
                onMouseDown: (event: MouseEvent) => {
                    if (event.button === 0) press()
                },
                onClick: press,
                onKeyDown: (event: KeyboardEvent) => {
                    const opens = event.key === 'ArrowDown' || event.key === 'ArrowUp'
                    if (opens || (!nativeButton && (event.key === 'Enter' || event.key === ' '))) press()
                },
            },
            props,
        ),
    })
}

/**
 * A context menu's trigger before the menu has arrived: the same element as Base UI's, keeping the
 * browser's own menu away. A right click on it opens the menu at its point once the parts are here.
 */
function ContextMenuTriggerStandIn({ render, className, style, ...props }: BaseContextMenu.Trigger.Props) {
    const missed = useContext(MissedContext)
    const state: BaseContextMenu.Trigger.State = { open: false }
    const load = contextMenuParts.load
    return useRender({
        defaultTagName: 'div',
        render: render as StandInRender,
        state: { ...state },
        props: mergeProps<'div'>(
            {
                className: typeof className === 'function' ? className(state) : className,
                style: { WebkitTouchCallout: 'none', ...(typeof style === 'function' ? style(state) : style) },
                onContextMenu: (event: MouseEvent) => {
                    if (missed?.disabled === true) return
                    event.preventDefault()
                    event.stopPropagation()
                    if (missed !== undefined) missed.point = { x: event.clientX, y: event.clientY }
                    load()
                },
                onTouchStart: load,
            },
            props,
        ),
    })
}

/**
 * The real trigger's side of the swap: its element, and once it is mounted the focus and the
 * press or right click its stand-in was given, with the app's own handlers kept from running twice.
 */
function useReplay<E extends Element>(given: Ref<E> | undefined) {
    const missed = useContext(MissedContext)
    const node: RefObject<E | null> = useRef<E>(null)
    const replaying = useRef(false)
    const ref = useCallback(
        (element: E | null) => {
            node.current = element
            if (typeof given !== 'function') {
                if (given !== undefined && given !== null) given.current = element
                return
            }
            // A ref that hands back a cleanup gets its cleanup, not a call with null, as React does.
            const cleanup = given(element)
            if (typeof cleanup !== 'function') return
            return () => {
                node.current = null
                cleanup()
            }
        },
        [given],
    )
    useLayoutEffect(() => {
        if (missed?.focus !== true) return
        missed.focus = false
        if (node.current instanceof HTMLElement) node.current.focus({ preventScroll: true })
    }, [missed])
    useEffect(() => {
        const element = node.current
        if (missed === undefined || !(element instanceof HTMLElement)) return
        replaying.current = true
        if (missed.press) element.click()
        if (missed.point !== undefined) {
            const { x, y } = missed.point
            element.dispatchEvent(
                new globalThis.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }),
            )
        }
        replaying.current = false
        missed.press = false
        missed.point = undefined
    }, [missed])
    /** Wraps one of the app's handlers so a replayed event does not reach it a second time. */
    const once = <A extends unknown[]>(handler: ((...args: A) => void) | undefined) =>
        handler === undefined
            ? undefined
            : (...args: A) => {
                  if (!replaying.current) handler(...args)
              }
    return { ref, once }
}

function MenuRoot({ children, ...props }: BaseMenu.Root.Props) {
    const Parts = useMenuParts()
    const inner = useMissed(children, props.disabled, Parts !== undefined)
    if (Parts === undefined) return typeof inner === 'function' ? null : inner
    return <Parts.Root {...props}>{inner}</Parts.Root>
}

function MenuTrigger(props: BaseMenu.Trigger.Props) {
    const Parts = useMenuParts()
    return Parts === undefined ? <MenuTriggerStandIn {...props} /> : <MenuTriggerReal Trigger={Parts.Trigger} {...props} />
}

function MenuTriggerReal({ Trigger, ref, onClick, ...props }: BaseMenu.Trigger.Props & { Trigger: MenuParts['Trigger'] }) {
    const replay = useReplay(ref)
    return <Trigger ref={replay.ref} onClick={replay.once(onClick)} {...props} />
}

function ContextMenuRoot({ children, ...props }: BaseContextMenu.Root.Props) {
    const Parts = useContextMenuParts()
    const inner = useMissed(children, props.disabled, Parts !== undefined)
    if (typeof inner === 'function') return null
    return Parts === undefined ? inner : <Parts.Root {...props}>{inner}</Parts.Root>
}

function ContextMenuTrigger(props: BaseContextMenu.Trigger.Props) {
    const Parts = useContextMenuParts()
    return Parts === undefined ? <ContextMenuTriggerStandIn {...props} /> : <ContextMenuTriggerReal Trigger={Parts.Trigger} {...props} />
}

function ContextMenuTriggerReal({
    Trigger,
    ref,
    onContextMenu,
    ...props
}: BaseContextMenu.Trigger.Props & { Trigger: ContextMenuParts['Trigger'] }) {
    const replay = useReplay(ref)
    return <Trigger ref={replay.ref} onContextMenu={replay.once(onContextMenu)} {...props} />
}

/** A part only an open menu draws, which renders once the parts are here and nothing before. */
function loadedPart<Parts, K extends keyof Parts>(useHere: () => Parts | undefined, name: K): Parts[K] {
    function Part(props: object) {
        const here = useHere()
        if (here === undefined || here === null) return null
        const Real = here[name] as ComponentType<object>
        return <Real {...props} />
    }
    return Part as Parts[K]
}

/** The menu's parts for a part drawn in a menu bar, which has them at once, else once they are fetched. */
function useMenuPartsHere(): MenuParts | undefined {
    return useContext(menuPartsAtOnce) ?? menuParts.get()
}

function loadedContextMenu(): ContextMenuParts | undefined {
    return contextMenuParts.get()
}

/**
 * Base UI's menu with the same parts and props, loaded on first use. Until the menu has arrived the
 * root draws its children and the trigger a stand-in that looks and reads as Base UI's closed trigger;
 * the menu is fetched once the page is drawn, or as soon as a trigger is pointed at, focused or
 * pressed, and a press on the stand-in opens the menu once it is here. The rest draw only in an open
 * menu, which never opens before.
 */
export const menu = {
    Root: MenuRoot,
    Trigger: MenuTrigger,
    Portal: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Portal'),
    Positioner: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Positioner'),
    Popup: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Popup'),
    Group: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Group'),
    GroupLabel: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'GroupLabel'),
    Item: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Item'),
    CheckboxItem: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'CheckboxItem'),
    CheckboxItemIndicator: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'CheckboxItemIndicator'),
    RadioGroup: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'RadioGroup'),
    RadioItem: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'RadioItem'),
    RadioItemIndicator: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'RadioItemIndicator'),
    SubmenuRoot: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'SubmenuRoot'),
    SubmenuTrigger: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'SubmenuTrigger'),
    Separator: /* @__PURE__ */ loadedPart(useMenuPartsHere, 'Separator'),
} as const

/** Base UI's context menu with the same parts and props, loaded on first use as `menu` is. */
export const contextMenu = {
    Root: ContextMenuRoot,
    Trigger: ContextMenuTrigger,
    Portal: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Portal'),
    Positioner: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Positioner'),
    Popup: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Popup'),
    Group: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Group'),
    GroupLabel: /* @__PURE__ */ loadedPart(loadedContextMenu, 'GroupLabel'),
    Item: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Item'),
    CheckboxItem: /* @__PURE__ */ loadedPart(loadedContextMenu, 'CheckboxItem'),
    CheckboxItemIndicator: /* @__PURE__ */ loadedPart(loadedContextMenu, 'CheckboxItemIndicator'),
    RadioGroup: /* @__PURE__ */ loadedPart(loadedContextMenu, 'RadioGroup'),
    RadioItem: /* @__PURE__ */ loadedPart(loadedContextMenu, 'RadioItem'),
    RadioItemIndicator: /* @__PURE__ */ loadedPart(loadedContextMenu, 'RadioItemIndicator'),
    SubmenuRoot: /* @__PURE__ */ loadedPart(loadedContextMenu, 'SubmenuRoot'),
    SubmenuTrigger: /* @__PURE__ */ loadedPart(loadedContextMenu, 'SubmenuTrigger'),
    Separator: /* @__PURE__ */ loadedPart(loadedContextMenu, 'Separator'),
} as const
