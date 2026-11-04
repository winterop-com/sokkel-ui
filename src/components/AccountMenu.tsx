import { Menu } from '@base-ui/react/menu'
import { ChevronsUpDown, Keyboard, LogOut, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The account control in the rail's foot cell: a full-cell row with the initial, the name and a
 * chevron, opening upward into a menu headed by who is signed in and where.
 *
 * Expanded, it fills the cell edge to edge; collapsed, it is the initial alone.
 */
export function AccountMenu({
    name,
    where,
    collapsed = false,
    onSettings,
    onShortcuts,
    onSignOut,
    extra,
    words = { settings: 'Settings', shortcuts: 'Keyboard shortcuts', signOut: 'Sign out', account: 'Account' },
}: {
    name: string
    /** Where they are signed in: a host, an instance, a version, in the code face. */
    where?: string
    collapsed?: boolean
    onSettings?: () => void
    onShortcuts?: () => void
    onSignOut?: () => void
    /** More rows, placed before Sign out. */
    extra?: ReactNode
    words?: { settings: string; shortcuts: string; signOut: string; account: string }
}) {
    const initial = name.slice(0, 1).toUpperCase()
    const avatar = (size: string) => (
        <span
            className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground`}
        >
            {initial}
        </span>
    )
    const item = 'flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-sm outline-none data-[highlighted]:bg-secondary'
    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={words.account}
                className="flex h-full w-full items-center gap-2.5 px-3 text-sm hover:bg-secondary data-[popup-open]:bg-secondary"
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
                        {onShortcuts !== undefined && (
                            <Menu.Item className={item} onClick={onShortcuts}>
                                <Keyboard className="size-4 text-muted-foreground" aria-hidden />
                                {words.shortcuts}
                                <kbd className="ml-auto font-mono text-xs text-faint">?</kbd>
                            </Menu.Item>
                        )}
                        {extra}
                        {onSignOut !== undefined && (
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
