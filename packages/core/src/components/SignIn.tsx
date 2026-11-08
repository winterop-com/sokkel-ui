import { CircleAlert } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { TextField } from './TextField'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

/** What a person typed to sign in; the fields the form does not ask for stay empty. */
export interface SignInValues {
    server: string
    user: string
    password: string
    token: string
}

export interface SignInWords {
    title: string
    server: string
    serverHint: string
    user: string
    password: string
    token: string
    submit: string
    busy: string
}

const WORDS: SignInWords = {
    title: 'Sign in',
    server: 'Server',
    serverHint: 'https://example.org',
    user: 'User name',
    password: 'Password',
    token: 'Token',
    submit: 'Sign in',
    busy: 'Signing in',
}

const EMPTY: SignInValues = { server: '', user: '', password: '', token: '' }

/** Whether the fields `method` asks for are all filled, so the form can be sent. */
export function signInReady(values: SignInValues, method: 'password' | 'token', server: boolean): boolean {
    if (server && values.server.trim() === '') return false
    if (method === 'token') return values.token.trim() !== ''
    return values.user.trim() !== '' && values.password !== ''
}

/**
 * A sign-in screen: a brand pane with the app's mark, name and a line about it beside a form of one
 * or two fields, a user name and password or a token (`method`). `server` adds a field for the
 * server's address above them, for an app that may talk to more than one. `error` shows why the
 * last try was refused, over the fields; `busy` holds the form while a try is under way. The submit
 * waits until the fields it needs are filled and sends `onSubmit` the values.
 *
 * It stands the window's height, as the shell does, and answers to its own width: the panes side by
 * side in a wide room, and the brand as a head over the form in a narrow one, as on a phone. `footer` sits under the form, for a way to reset a
 * password or a note on who to ask.
 */
export function SignIn({
    mark,
    name,
    line,
    method = 'password',
    server = false,
    defaultValues,
    error,
    busy = false,
    onSubmit,
    footer,
    className,
    words: given,
}: {
    mark?: ReactNode
    name: string
    line?: ReactNode
    method?: 'password' | 'token'
    server?: boolean
    defaultValues?: Partial<SignInValues>
    error?: ReactNode
    busy?: boolean
    onSubmit: (values: SignInValues) => void
    footer?: ReactNode
    className?: string
    words?: Partial<SignInWords>
}) {
    const words = { ...WORDS, ...given }
    const id = useId()
    const [values, setValues] = useState<SignInValues>({ ...EMPTY, ...defaultValues })
    const set = (key: keyof SignInValues) => (value: string) => setValues((old) => ({ ...old, [key]: value }))
    const ready = signInReady(values, method, server) && !busy
    const failed = error !== undefined && error !== null && error !== false

    return (
        <div data-slot="sign-in" className={cn('@container flex min-h-svh w-full bg-background text-foreground', className)}>
            <div className="flex w-full flex-1 flex-col @3xl:flex-row">
                <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/50 p-6 @3xl:w-2/5 @3xl:justify-between @3xl:border-r @3xl:border-b-0 @3xl:p-10">
                    <div className="flex items-center gap-2.5">
                        {mark !== undefined && (
                            <span className="flex size-8 shrink-0 items-center justify-center [&_svg]:size-7">{mark}</span>
                        )}
                        <span className="text-section-title">{name}</span>
                    </div>
                    {line !== undefined && (
                        <p className="max-w-sm text-sm text-pretty text-muted-foreground @3xl:text-page-title @3xl:text-foreground">
                            {line}
                        </p>
                    )}
                </div>
                <div className="flex flex-1 items-start justify-center p-6 @3xl:items-center @3xl:p-10">
                    <form
                        className="flex w-full max-w-sm flex-col gap-4"
                        aria-busy={busy}
                        onSubmit={(event) => {
                            event.preventDefault()
                            if (ready) onSubmit(values)
                        }}
                    >
                        <h1 className="text-detail-title">{words.title}</h1>
                        {failed && (
                            <Alert variant="destructive">
                                <CircleAlert aria-hidden />
                                <AlertDescription className="text-destructive">{error}</AlertDescription>
                            </Alert>
                        )}
                        {server && (
                            <TextField
                                id={`${id}-server`}
                                label={words.server}
                                type="url"
                                mono
                                autoComplete="url"
                                placeholder={words.serverHint}
                                value={values.server}
                                onChange={set('server')}
                                disabled={busy}
                            />
                        )}
                        {method === 'token' ? (
                            <TextField
                                id={`${id}-token`}
                                label={words.token}
                                type="password"
                                mono
                                autoComplete="current-password"
                                value={values.token}
                                onChange={set('token')}
                                disabled={busy}
                            />
                        ) : (
                            <>
                                <TextField
                                    id={`${id}-user`}
                                    label={words.user}
                                    autoComplete="username"
                                    value={values.user}
                                    onChange={set('user')}
                                    disabled={busy}
                                />
                                <TextField
                                    id={`${id}-password`}
                                    label={words.password}
                                    type="password"
                                    autoComplete="current-password"
                                    value={values.password}
                                    onChange={set('password')}
                                    disabled={busy}
                                />
                            </>
                        )}
                        <Button type="submit" size="lg" disabled={!ready} className="w-full">
                            {busy && <Spinner data-icon="inline-start" />}
                            {busy ? words.busy : words.submit}
                        </Button>
                        {footer !== undefined && <div className="text-help text-muted-foreground">{footer}</div>}
                    </form>
                </div>
            </div>
        </div>
    )
}
