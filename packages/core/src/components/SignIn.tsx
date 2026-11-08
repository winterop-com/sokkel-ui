import { ArrowRight, CircleAlert, Eye, EyeOff, Globe, KeyRound, Lock, User } from 'lucide-react'
import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { useThemeName } from '../hooks/use-theme-name'
import { cn } from '../lib/cn'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
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
    /** Whether to keep the username for next time, when the form offers it. */
    remember: boolean
}

/** A small fact under the brand: the instance, the version. */
export interface SignInFact {
    label: ReactNode
    value: ReactNode
}

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
    show: string
    hide: string
    remember: string
    submit: string
    busy: string
    or: string
    seam: string
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
    show: 'Show the password',
    hide: 'Hide the password',
    remember: 'Remember my username',
    submit: 'Sign in',
    busy: 'Signing in',
    or: 'or',
    seam: 'Brand pane width',
}

const EMPTY: SignInValues = { server: '', user: '', password: '', token: '', remember: false }

/** The narrowest the brand pane is dragged to, and the room the form keeps beside it. */
const BRAND_MIN = 320
const FORM_ROOM = 480

/** Whether the fields `method` asks for are all filled, so the form can be sent. */
export function signInReady(values: SignInValues, method: 'password' | 'token', server: boolean): boolean {
    if (server && values.server.trim() === '') return false
    if (method === 'token') return values.token.trim() !== ''
    return values.user.trim() !== '' && values.password !== ''
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

/** A text input with an icon at its start and, for a secret, a button at its end that shows it. */
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
    autoComplete?: string
    disabled: boolean
    words: SignInWords
}) {
    const [shown, setShown] = useState(false)
    return (
        <Field id={id} label={label}>
            <InputGroup className="h-11">
                <InputGroupAddon className="pl-3.5">{icon}</InputGroupAddon>
                <InputGroupInput
                    id={id}
                    type={secret && !shown ? 'password' : type}
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    spellCheck={mono || secret ? false : undefined}
                    className={cn('h-full pl-2', mono && 'font-mono')}
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

/**
 * A sign-in screen in two panes the window's height. The brand pane holds `art` over its upper
 * part (`LevelBars` and `FlowLines` ship with the library, or the app's own picture), the `mark`
 * and `name` large at its foot, and a few `facts` under them, such as the instance and the
 * version. It is dark in every scheme, in the theme's own dark tokens, unless `brandScheme` is
 * `page`. The form pane, centered, opens with an `eyebrow` in the primary ink, the title and a
 * `description`, then the fields: a username and password with the password's show button, or one
 * token field (`method`), or the app's own fields as `children`, with an optional `server` address
 * above them. `error` says why the last try was refused, over the submit; `busy` holds the form
 * while a try is under way. `alternatives` are other ways in, under a rule with "or", drawn full
 * width.
 *
 * `rememberKey` keeps the username in this browser under that key and fills it in next time;
 * `remember` adds a box to choose whether to. `resizable` puts a seam between the panes to drag
 * the brand pane's width, from `brandWidth` (half by default), double click putting it back.
 * `reveal` lets the form's parts rise into place as the screen opens, held still when motion is
 * reduced.
 *
 * It answers to its own width: in a narrow room, as on a phone, the brand pane becomes a bar over
 * the form with the mark, the name and the first fact's value, and the art is left out.
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
    remember = false,
    rememberKey,
    children,
    ready: readyGiven,
    defaultValues,
    error,
    busy = false,
    onSubmit,
    alternatives,
    footer,
    desktop,
    className,
    words: given,
}: {
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
    server?: boolean
    /** Offers a box to keep the username for next time; with `rememberKey` the form keeps it itself. */
    remember?: boolean
    /** The local storage key the username is kept under in this browser. */
    rememberKey?: string
    /** The app's own fields, in place of the username and password or the token. */
    children?: ReactNode
    /** Whether the app's own fields are filled, so the form can be sent; read only with `children`. */
    ready?: boolean
    defaultValues?: Partial<SignInValues>
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
}) {
    const words = { ...WORDS, ...given }
    const id = useId()
    const theme = useThemeName()
    const root = useRef<HTMLDivElement>(null)
    const brand = useRef<HTMLElement>(null)
    const [dragged, setDragged] = useState<number | null>(null)
    const [values, setValues] = useState<SignInValues>(() => {
        const kept = rememberKey === undefined ? '' : rememberedUser(rememberKey)
        return { ...EMPTY, ...(kept === '' ? {} : { user: kept, remember: true }), ...defaultValues }
    })
    const set = (key: 'server' | 'user' | 'password' | 'token') => (value: string) => setValues((old) => ({ ...old, [key]: value }))
    const filled =
        children === undefined ? signInReady(values, method, server) : (readyGiven ?? true) && (!server || values.server.trim() !== '')
    const ready = filled && !busy
    const failed = error !== undefined && error !== null && error !== false
    const firstFact = facts[0]
    const dark = brandScheme === 'dark'
    const drag = desktop === undefined ? undefined : ''
    const lights = useTrafficLights(desktop)
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

    /** The brand's ground, dark in every scheme when asked, in the document's theme. */
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
                        {firstFact !== undefined && (
                            <span className="ml-auto min-w-0 truncate font-mono text-xs text-muted-foreground">{firstFact.value}</span>
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
                                {facts.length > 0 && (
                                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-10 gap-y-1">
                                        {facts.map((fact, index) => (
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
                            {server && (
                                <IconInput
                                    id={`${id}-server`}
                                    label={words.server}
                                    icon={<Globe aria-hidden />}
                                    type="url"
                                    mono
                                    autoComplete="url"
                                    placeholder={words.serverHint}
                                    value={values.server}
                                    onChange={set('server')}
                                    disabled={busy}
                                    words={words}
                                />
                            )}
                            {children ??
                                (method === 'token' ? (
                                    <IconInput
                                        id={`${id}-token`}
                                        label={words.token}
                                        icon={<KeyRound aria-hidden />}
                                        secret
                                        mono
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
                                            icon={<User aria-hidden />}
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
                                            icon={<Lock aria-hidden />}
                                            secret
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
                                    onCheckedChange={(checked) => setValues((old) => ({ ...old, remember: checked }))}
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
