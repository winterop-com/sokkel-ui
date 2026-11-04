import { Menu as MenuIcon } from 'lucide-react'
import { Menu } from '@base-ui/react/menu'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One place the navbar leads to. */
export interface NavLink {
    id: string
    label: string
    href: string
    active?: boolean
}

/**
 * The app's frame along the top, for an app with few places and no rail: the mark and name, the
 * places as links with the current one underlined, and the right-hand controls. On a phone the
 * places fold into a menu.
 */
export function NavBar({
    mark,
    name,
    links,
    end,
    renderLink = (link, className) => (
        <a href={link.href} className={className} aria-current={link.active === true ? 'page' : undefined}>
            {link.label}
        </a>
    ),
    className,
    words = { menu: 'Open the navigation', navigation: 'Main' },
}: {
    mark: ReactNode
    name: string
    links: readonly NavLink[]
    /** What stands at the right end: a search, the theme toggle, the account. */
    end?: ReactNode
    renderLink?: (link: NavLink, className: string) => ReactNode
    className?: string
    words?: { menu: string; navigation: string }
}) {
    return (
        <header className={cn('flex h-shell-top shrink-0 items-stretch gap-4 border-b border-border-strong bg-sidebar px-3', className)}>
            <div className="flex shrink-0 items-center gap-2">
                <Menu.Root>
                    <Menu.Trigger
                        aria-label={words.menu}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden"
                    >
                        <MenuIcon className="size-4" aria-hidden />
                    </Menu.Trigger>
                    <Menu.Portal>
                        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
                            <Menu.Popup className="w-56 rounded-lg border border-border-strong bg-popover p-1 text-popover-foreground shadow-pop">
                                {links.map((link) => (
                                    <Menu.Item
                                        key={link.id}
                                        render={
                                            renderLink(
                                                link,
                                                cn(
                                                    'flex h-9 items-center rounded-md px-2 text-sm outline-none data-[highlighted]:bg-secondary',
                                                    link.active === true && 'font-medium text-primary-ink',
                                                ),
                                            ) as React.ReactElement
                                        }
                                    />
                                ))}
                            </Menu.Popup>
                        </Menu.Positioner>
                    </Menu.Portal>
                </Menu.Root>
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">{mark}</span>
                <span className="truncate text-base font-semibold tracking-tight">{name}</span>
            </div>
            <nav aria-label={words.navigation} className="hidden min-w-0 items-stretch gap-1 md:flex">
                {links.map((link) => (
                    <span key={link.id} className="flex items-stretch">
                        {renderLink(
                            link,
                            cn(
                                'relative flex items-center px-2.5 text-sm transition-colors outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full focus-visible:after:bg-ring',
                                link.active === true
                                    ? 'font-medium text-foreground after:bg-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            ),
                        )}
                    </span>
                ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">{end}</div>
        </header>
    )
}
