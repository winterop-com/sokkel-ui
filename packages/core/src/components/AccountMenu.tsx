import { Avatar } from '@base-ui/react/avatar'
import { Check, ChevronsUpDown, Keyboard, LogIn, LogOut, Monitor, Moon, Palette, Settings, Sun, User, type LucideIcon } from 'lucide-react'
import { useContext } from 'react'

import { ShortcutRegistry, useShortcuts } from '../hooks/use-shortcuts'
import type { Scheme } from '../lib/appearance'
import { cn } from '../lib/cn'
import { POPUP } from '../lib/popup'
import { RailCollapsed, ShellDrawer, ShellShortcuts } from './shell-context'
import { menu as Menu } from './ui/deferred-menu'

/** A row an app adds to the account menu: its words, its icon and what choosing it does. */
export interface AccountMenuRow {
    id: string
    label: string
    icon?: LucideIcon
    /** The keys that do the same outside the menu, drawn at the row's end. */
    keys?: string
    onSelect: () => void
}

export interface AccountMenuProps {
    name: string
    /** The person's picture, drawn over the initial once it has loaded. */
    image?: string
    /**
     * A short word about the account in the muted face beside the name, such as its role ("admin"),
     * in the expanded face and the menu's head. The name keeps its room: the face gives the word up
     * first, and leaves it to the menu's head where the row is narrower than 13rem, as in a narrow
     * rail; a collapsed face, the avatar alone, leaves it out.
     */
    detail?: string
    /** Where they are signed in: a host, an instance, a version, in the code face. */
    where?: string
    collapsed?: boolean
    /** No one is signed in: the avatar is a neutral figure in place of an initial or picture, and there is no sign-out. */
    local?: boolean
    onSettings?: () => void
    /** Opens the appearance settings: the theme, the scheme, the density. */
    onAppearance?: () => void
    /** The scheme in use; with `onSchemeChange` the menu offers Light, Dark and System in itself. */
    scheme?: Scheme
    onSchemeChange?: (scheme: Scheme) => void
    /**
     * Opens the app's own keyboard shortcuts from the menu, and outside a `Shell` on `?` outside a
     * field too. In a `Shell` given `shortcuts`, the menu opens the shell's without it, and the shell
     * binds `?` once, however many account menus the frame draws.
     */
    onShortcuts?: () => void
    onSignOut?: () => void
    /** Signing in, offered in Sign out's place where no one is signed in: `local`, or where there is no `onSignOut`. */
    onSignIn?: () => void
    /** More rows, each with its icon, placed before Sign out. */
    extra?: readonly AccountMenuRow[]
    /** Whether the menu starts open. */
    defaultOpen?: boolean
    words?: Partial<AccountMenuWords>
}

/**
 * The account control in the rail's foot cell: a full-cell row with the initial, the name (with
 * `detail`, such as a role, muted beside it) and a chevron, opening upward into a menu headed by who is signed in and where. Given `image`, the
 * picture takes the initial's place once it has loaded; until then, or when it fails, the initial
 * stays.
 *
 * Expanded, it fills the cell edge to edge; collapsed, it is the picture or the initial alone. In
 * the shell's drawer on a narrow window it is drawn expanded, as the rail there is, and a row
 * chosen in its menu closes the drawer as well.
 *
 * With `scheme` and `onSchemeChange` the menu offers Light, Dark and System as rows of its own, the
 * one in use checked, and stays open as one is chosen, so the change is seen. On a phone its rows
 * are as tall as a finger needs, and Keyboard shortcuts is left out, a phone having no keyboard.
 *
 * Every app has it in the rail's foot, before it has sign-in too: then it is `local`, named for
 * the local user or as "Local", with a neutral figure for the avatar and no sign-out, so the place
 * is held and the frame looks the same in every app; `onSignIn` offers Sign in there.
 */
export function AccountMenu({
    name,
    image,
    detail,
    where,
    collapsed: kept = false,
    local = false,
    onSettings,
    onAppearance,
    scheme,
    onSchemeChange,
    onShortcuts,
    onSignOut,
    onSignIn,
    extra = [],
    defaultOpen = false,
    words: given,
}: AccountMenuProps) {
    const words = { ...WORDS, ...given }
    const drawer = useContext(ShellDrawer)
    // A rail a screen narrows through the shell decides in place of the app's own.
    const narrowed = useContext(RailCollapsed)
    const collapsed = drawer === undefined && (narrowed ?? kept)
    const inShell = useContext(ShortcutRegistry) !== undefined
    const shellShortcuts = useContext(ShellShortcuts)
    // Outside a shell the menu binds `?` for the app's shortcuts; in one, the shell binds it.
    useShortcuts(!inShell && onShortcuts !== undefined ? [{ id: 'shortcuts', key: '?', label: words.shortcuts, run: onShortcuts }] : [], [
        inShell,
        onShortcuts,
        words.shortcuts,
    ])
    const openShortcuts = onShortcuts ?? shellShortcuts
    // The `?` beside Keyboard shortcuts is drawn only where the key works.
    const keyed = inShell ? shellShortcuts !== undefined : onShortcuts !== undefined
    const initial = name.slice(0, 1).toUpperCase()
    const avatar = (size: string) => (
        <Avatar.Root
            className={cn(
                `flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold`,
                local ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
            )}
        >
            {!local && image !== undefined && <Avatar.Image src={image} alt="" className="size-full object-cover" />}
            <Avatar.Fallback>{local ? <User className="size-[62%]" aria-hidden /> : initial}</Avatar.Fallback>
        </Avatar.Root>
    )
    const signedIn = !local && onSignOut !== undefined
    const leave = signedIn
        ? { label: words.signOut, icon: LogOut, onSelect: onSignOut }
        : onSignIn !== undefined && (local || onSignOut === undefined)
          ? { label: words.signIn, icon: LogIn, onSelect: onSignIn }
          : undefined
    const schemes = [
        { value: 'light', label: words.light, icon: Sun },
        { value: 'dark', label: words.dark, icon: Moon },
        { value: 'system', label: words.system, icon: Monitor },
    ] as const
    return (
        <Menu.Root
            defaultOpen={defaultOpen}
            loopFocus={false}
            // A row chosen in the shell's drawer closes the drawer too, so what it opens is not drawn under it.
            onOpenChange={(open, details) => {
                if (!open && details.reason === 'item-press') drawer?.close()
            }}
        >
            <Menu.Trigger
                aria-label={words.account}
                className="@container mx-1.5 my-1 flex h-[calc(100%-0.5rem)] w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-md pr-1.5 pl-2.5 text-sm outline-none hover:bg-hover focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid data-popup-open:bg-hover"
            >
                {avatar('size-6')}
                {!collapsed && (
                    <>
                        <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left">
                            <span className="max-w-full shrink-0 truncate font-medium">{name}</span>
                            {detail !== undefined && (
                                <span className="min-w-0 truncate text-xs text-muted-foreground @max-[13rem]:hidden">{detail}</span>
                            )}
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </>
                )}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner className="isolate z-popover outline-none" side="top" align="start" sideOffset={4} alignOffset={4}>
                    <Menu.Popup data-slot="dropdown-menu-content" className={cn(POPUP, 'w-64 p-1')}>
                        <div className="flex items-center gap-2.5 px-2 py-2">
                            {avatar('size-8')}
                            <div className="min-w-0">
                                <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
                                    <span className="min-w-0 truncate font-medium">{name}</span>
                                    {detail !== undefined && (
                                        <span className="min-w-0 truncate text-xs text-muted-foreground">{detail}</span>
                                    )}
                                </p>
                                {where !== undefined && <p className="truncate font-mono text-xs text-muted-foreground">{where}</p>}
                            </div>
                        </div>
                        <Separator />
                        {onSettings !== undefined && <Row icon={Settings} label={words.settings} onSelect={onSettings} />}
                        {onAppearance !== undefined && <Row icon={Palette} label={words.appearance} onSelect={onAppearance} />}
                        {openShortcuts !== undefined && (
                            <Row
                                icon={Keyboard}
                                label={words.shortcuts}
                                keys={keyed ? '?' : undefined}
                                onSelect={openShortcuts}
                                className="max-md:hidden"
                            />
                        )}
                        {extra.map((row) => (
                            <Row key={row.id} icon={row.icon} label={row.label} keys={row.keys} onSelect={row.onSelect} />
                        ))}
                        {scheme !== undefined && onSchemeChange !== undefined && (
                            <>
                                <Separator />
                                <Menu.Group>
                                    <Menu.GroupLabel className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                                        {words.scheme}
                                    </Menu.GroupLabel>
                                    <Menu.RadioGroup value={scheme} onValueChange={(value: Scheme) => onSchemeChange(value)}>
                                        {schemes.map((one) => (
                                            <Menu.RadioItem key={one.value} value={one.value} className={ITEM}>
                                                <one.icon className="size-4 text-muted-foreground" aria-hidden />
                                                {one.label}
                                                <Menu.RadioItemIndicator className="ml-auto flex">
                                                    <Check className="size-4" aria-hidden />
                                                </Menu.RadioItemIndicator>
                                            </Menu.RadioItem>
                                        ))}
                                    </Menu.RadioGroup>
                                </Menu.Group>
                            </>
                        )}
                        {leave !== undefined && (
                            <>
                                <Separator />
                                <Row {...leave} />
                            </>
                        )}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}

/** A row of the menu: a finger's height on a phone, its icon, its words and the keys that do the same. */
const ITEM =
    'flex h-(--density-control) cursor-default items-center gap-2.5 rounded-md px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground max-md:h-finger'

function Row({
    icon: Icon,
    label,
    keys,
    onSelect,
    className,
}: {
    icon?: LucideIcon
    label: string
    keys?: string
    onSelect: () => void
    className?: string
}) {
    return (
        <Menu.Item className={cn(ITEM, className)} onClick={onSelect}>
            {Icon === undefined ? (
                <span className="size-4 shrink-0" aria-hidden />
            ) : (
                <Icon className="size-4 text-muted-foreground" aria-hidden />
            )}
            {label}
            {keys !== undefined && <kbd className="ml-auto font-mono text-xs text-faint">{keys}</kbd>}
        </Menu.Item>
    )
}

function Separator() {
    return <div className="my-1 h-px bg-border" />
}

export interface AccountMenuWords {
    settings: string
    appearance: string
    shortcuts: string
    /** The heading over Light, Dark and System. */
    scheme: string
    light: string
    dark: string
    system: string
    signOut: string
    signIn: string
    account: string
}

const WORDS: AccountMenuWords = {
    settings: 'Settings',
    appearance: 'Appearance',
    shortcuts: 'Keyboard shortcuts',
    scheme: 'Scheme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    signOut: 'Sign out',
    signIn: 'Sign in',
    account: 'Account',
}
