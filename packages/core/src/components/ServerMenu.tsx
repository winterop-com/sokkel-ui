import { ChevronDown, CircleAlert, PlugZap, RefreshCw, ServerCrash } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { StatusColor, StatusMap } from '../lib/status'
import { Dot } from './Dot'
import { relativeTime } from './RelativeTime'
import { useStatus } from './StatusProvider'
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
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * Whether the server answers: it does, it does not, or the app is asking it now; or a state the app
 * names in `states`, such as `degraded`.
 */
export type ServerState = 'up' | 'down' | 'checking' | (string & {})

/** The words a server menu says. */
export interface ServerMenuWords {
    up: string
    down: string
    checking: string
    /** The item that asks the server again. */
    check: string
    /** The trigger's name for a screen reader, before the state. */
    label: string
    /** The tooltip's line saying when the server was last asked, given how long ago in words. */
    checkedAt: (ago: string) => string
}

const WORDS: ServerMenuWords = {
    up: 'Connected',
    down: 'Not answering',
    checking: 'Checking',
    check: 'Check again',
    label: 'Server',
    checkedAt: (ago) => `Checked ${ago}`,
}

/** One thing the app checks on the server, such as a service it depends on. */
export interface ServerCheck {
    name: string
    /** Its state, looked up as the server's own is: in `states`, then up, down and checking, then the run states. */
    state: string
    /** A line after the state, such as how long it took to answer or why it failed. */
    detail?: ReactNode
}

/** The colors a server is well in: a quiet face says nothing while its state is drawn in one of them. */
const WELL: ReadonlySet<StatusColor> = new Set(['good', 'succeeded'])

export interface ServerMenuProps {
    /** What the server is called, such as the deployment's name. */
    name: string
    /** The version it answers with, drawn in the code face beside the name. */
    version?: string
    /** Which deployment it is, such as `production` or `staging`, said beside the name in the tooltip and the menu. */
    environment?: string
    /** `up`, `down`, `checking`, or a state named in `states`. */
    state: ServerState
    /**
     * The app's own states with their words and colors, such as `degraded` in warning and `unhealthy`
     * in critical; one named `up`, `down` or `checking` changes that state's words or color.
     */
    states?: StatusMap
    /**
     * A face that is the dot alone while the server is well (its state drawn good or succeeded) or
     * being asked, and the dot with the state's words when it is not. The name and the version stay
     * in the menu and in the face's accessible name.
     */
    quiet?: boolean
    /**
     * Every check behind the state, each with its dot, name, state and detail, listed in a tooltip on
     * the face, under a head with the name, the environment and the version, and in the menu.
     */
    checks?: readonly ServerCheck[]
    /** When the server was last asked, said in the tooltip relative to `now`, "Checked 2 minutes ago". */
    checkedAt?: Date | number
    /** The moment `checkedAt` is said against; without it, the clock as the tooltip opens. */
    now?: Date
    /** The locale the time is said in; without it, the reader's. */
    locale?: string
    /**
     * Called as the tooltip opens, while the server is not being asked already, so the app can ask
     * again and the tooltip shows a fresh answer.
     */
    recheck?: () => void
    /**
     * Pressing the face calls this in place of opening the menu, as for an app that opens its own
     * pane about the server; the menu, and with it `facts`, `onCheck` and `children`, is not drawn.
     */
    onPress?: () => void
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
 *
 * `states` adds the app's own states, such as degraded and unhealthy; `quiet` draws a face that is a
 * silent dot until something is wrong; `checks` lists every check behind the state in a tooltip on
 * the face and in the menu, the tooltip headed by the name, `environment` and version and, given
 * `checkedAt`, when the server was last asked; `recheck` lets the app ask again as the tooltip
 * opens; and `onPress` makes the face a button that calls the app, in place of
 * the menu.
 */
export function ServerMenu({
    name,
    version,
    state,
    states,
    environment,
    quiet = false,
    checks = [],
    checkedAt,
    now,
    locale,
    recheck,
    onPress,
    facts = [],
    onCheck,
    children,
    defaultOpen,
    className,
    words: given,
}: ServerMenuProps) {
    const words = { ...WORDS, ...given }
    const known: StatusMap = {
        up: { label: words.up, color: 'succeeded' },
        down: { label: words.down, color: 'failed' },
        checking: { label: words.checking, color: 'skipped', live: true },
        ...states,
    }
    const look = useStatus(state, known)
    const said = look.label
    const checking = state === 'checking'
    const well = WELL.has(look.color)
    const wrong = !well && !look.live
    const Icon = checking ? RefreshCw : state === 'down' ? ServerCrash : well ? PlugZap : CircleAlert
    const face = (
        <>
            <Dot color={look.css} className={cn(look.live && 'animate-pulse')} say={quiet && wrong ? said : undefined} />
            {!quiet && <span className="min-w-0 truncate max-md:hidden">{name}</span>}
            {!quiet && version !== undefined && (
                <Badge variant="secondary" className="font-mono">
                    {version}
                </Badge>
            )}
            {!quiet && onPress === undefined && <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
        </>
    )
    const buttonProps = {
        variant: 'ghost',
        size: 'sm',
        'aria-label': `${words.label}: ${name}${version === undefined ? '' : ` ${version}`}, ${said}`,
        onClick: onPress,
        className: cn('min-w-0 gap-2 px-2', className),
    } as const
    const button = <Button {...buttonProps} />
    const tip = checks.length > 0 || checkedAt !== undefined
    const tipped = (trigger: ReactNode) =>
        !tip ? (
            trigger
        ) : (
            <Tooltip
                onOpenChange={(open) => {
                    if (open && !checking) recheck?.()
                }}
            >
                {trigger}
                <TooltipContent side="bottom" align="end" className="flex max-w-sm flex-col items-stretch gap-1.5">
                    <TipHead
                        name={name}
                        environment={environment}
                        version={version}
                        checkedAt={checkedAt}
                        now={now}
                        locale={locale}
                        words={words}
                    />
                    {checks.length > 0 && <CheckList checks={checks} states={known} />}
                </TooltipContent>
            </Tooltip>
        )
    if (onPress !== undefined)
        return tipped(!tip ? <Button {...buttonProps}>{face}</Button> : <TooltipTrigger render={button}>{face}</TooltipTrigger>)
    return (
        <DropdownMenu defaultOpen={defaultOpen}>
            {tipped(
                !tip ? (
                    <DropdownMenuTrigger render={button}>{face}</DropdownMenuTrigger>
                ) : (
                    <TooltipTrigger render={<DropdownMenuTrigger render={button} />}>{face}</TooltipTrigger>
                ),
            )}
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Icon aria-hidden className={cn('size-4 shrink-0', checking && 'animate-spin')} />
                        {said}
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <div className="flex flex-col gap-1 px-2 pb-1.5 text-help text-muted-foreground">
                    <span className="font-medium text-foreground">
                        {name}
                        {environment !== undefined && <span className="ml-1.5 font-normal text-muted-foreground">{environment}</span>}
                        {quiet && version !== undefined && (
                            <span className="ml-1.5 font-mono font-normal text-muted-foreground">{version}</span>
                        )}
                    </span>
                    {facts.map((fact, index) => (
                        <span key={index}>{fact}</span>
                    ))}
                </div>
                {checks.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-help">
                            <CheckList checks={checks} states={known} />
                        </div>
                    </>
                )}
                {(onCheck !== undefined || children !== undefined) && <DropdownMenuSeparator />}
                {onCheck !== undefined && (
                    <DropdownMenuItem closeOnClick={false} disabled={checking} onClick={onCheck}>
                        <RefreshCw aria-hidden className={cn(checking && 'animate-spin')} />
                        {checking ? words.checking : words.check}
                    </DropdownMenuItem>
                )}
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** The tooltip's head: the name, the environment and the version on a line, and when the server was last asked under it. */
function TipHead({
    name,
    environment,
    version,
    checkedAt,
    now,
    locale,
    words,
}: {
    name: string
    environment?: string
    version?: string
    checkedAt?: Date | number
    now?: Date
    locale?: string
    words: ServerMenuWords
}) {
    const when = checkedAt === undefined ? undefined : new Date(checkedAt)
    return (
        <div className="flex min-w-0 flex-col">
            <p className="flex min-w-0 items-baseline gap-1.5">
                <span className="min-w-0 truncate font-medium">{name}</span>
                {environment !== undefined && <span className="opacity-80">{environment}</span>}
                {version !== undefined && <span className="font-mono opacity-80">{version}</span>}
            </p>
            {when !== undefined && !Number.isNaN(when.getTime()) && (
                <p className="opacity-80">
                    <time dateTime={when.toISOString()}>{words.checkedAt(relativeTime(when, now ?? new Date(), { locale }))}</time>
                </p>
            )}
        </div>
    )
}

/** The checks, one a line: the dot in its state's color, the name, the state's words and the detail. */
function CheckList({ checks, states }: { checks: readonly ServerCheck[]; states: StatusMap }) {
    return (
        <ul className="flex flex-col gap-1">
            {checks.map((check, index) => (
                <CheckLine key={`${check.name}-${index}`} check={check} states={states} />
            ))}
        </ul>
    )
}

function CheckLine({ check, states }: { check: ServerCheck; states: StatusMap }) {
    const look = useStatus(check.state, states)
    return (
        <li className="flex min-w-0 items-center gap-2">
            <Dot color={look.css} size="md" className={cn(look.live && 'animate-pulse')} />
            <span className="font-medium">{check.name}</span>
            <span className="opacity-80">{look.label}</span>
            {check.detail !== undefined && <span className="min-w-0 truncate opacity-80">{check.detail}</span>}
        </li>
    )
}
