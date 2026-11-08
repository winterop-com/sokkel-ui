import { Avatar } from '@base-ui/react/avatar'
import { Menu } from '@base-ui/react/menu'
import { ChevronsUpDown, Keyboard, LogOut, Palette, Settings, User } from 'lucide-react'
import { useContext, type ReactNode } from 'react'

import { useShortcutsKey } from '../hooks/use-shortcuts-key'
import { cn } from '../lib/cn'
import { ShellDrawer } from './shell-context'

/**
 * The account control in the rail's foot cell: a full-cell row with the initial, the name and a
 * chevron, opening upward into a menu headed by who is signed in and where. Given `image`, the
 * picture takes the initial's place once it has loaded; until then, or when it fails, the initial
 * stays.
 *
 * Expanded, it fills the cell edge to edge; collapsed, it is the picture or the initial alone. In
 * the shell's drawer on a narrow window it is drawn expanded, as the rail there is, and a row
 * chosen in its menu closes the drawer before it runs.
 *
 * Every app has it in the rail's foot, before it has sign-in too: then it is `local`, named for
 * the local user or as "Local", with a neutral figure for the avatar and no sign-out, so the place
 * is held and the frame looks the same in every app.
 */
export function AccountMenu({
    name,
    image,
    where,
    collapsed: kept = false,
    local = false,
    onSettings,
    onAppearance,
    onShortcuts,
    onSignOut,
    extra,
    words: given,
}: {
    name: string
    /** The person's picture, drawn over the initial once it has loaded. */
    image?: string
    /** Where they are signed in: a host, an instance, a version, in the code face. */
    where?: string
    collapsed?: boolean
    /** No one is signed in: the avatar is a neutral figure in place of an initial or picture, and there is no sign-out. */
    local?: boolean
    onSettings?: () => void
    /** Opens the appearance settings: the theme, the scheme, the density. */
    onAppearance?: () => void
    /** Opens the keyboard shortcuts, from the menu and on `?` outside a field. */
    onShortcuts?: () => void
    onSignOut?: () => void
    /** More rows, placed before Sign out. */
    extra?: ReactNode
    words?: Partial<AccountMenuWords>
}) {
    const words = { ...WORDS, ...given }
    const drawer = useContext(ShellDrawer)
    const collapsed = kept && drawer === undefined
    // The `?` beside Keyboard shortcuts works: it opens them from anywhere outside a field.
    useShortcutsKey(onShortcuts)
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
    const item =
        'flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'
    return (
        <Menu.Root
            // A row chosen in the shell's drawer closes the drawer too, so what it opens is not drawn under it.
            onOpenChange={(open, details) => {
                if (!open && details.reason === 'item-press') drawer?.close()
            }}
        >
            <Menu.Trigger
                aria-label={words.account}
                className="mx-1.5 my-1 flex h-[calc(100%-0.5rem)] w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-md pr-1.5 pl-2.5 text-sm outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 data-[popup-open]:bg-hover"
            >
                {avatar('size-6')}
                {!collapsed && (
                    <>
                        <span className="min-w-0 flex-1 truncate text-left font-medium">{name}</span>
                        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </>
                )}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="top" align="start" sideOffset={4} alignOffset={4}>
                    <Menu.Popup className="w-64 rounded-lg border border-border-strong bg-popover p-1 text-popover-foreground shadow-pop">
                        <div className="flex items-center gap-2.5 px-2 py-2">
                            {avatar('size-8')}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{name}</p>
                                {where !== undefined && <p className="truncate font-mono text-xs text-muted-foreground">{where}</p>}
                            </div>
                        </div>
                        <div className="my-1 h-px bg-border" />
                        {onSettings !== undefined && (
                            <Menu.Item className={item} onClick={onSettings}>
                                <Settings className="size-4 text-muted-foreground" aria-hidden />
                                {words.settings}
                            </Menu.Item>
                        )}
                        {onAppearance !== undefined && (
                            <Menu.Item className={item} onClick={onAppearance}>
                                <Palette className="size-4 text-muted-foreground" aria-hidden />
                                {words.appearance}
                            </Menu.Item>
                        )}
                        {onShortcuts !== undefined && (
                            <Menu.Item className={item} onClick={onShortcuts}>
                                <Keyboard className="size-4 text-muted-foreground" aria-hidden />
                                {words.shortcuts}
                                <kbd className="ml-auto font-mono text-xs text-faint">?</kbd>
                            </Menu.Item>
                        )}
                        {extra}
                        {!local && onSignOut !== undefined && (
                            <>
                                <div className="my-1 h-px bg-border" />
                                <Menu.Item className={item} onClick={onSignOut}>
                                    <LogOut className="size-4 text-muted-foreground" aria-hidden />
                                    {words.signOut}
                                </Menu.Item>
                            </>
                        )}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}

export interface AccountMenuWords {
    settings: string
    appearance: string
    shortcuts: string
    signOut: string
    account: string
}

const WORDS: AccountMenuWords = {
    settings: 'Settings',
    appearance: 'Appearance',
    shortcuts: 'Keyboard shortcuts',
    signOut: 'Sign out',
    account: 'Account',
}
