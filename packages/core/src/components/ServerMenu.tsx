import { ChevronDown, PlugZap, RefreshCw, ServerCrash } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Dot } from './Dot'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

/** Whether the server answers: it does, it does not, or the app is asking it now. */
export type ServerState = 'up' | 'down' | 'checking'

/** The words a server menu says. */
export interface ServerMenuWords {
    up: string
    down: string
    checking: string
    /** The item that asks the server again. */
    check: string
    /** The trigger's name for a screen reader, before the state. */
    label: string
}

const WORDS: ServerMenuWords = {
    up: 'Connected',
    down: 'Not answering',
    checking: 'Checking',
    check: 'Check again',
    label: 'Server',
}

/** Each state's dot, in the run states' colors. */
const DOT: Record<ServerState, string> = {
    up: 'var(--status-succeeded)',
    down: 'var(--status-failed)',
    checking: 'var(--status-skipped)',
}

const ICON = { up: PlugZap, down: ServerCrash, checking: RefreshCw } as const

export interface ServerMenuProps {
    /** What the server is called, such as the deployment's name. */
    name: string
    /** The version it answers with, drawn in the code face beside the name. */
    version?: string
    state: ServerState
    /** Lines under the name in the menu: its address, what it serves, how it stores. */
    facts?: readonly ReactNode[]
    /** Asks the server again; adds Check again to the menu, its icon turning while `checking`. */
    onCheck?: () => void
    /** The app's own items after Check again, as `DropdownMenuItem`s, such as a link to a page about the server. */
    children?: ReactNode
    /** Whether the menu starts open. */
    defaultOpen?: boolean
    className?: string
    words?: Partial<ServerMenuWords>
}

/**
 * The server an app talks to, for the top bar's actions: a dot in the state's color (pulsing while
 * the app asks), the server's name and its version in the code face, opening a menu that says the
 * state in words with the server's facts under it, Check again, and the app's own items. On a phone
 * the name gives way and the dot and the version stay.
 */
export function ServerMenu({ name, version, state, facts = [], onCheck, children, defaultOpen, className, words: given }: ServerMenuProps) {
    const words = { ...WORDS, ...given }
    const said = words[state]
    const Icon = ICON[state]
    return (
        <DropdownMenu defaultOpen={defaultOpen}>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${words.label}: ${name}, ${said}`}
                        className={cn('min-w-0 gap-2 px-2', className)}
                    />
                }
            >
                <Dot color={DOT[state]} className={cn(state === 'checking' && 'animate-pulse')} />
                <span className="min-w-0 truncate max-md:hidden">{name}</span>
                {version !== undefined && (
                    <Badge variant="secondary" className="font-mono">
                        {version}
                    </Badge>
                )}
                <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Icon aria-hidden className={cn('size-4 shrink-0', state === 'checking' && 'animate-spin')} />
                        {said}
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <div className="flex flex-col gap-1 px-2 pb-1.5 text-help text-muted-foreground">
                    <span className="font-medium text-foreground">{name}</span>
                    {facts.map((fact, index) => (
                        <span key={index}>{fact}</span>
                    ))}
                </div>
                {(onCheck !== undefined || children !== undefined) && <DropdownMenuSeparator />}
                {onCheck !== undefined && (
                    <DropdownMenuItem closeOnClick={false} disabled={state === 'checking'} onClick={onCheck}>
                        <RefreshCw aria-hidden className={cn(state === 'checking' && 'animate-spin')} />
                        {state === 'checking' ? words.checking : words.check}
                    </DropdownMenuItem>
                )}
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
