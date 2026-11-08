import { ArrowRight, CircleAlert, Eye, EyeOff, Globe, KeyRound, Lock, User } from 'lucide-react'
import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { useThemeName } from '../hooks/use-theme-name'
import { cn } from '../lib/cn'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
import { useDesktopFullscreen } from '../lib/fullscreen'
import { CheckboxField } from './CheckboxField'
import { Field } from './Field'
import { ResizeHandle } from './ResizeHandle'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './ui/input-group'
import { Spinner } from './ui/spinner'

/** What a person typed to sign in; the fields the form does not ask for stay empty. */
export interface SignInValues {
    server: string
    user: string
    password: string
    token: string
    /** Whether the person asked to be remembered: the app keeps the session longer, and with `rememberKey` the form fills in the username next time. */
    remember: boolean
}

/** A small fact under the brand: the instance, the version. */
export interface SignInFact {
    label: ReactNode
    value: ReactNode
}

/** What asking a server address found, for the brand pane to say before anyone signs in. */
export interface SignInProbe {
    /** The address asked: the one typed, or the one found. */
    server: string
    /** `asking` until an answer comes, `answered` once the server has, `silent` when nothing answered at the address. */
    state: 'asking' | 'answered' | 'silent'
    /** The version the server answered with. */
    version?: ReactNode
}

/** What may be left empty: the password alone, or the credentials altogether, for a server that needs none. */
export type SignInOptional = 'password' | 'credentials'

export interface SignInWords {
    title: string
    server: string
    serverHint: string
    user: string
    /** A placeholder in the username field; none by default, as the label names it. */
    userHint: string
    password: string
    /** A placeholder in the password field; none by default. */
    passwordHint: string
    token: string
    tokenHint: string
    /** Beside the label of a field that may be left empty. */
    optional: string
    show: string
    hide: string
    remember: string
    submit: string
    busy: string
    or: string
    seam: string
    /** The server line while a server is looked for. */
    looking: string
    /** The server line's link once a server is found, which brings the field back. */
    changeServer: string
    /** The brand pane's label for the address a probe asked. */
    probeServer: string
    /** The brand pane's label for what the server answered. */
    probeVersion: string
    /** What the brand pane says while the address is asked. */
    asking: string
    /** What the brand pane says when nothing answered at the address. */
    noAnswer: string
}

const WORDS: SignInWords = {
    title: 'Sign in',
    server: 'Server',
    serverHint: 'https://example.org',
    user: 'Username',
    userHint: '',
    password: 'Password',
    passwordHint: '',
    token: 'Access token',
    tokenHint: 'Paste your token',
    optional: 'optional',
    show: 'Show the password',
    hide: 'Hide the password',
    remember: 'Remember me',
    submit: 'Sign in',
    busy: 'Signing in',
    or: 'or',
    seam: 'Brand pane width',
    looking: 'Looking for a server',
    changeServer: 'Connect to a different server',
    probeServer: 'server',
    probeVersion: 'version',
    asking: 'asking',
    noAnswer: 'no answer',
}

const EMPTY: SignInValues = { server: '', user: '', password: '', token: '', remember: false }

/** The narrowest the brand pane is dragged to, and the room the form keeps beside it. */
const BRAND_MIN = 320
const FORM_ROOM = 480

/** What the form asks for: the way in, whether a server address is typed, and what may be left empty. */
export interface SignInAsks {
    method: 'password' | 'token'
    /** The server field is shown, so an address must be typed. */
    server: boolean
    optional?: SignInOptional
}

/** Whether the fields the form asks for are filled, so it can be sent. */
export function signInReady(values: SignInValues, { method, server, optional }: SignInAsks): boolean {
    if (server && values.server.trim() === '') return false
    if (optional === 'credentials') return true
    if (method === 'token') return values.token.trim() !== ''
    return values.user.trim() !== '' && (optional === 'password' || values.password !== '')
}

/** The username kept under `key` in this browser, or empty; storage that refuses answers empty. */
export function rememberedUser(key: string): string {
    try {
        return localStorage.getItem(key) ?? ''
    } catch {
        return ''
    }
}

/** Keeps the username under `key` for the next visit; an empty one forgets it. Storage that refuses is let be. */
export function rememberUser(key: string, user: string): void {
    try {
        if (user === '') localStorage.removeItem(key)
        else localStorage.setItem(key, user)
    } catch {
        // Storage refused: the form still works, only the next visit's prefill is lost.
    }
}

/** A text input with an icon at its start, when given, and, for a secret, a button at its end that shows it. */
function IconInput({
    id,
    label,
    icon,
    value,
    onChange,
    placeholder,
    type = 'text',
    secret = false,
    mono = false,
    optional = false,
    autoFocus,
    autoComplete,
    disabled,
    words,
}: {
    id: string
    label: string
    icon: ReactNode
    value: string
    onChange: (value: string) => void
    placeholder: string
    type?: string
    secret?: boolean
    mono?: boolean
    optional?: boolean
    autoFocus?: boolean
    autoComplete?: string
    disabled: boolean
    words: SignInWords
}) {
    const [shown, setShown] = useState(false)
    return (
        <Field id={id} label={label} hint={optional ? words.optional : undefined}>
            <InputGroup className="h-11">
                {icon !== null && <InputGroupAddon className="pl-3.5">{icon}</InputGroupAddon>}
                <InputGroupInput
                    id={id}
                    type={secret && !shown ? 'password' : type}
                    value={value}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    spellCheck={mono || secret ? false : undefined}
                    className={cn('h-full', icon === null ? 'pl-3.5' : 'pl-2', mono && 'font-mono')}
                    onChange={(event) => onChange(event.target.value)}
                />
                {secret && (
                    <InputGroupAddon align="inline-end" className="pr-2">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label={shown ? words.hide : words.show}
                            aria-pressed={shown}
                            disabled={disabled}
                            onClick={() => setShown(!shown)}
                        >
                            {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
            </InputGroup>
        </Field>
    )
}

export interface SignInProps {
    /** The app's mark, drawn in the current ink. */
    mark?: ReactNode
    /** Sets the mark on a tile of the primary ground; turn it off for a mark in its own colors. */
    markTile?: boolean
    name: string
    /** The picture over the brand pane's upper part; decorative, left out on a phone. */
    art?: ReactNode
    facts?: readonly SignInFact[]
    /** The brand pane's width in a wide room, as a CSS length or share. */
    brandWidth?: string
    /** `dark` draws the brand pane in the theme's dark tokens in either scheme; `page` follows the page. */
    brandScheme?: 'dark' | 'page'
    resizable?: boolean
    reveal?: boolean
    /** A short line over the title in the primary ink, such as "Welcome to" and the app's name. */
    eyebrow?: ReactNode
    /** A line under the title. */
    description?: ReactNode
    method?: 'password' | 'token'
    /**
     * The server's address over the credentials: `true` asks for it in a field; `looking` says a
     * server is being looked for in the field's place and holds the submit; `found` puts a link to
     * connect to a different server there, which brings the field back.
     */
    server?: boolean | 'looking' | 'found'
    /** Called as the link to a different server is pressed, the field shown either way. */
    onChangeServer?: () => void
    /** What asking the server's address found, said at the top of the brand pane's facts and in the phone's bar. */
    probe?: SignInProbe
    /** What may be left empty, marked so beside its label: the password, or the credentials altogether. */
    optional?: SignInOptional
    /** Draws an icon at the start of each field: a globe, a person, a lock or a key. */
    icons?: boolean
    /** Offers a "Remember me" box. Its answer reaches `onSubmit` as `values.remember`, for the app to keep the session longer; with `rememberKey` the form also keeps the username. */
    remember?: boolean
    /** The local storage key the username is kept under in this browser; it fills the form's own values, never `values`. */
    rememberKey?: string
    /** The app's own fields, in place of the username and password or the token. */
    children?: ReactNode
    /**
     * Whether the form may be sent besides the fields it asks for being filled, such as once a typed
     * address has answered; with `children`, whether the app's own fields are filled.
     */
    ready?: boolean
    /** The values the form starts with when it holds its own. */
    defaultValues?: Partial<SignInValues>
    /** The values, held by the app with `onValuesChange`; the form holds its own when absent. */
    values?: SignInValues
    /** Called with every change to the values, held by the app or by the form, such as to ask a server address as it is typed. */
    onValuesChange?: (values: SignInValues) => void
    error?: ReactNode
    busy?: boolean
    onSubmit: (values: SignInValues) => void
    /** Other ways in, as buttons; each is drawn full width under the rule. */
    alternatives?: ReactNode
    /** A line under the form, such as who to ask for an account. */
    footer?: ReactNode
    /** The desktop window the screen stands in, when its native title bar is hidden; leave it off in a browser. */
    desktop?: DesktopWindow
    className?: string
    words?: Partial<SignInWords>
}

/**
 * A sign-in screen in two panes the window's height. The brand pane holds `art` over its upper
 * part (`LevelBars` and `FlowLines` ship with the library, or the app's own picture), the `mark`
 * and `name` large at its foot, and a few `facts` under them, such as the instance and the
 * version. It is dark in every scheme, in the theme's own dark tokens, unless `brandScheme` is
 * `page`. The form pane, centered, opens with an `eyebrow` in the primary ink, the title and a
 * `description`, then the fields: a username and password with the password's show button, or one
 * token field (`method`), or the app's own fields as `children`, each field led by an icon unless
 * `icons` is off. `optional` lets the password, or every credential, be left empty, for a server
 * that needs none. `error` says why the last try was refused, over the submit; `busy` holds the form
 * while a try is under way. `alternatives` are other ways in, under a rule with "or", drawn full
 * width.
 *
 * A `server` address stands above the credentials. Where the app finds the server itself, the
 * field's place says it is looking (`server="looking"`), and once found (`found`) offers a link to
 * connect to a different server instead, which brings the field back. `values` with
 * `onValuesChange` hold the fields from outside, or `onValuesChange` alone follows them, so the app
 * can ask an address as it is typed; `probe` says what answered there, the server's version or
 * that nothing did, in the brand pane, and `ready` can hold the submit until it has.
 *
 * `remember` adds a "Remember me" box whose answer reaches `onSubmit`, for the app to keep the
 * session longer than the browser's. `rememberKey` keeps the username in this browser under that
 * key and fills it in next time, only when the box is ticked if there is one. The password is never
 * kept by the form: the fields name themselves for the browser's password manager, which keeps it. `resizable` puts a seam between the panes to drag
 * the brand pane's width, from `brandWidth` (half by default), double click putting it back.
 * `reveal` lets the form's parts rise into place as the screen opens, held still when motion is
 * reduced.
 *
 * It answers to its own width: in a narrow room, as on a phone, the brand pane becomes a bar over
 * the form with the mark, the name and the first fact's value, and the art is left out; the bar
 * stands on the same ground as the wide pane, so the brand reads alike at every width.
 *
 * With `desktop`, in a desktop window whose native title bar is hidden, the brand pane (or the
 * bar) drags the window, and `trafficLights` leaves room at the bar's start for the window's
 * buttons; the wide pane's own inset already clears them.
 */
export function SignIn({
    mark,
    markTile = true,
    name,
    art,
    facts = [],
    brandWidth = '50%',
    brandScheme = 'dark',
    resizable = false,
    reveal = true,
    eyebrow,
    description,
    method = 'password',
    server = false,
    onChangeServer,
    probe,
    optional,
    icons = true,
    remember = false,
    rememberKey,
    children,
    ready: readyGiven,
    defaultValues,
    values: valuesGiven,
    onValuesChange,
    error,
    busy = false,
    onSubmit,
    alternatives,
    footer,
    desktop,
    className,
    words: given,
}: SignInProps) {
    const words = { ...WORDS, ...given }
    const id = useId()
    const theme = useThemeName()
    const root = useRef<HTMLDivElement>(null)
    const brand = useRef<HTMLElement>(null)
    const [dragged, setDragged] = useState<number | null>(null)
    const [own, setOwn] = useState<SignInValues>(() => {
        const kept = rememberKey === undefined ? '' : rememberedUser(rememberKey)
        return { ...EMPTY, ...(kept === '' ? {} : { user: kept, remember: true }), ...defaultValues }
    })
    const values = valuesGiven ?? own
    const change = (next: Partial<SignInValues>) => {
        const changed = { ...values, ...next }
        if (valuesGiven === undefined) setOwn(changed)
        onValuesChange?.(changed)
    }
    const set = (key: 'server' | 'user' | 'password' | 'token') => (value: string) => change({ [key]: value })
    /** The link to a different server was pressed; a new `server` from the app starts over. */
    const [asked, setAsked] = useState(false)
    const [askedFor, setAskedFor] = useState(server)
    if (askedFor !== server) {
        setAskedFor(server)
        setAsked(false)
    }
    const serverField = server === true || (server === 'found' && asked)
    const credentialsOptional = optional === 'credentials'
    const filled =
        (children === undefined
            ? signInReady(values, { method, server: serverField, optional })
            : !serverField || values.server.trim() !== '') &&
        (readyGiven ?? true)
    const ready = filled && server !== 'looking' && !busy
    const failed = error !== undefined && error !== null && error !== false
    const firstFact = facts[0]
    const icon = (node: ReactNode) => (icons ? node : null)
    /** What the probe heard, as the brand pane and the phone's bar say it. */
    const heard =
        probe === undefined ? undefined : probe.state === 'asking' ? (
            <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-3" aria-hidden />
                {words.asking}
            </span>
        ) : probe.state === 'silent' ? (
            <span className="text-critical-ink">{words.noAnswer}</span>
        ) : (
            probe.version
        )
    const shownFacts: SignInFact[] =
        probe === undefined
            ? [...facts]
            : [
                  { label: words.probeServer, value: probe.server },
                  ...(heard === undefined || heard === null ? [] : [{ label: words.probeVersion, value: heard }]),
                  ...facts,
              ]
    const dark = brandScheme === 'dark'
    const drag = desktop === undefined ? undefined : ''
    const lights = useTrafficLights(desktop)
    useDesktopFullscreen(desktop)
    const maxBrand = () => Math.max(BRAND_MIN, (root.current?.offsetWidth ?? BRAND_MIN + FORM_ROOM) - FORM_ROOM)

    /** Each part of the form rises a beat after the one before. */
    const rise = (step: number): { className?: string; style?: CSSProperties } =>
        reveal ? { className: 'animate-[rise-in_420ms_ease-out_both]', style: { animationDelay: `${String(step * 60)}ms` } } : {}

    const markBox = (size: 'large' | 'small') =>
        mark === undefined ? null : (
            <span
                className={cn(
                    'flex shrink-0 items-center justify-center',
                    markTile && 'rounded-surface bg-primary text-primary-foreground',
                    size === 'large' ? 'size-18 [&_svg]:size-10' : 'size-10 [&_svg]:size-6',
                )}
            >
                {mark}
            </span>
        )

    /** The brand's ground, dark in every scheme when asked, in the document's theme; the wide pane and the phone's bar alike. */
    const ground = (node: ReactNode, wrap: string) =>
        dark ? (
            <div className={cn('dark scheme-dark', wrap)}>
                <div data-theme-scope={theme} className="flex size-full bg-brand-ground text-foreground">
                    {node}
                </div>
            </div>
        ) : (
            <div className={cn('flex bg-brand-ground text-foreground', wrap)}>{node}</div>
        )

    return (
        <div
            ref={root}
            data-slot="sign-in"
            className={cn('@container flex min-h-svh w-full bg-background text-foreground', className)}
            style={
                { ...trafficLightsStyle(desktop), '--brand-width': dragged === null ? brandWidth : `${String(dragged)}px` } as CSSProperties
            }
            onMouseDown={windowPressHandler(desktop)}
        >
            <div className="flex w-full flex-1 flex-col @3xl:flex-row">
                {ground(
                    <header
                        data-window-drag={drag}
                        className={cn(
                            'flex w-full items-center gap-3 border-b border-border px-5 py-4',
                            lights && 'ps-(--spacing-traffic-lights)',
                        )}
                    >
                        {markBox('small')}
                        <span className="min-w-0 truncate text-detail-title">{name}</span>
                        {/* The fact takes only the room the name leaves, so the name is cut short last. */}
                        {probe !== undefined ? (
                            <span className="flex min-w-0 flex-1 basis-0 items-baseline justify-end gap-2 font-mono text-xs text-muted-foreground">
                                <span className="min-w-0 truncate">{probe.server}</span>
                                {heard !== undefined && heard !== null && <span className="shrink-0">{heard}</span>}
                            </span>
                        ) : (
                            firstFact !== undefined && (
                                <span className="min-w-0 flex-1 basis-0 truncate text-right font-mono text-xs text-muted-foreground">
                                    {firstFact.value}
                                </span>
                            )
                        )}
                    </header>,
                    'shrink-0 @3xl:hidden',
                )}
                <aside
                    ref={brand}
                    data-window-drag={drag}
                    className="hidden shrink-0 @3xl:flex @3xl:w-(--brand-width) @3xl:max-w-[calc(100%-30rem)] @3xl:min-w-80"
                >
                    {ground(
                        <div className="flex size-full flex-col gap-10 p-12">
                            <div className="flex min-h-0 flex-1 items-end">{art}</div>
                            <div className="flex flex-col gap-8">
                                <div className="flex min-w-0 items-center gap-5">
                                    {markBox('large')}
                                    <span className="min-w-0 text-brand-name wrap-break-word">{name}</span>
                                </div>
                                {shownFacts.length > 0 && (
                                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-10 gap-y-1">
                                        {shownFacts.map((fact, index) => (
                                            <div key={index} className="contents">
                                                <dt className="text-help text-muted-foreground">{fact.label}</dt>
                                                <dd className="min-w-0 truncate font-mono text-xs leading-5">{fact.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </div>
                        </div>,
                        'size-full',
                    )}
                </aside>
                {resizable && (
                    <ResizeHandle
                        target={brand}
                        size={dragged ?? undefined}
                        onSize={setDragged}
                        min={BRAND_MIN}
                        max={maxBrand()}
                        onReset={() => setDragged(null)}
                        label={words.seam}
                        className="hidden @3xl:block"
                    />
                )}
                <main className="flex min-w-0 flex-1 justify-start px-5 py-8 @3xl:items-center @3xl:justify-center @3xl:p-12">
                    <form
                        className="flex w-full max-w-md flex-col gap-5"
                        aria-busy={busy}
                        onSubmit={(event) => {
                            event.preventDefault()
                            if (!ready) return
                            if (rememberKey !== undefined) rememberUser(rememberKey, !remember || values.remember ? values.user.trim() : '')
                            onSubmit(values)
                        }}
                    >
                        <div className={cn('flex flex-col gap-1.5', rise(0).className)} style={rise(0).style}>
                            {eyebrow !== undefined && <p className="text-eyebrow text-primary-ink uppercase">{eyebrow}</p>}
                            <h1 className="text-welcome-title">{words.title}</h1>
                            {description !== undefined && <p className="text-sm text-muted-foreground">{description}</p>}
                        </div>
                        <div className={cn('flex flex-col gap-4', rise(1).className)} style={rise(1).style}>
                            {serverField && (
                                <IconInput
                                    id={`${id}-server`}
                                    label={words.server}
                                    icon={icon(<Globe aria-hidden />)}
                                    type="url"
                                    mono
                                    autoFocus={asked}
                                    autoComplete="url"
                                    placeholder={words.serverHint}
                                    value={values.server}
                                    onChange={set('server')}
                                    disabled={busy}
                                    words={words}
                                />
                            )}
                            {server === 'looking' && (
                                <p role="status" className="flex items-center gap-2 text-help text-muted-foreground">
                                    <Spinner className="size-3.5" aria-hidden />
                                    {words.looking}
                                </p>
                            )}
                            {server === 'found' && !asked && (
                                <p className="flex text-help">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        className="rounded-mini text-primary-ink underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                        onClick={() => {
                                            setAsked(true)
                                            onChangeServer?.()
                                        }}
                                    >
                                        {words.changeServer}
                                    </button>
                                </p>
                            )}
                            {children ??
                                (method === 'token' ? (
                                    <IconInput
                                        id={`${id}-token`}
                                        label={words.token}
                                        icon={icon(<KeyRound aria-hidden />)}
                                        secret
                                        mono
                                        optional={credentialsOptional}
                                        autoComplete="current-password"
                                        placeholder={words.tokenHint}
                                        value={values.token}
                                        onChange={set('token')}
                                        disabled={busy}
                                        words={words}
                                    />
                                ) : (
                                    <>
                                        <IconInput
                                            id={`${id}-user`}
                                            label={words.user}
                                            icon={icon(<User aria-hidden />)}
                                            optional={credentialsOptional}
                                            autoComplete="username"
                                            placeholder={words.userHint}
                                            value={values.user}
                                            onChange={set('user')}
                                            disabled={busy}
                                            words={words}
                                        />
                                        <IconInput
                                            id={`${id}-password`}
                                            label={words.password}
                                            icon={icon(<Lock aria-hidden />)}
                                            secret
                                            optional={optional !== undefined}
                                            autoComplete="current-password"
                                            placeholder={words.passwordHint}
                                            value={values.password}
                                            onChange={set('password')}
                                            disabled={busy}
                                            words={words}
                                        />
                                    </>
                                ))}
                            {remember && (
                                <CheckboxField
                                    label={words.remember}
                                    checked={values.remember}
                                    onCheckedChange={(checked) => change({ remember: checked })}
                                    disabled={busy}
                                />
                            )}
                        </div>
                        <div className={cn('flex flex-col gap-3', rise(2).className)} style={rise(2).style}>
                            {failed && (
                                <Alert variant="destructive">
                                    <CircleAlert aria-hidden />
                                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                                </Alert>
                            )}
                            <Button type="submit" size="lg" disabled={!ready} className="h-11 w-full">
                                {busy && <Spinner data-icon="inline-start" />}
                                {busy ? words.busy : words.submit}
                                {!busy && <ArrowRight data-icon="inline-end" aria-hidden />}
                            </Button>
                        </div>
                        {alternatives !== undefined && (
                            <div className={cn('flex flex-col gap-5', rise(3).className)} style={rise(3).style}>
                                <div className="flex items-center gap-3 text-help text-muted-foreground">
                                    <span className="h-px flex-1 bg-border" />
                                    {words.or}
                                    <span className="h-px flex-1 bg-border" />
                                </div>
                                <div className="flex flex-col gap-2 *:h-11 *:w-full">{alternatives}</div>
                            </div>
                        )}
                        {footer !== undefined && <div className="text-help text-muted-foreground">{footer}</div>}
                    </form>
                </main>
            </div>
        </div>
    )
}
