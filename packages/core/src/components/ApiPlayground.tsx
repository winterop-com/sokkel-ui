import { Autocomplete } from '@base-ui/react/autocomplete'
import { Plus, Send, SquareTerminal, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Code } from './Code'
import { CopyButton } from './CopyButton'
import { ExampleList, type ExampleGroup } from './ExampleList'
import { FoldingRail, type FoldingRailProps } from './FoldingRail'
import { IconButton } from './IconButton'
import { Section } from './Section'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ComboboxContent, ComboboxList } from './ui/combobox'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Spinner } from './ui/spinner'

// The body's editor loads when a method that sends a body is first chosen, so a page of reads carries no editor.
const CodeEditor = lazy(() => import('./CodeEditor').then((module) => ({ default: module.CodeEditor })))

/** A query parameter: its name and its value as typed. */
export interface ApiParam {
    name: string
    value: string
}

/** One request as the builder holds it: the method, the path under the base, its parameters and a body for a method that sends one. */
export interface ApiRequest {
    method: string
    path: string
    params: readonly ApiParam[]
    body?: string
}

/** What a server answered: the status and its words, how long it took and the body as text. */
export interface ApiAnswer {
    status: number
    statusText: string
    /** Milliseconds from sending to the whole answer. */
    ms: number
    body: string
    /** The body's language for its colors; `json` when not given. */
    language?: string
}

/** A request sent and how it went: the answer, or the reason nothing answered. */
export interface ApiSent {
    request: ApiRequest
    answer: ApiAnswer | null
    error?: string
}

/** A request the server offers as a starting point, filled into the builder when chosen and never sent by itself. */
export interface ApiPreset {
    id: string
    method: string
    path: string
    params?: readonly ApiParam[]
    body?: string
    /** What it asks for, in a sentence. */
    description?: string
}

/** Presets under a heading, such as the server's reads or its operations. */
export interface ApiPresetGroup {
    title: string
    /** A sentence under the heading on what the group's requests answer. */
    note?: string
    presets: readonly ApiPreset[]
}

/** A parameter a path answers to, offered as a chip that adds it. */
export interface ApiParamHint {
    name: string
    description?: string
}

/** The words an API playground says. */
export interface ApiPlaygroundWords {
    request: string
    method: string
    path: string
    send: string
    sending: string
    params: string
    /** Before the chips of the parameters the path answers to. */
    answers: string
    addParam: string
    removeParam: (name: string) => string
    paramName: string
    paramValue: string
    body: string
    copyCurl: string
    copied: string
    answer: string
    /** Before the first request is sent. */
    nothingSent: string
    /** A request nothing answered. */
    noAnswer: string
    /** An answer with no body. */
    emptyBody: string
    /** How long an answer took. */
    took: (ms: number) => string
    presets: string
    /** The presets rail's fold button. */
    fold: string
    /** Said with the presets' title on the strip the folded rail is. */
    unfold: string
    resize: string
    history: string
    historyNote: string
}

const WORDS: ApiPlaygroundWords = {
    request: 'Request',
    method: 'Method',
    path: 'Path',
    send: 'Send',
    sending: 'Sending',
    params: 'Query parameters',
    answers: 'This path answers',
    addParam: 'Add a parameter',
    removeParam: (name) => `Remove ${name === '' ? 'the parameter' : name}`,
    paramName: 'Name',
    paramValue: 'Value',
    body: 'Request body',
    copyCurl: 'Copy as curl',
    copied: 'Copied',
    answer: 'Answer',
    nothingSent: 'Send a request to read what the server answers.',
    noAnswer: 'Nothing answered this request.',
    emptyBody: '(the server answered with no body)',
    took: (ms) => `${String(Math.round(ms))} ms`,
    presets: 'Presets',
    fold: 'Fold',
    unfold: 'Unfold',
    resize: 'Resize the presets',
    history: 'Sent requests',
    historyNote: 'Newest first. Choosing one puts it back in the builder.',
}

/** The path with its parameters as a query, each name and value encoded. */
export function requestTarget(request: ApiRequest): string {
    const query = request.params
        .filter((param) => param.name.trim() !== '')
        .map((param) => `${encodeURIComponent(param.name.trim())}=${encodeURIComponent(param.value)}`)
        .join('&')
    if (query === '') return request.path
    return `${request.path}${request.path.includes('?') ? '&' : '?'}${query}`
}

const quoted = (text: string) => `'${text.replaceAll("'", "'\\''")}'`

/** The request as a curl command, with the headers every request carries and its body. */
export function curlOf(base: string, request: ApiRequest, headers: Readonly<Record<string, string>> = {}): string {
    const parts = [`curl -X ${request.method}`, quoted(`${base.replace(/\/$/, '')}${requestTarget(request)}`)]
    for (const [name, value] of Object.entries(headers)) parts.push(`-H ${quoted(`${name}: ${value}`)}`)
    if (request.body !== undefined && request.body.trim() !== '' && request.method !== 'GET') parts.push(`--data ${quoted(request.body)}`)
    return parts.join(' ')
}

export interface ApiPlaygroundProps {
    /** Sends a request and answers with what came back; a refusal means nothing answered, its message said. */
    send: (request: ApiRequest, signal: AbortSignal) => Promise<ApiAnswer>
    /** The address the paths are under, for the target line and the curl command. */
    base: string
    /** The methods offered; GET and POST when not given. Only a method other than GET sends a body. */
    methods?: readonly string[]
    /** The server's own requests, grouped, in a rail beside the builder that resizes and folds. */
    presets?: readonly ApiPresetGroup[]
    /** How the presets rail starts and who holds it: folded, its width, whether it resizes; as `FoldingRail` takes them. */
    presetsRail?: Pick<
        FoldingRailProps,
        'folded' | 'defaultFolded' | 'onFoldedChange' | 'size' | 'onSizeChange' | 'defaultSize' | 'resizable'
    >
    /** The parameters a path answers to, offered as chips that add them and completed as a name is typed. */
    paramHints?: (path: string) => readonly ApiParamHint[]
    /** The headers every request carries, written into the curl command. */
    headers?: Readonly<Record<string, string>>
    /** A sentence under the path, such as what every request carries. */
    note?: ReactNode
    /**
     * Buttons after Copy as curl, such as one opening the request in a new tab: a node, or a
     * function of the request as it would be sent and its whole address.
     */
    actions?: ReactNode | ((request: ApiRequest, target: string) => ReactNode)
    /** The request the builder opens with. */
    defaultRequest?: ApiRequest
    /** The answer shown when it opens, such as the last one the app kept. */
    defaultSent?: ApiSent
    /** The requests sent before, newest first, which the app keeps; choosing one fills the builder. */
    history?: readonly ApiSent[]
    /** Hears every request sent and how it went, to keep a history or say it in a status line. */
    onSent?: (sent: ApiSent) => void
    className?: string
    words?: Partial<ApiPlaygroundWords>
}

const START: ApiRequest = { method: 'GET', path: '/', params: [] }

/**
 * Send one request to a server and read exactly what it answers: the method, the path under the
 * server's base, query parameters as rows (with chips for the ones the path answers to) and a body
 * for a method that sends one, edited as JSON in the code editor; Send, the whole target in the
 * code face, Copy as curl and the app's own `actions`. A parameter's name completes from the ones
 * the path answers to. The answer says its status and how long it took over the body, highlighted.
 * The server's own requests stand beside the builder as presets in groups, in a rail that resizes
 * and folds to a strip (`presetsRail`), each filling the builder without sending, and the requests
 * sent before follow the answer, newest first. The app sends: `send` answers with the status, the
 * time and the body, so a fake backend or a real `fetch` both serve. The body's editor is
 * `CodeEditor`, loaded on first use, so an app offering a method with a body installs what it needs.
 */
export function ApiPlayground({
    send,
    base,
    methods = ['GET', 'POST'],
    presets = [],
    presetsRail,
    paramHints,
    headers = {},
    note,
    actions,
    defaultRequest = START,
    defaultSent,
    history = [],
    onSent,
    className,
    words: given,
}: ApiPlaygroundProps) {
    const words = { ...WORDS, ...given }
    const [request, setRequest] = useState<ApiRequest>(defaultRequest)
    const [sent, setSent] = useState<ApiSent | null>(defaultSent ?? null)
    const [busy, setBusy] = useState(false)
    // The preset the builder was filled from, marked in the rail until the request is changed.
    const [preset, setPreset] = useState<string | undefined>(undefined)
    const flight = useRef<AbortController | null>(null)
    useEffect(() => () => flight.current?.abort(), [])

    const set = (patch: Partial<ApiRequest>) => {
        setPreset(undefined)
        setRequest((current) => ({ ...current, ...patch }))
    }
    const setParam = (index: number, patch: Partial<ApiParam>) =>
        set({ params: request.params.map((param, at) => (at === index ? { ...param, ...patch } : param)) })
    const addParam = (name = '') => {
        const empty = request.params.findIndex((param) => param.name.trim() === '' && param.value === '')
        if (empty >= 0 && name !== '') setParam(empty, { name })
        else set({ params: [...request.params, { name, value: '' }] })
    }
    const sendsBody = request.method !== 'GET'
    const shown: ApiRequest = sendsBody ? request : { ...request, body: undefined }
    const target = `${base.replace(/\/$/, '')}${requestTarget(shown)}`
    const hints = paramHints?.(request.path.split('?')[0] ?? request.path) ?? []

    const go = () => {
        flight.current?.abort()
        const controller = new AbortController()
        flight.current = controller
        setBusy(true)
        const asked = shown
        send(asked, controller.signal).then(
            (answer) => {
                if (controller.signal.aborted) return
                const result = { request: asked, answer }
                setSent(result)
                setBusy(false)
                onSent?.(result)
            },
            (failure: unknown) => {
                if (controller.signal.aborted) return
                const result = { request: asked, answer: null, error: failure instanceof Error ? failure.message : String(failure) }
                setSent(result)
                setBusy(false)
                onSent?.(result)
            },
        )
    }

    const fill = (from: ApiPreset | ApiRequest) => {
        setPreset('id' in from ? from.id : undefined)
        setRequest({ method: from.method, path: from.path, params: [...(from.params ?? [])], body: from.body })
    }
    const byId = new Map(presets.flatMap((group) => group.presets.map((one) => [one.id, one] as const)))
    const groups: ExampleGroup[] = presets.map((group) => ({
        title: group.title,
        note: group.note,
        examples: group.presets.map((one) => ({
            id: one.id,
            code: `${one.method} ${requestTarget({ method: one.method, path: one.path, params: one.params ?? [] })}`,
            description: one.description,
        })),
    }))

    const builder = (
        <div className="flex min-w-0 flex-col gap-6">
            <Section title={words.request}>
                <form
                    className="flex min-w-0 flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        if (request.path.trim() !== '' && !busy) go()
                    }}
                >
                    <div className="flex min-w-0 flex-wrap items-end gap-2">
                        <div className="flex w-28 flex-col gap-1.5">
                            <Label htmlFor="api-method">{words.method}</Label>
                            <Select
                                items={methods.map((method) => ({ value: method, label: method }))}
                                value={request.method}
                                onValueChange={(next) => next !== null && set({ method: next })}
                            >
                                <SelectTrigger id="api-method" className="w-full font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {methods.map((method) => (
                                        <SelectItem key={method} value={method} className="font-mono">
                                            {method}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex min-w-48 flex-1 basis-48 flex-col gap-1.5">
                            <Label htmlFor="api-path">{words.path}</Label>
                            <Input
                                id="api-path"
                                className="w-full min-w-0 font-mono"
                                value={request.path}
                                spellCheck={false}
                                autoComplete="off"
                                onChange={(event) => set({ path: event.target.value })}
                            />
                        </div>
                        <Button type="submit" disabled={request.path.trim() === '' || busy}>
                            {busy ? <Spinner /> : <Send aria-hidden />}
                            {busy ? words.sending : words.send}
                        </Button>
                    </div>
                    {note !== undefined && <p className="text-help text-muted-foreground">{note}</p>}
                    <div className="flex min-w-0 flex-col gap-2">
                        <span className="text-label">{words.params}</span>
                        {hints.length > 0 && (
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-help text-muted-foreground">
                                {words.answers}
                                {hints.map((hint) => (
                                    <Badge
                                        key={hint.name}
                                        variant="outline"
                                        className="font-mono"
                                        title={hint.description}
                                        render={<button type="button" onClick={() => addParam(hint.name)} />}
                                    >
                                        {hint.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {request.params.map((param, index) => (
                            <div key={index} className="flex min-w-0 items-center gap-2">
                                <NameInput
                                    label={words.paramName}
                                    value={param.name}
                                    hints={hints}
                                    onChange={(name) => setParam(index, { name })}
                                />
                                <Input
                                    aria-label={words.paramValue}
                                    placeholder={words.paramValue}
                                    className="min-w-0 flex-1 font-mono"
                                    value={param.value}
                                    spellCheck={false}
                                    onChange={(event) => setParam(index, { value: event.target.value })}
                                />
                                <IconButton
                                    label={words.removeParam(param.name)}
                                    onClick={() => set({ params: request.params.filter((_, at) => at !== index) })}
                                >
                                    <X />
                                </IconButton>
                            </div>
                        ))}
                        <div>
                            <Button type="button" variant="outline" size="sm" onClick={() => addParam()}>
                                <Plus aria-hidden />
                                {words.addParam}
                            </Button>
                        </div>
                    </div>
                    {sendsBody && (
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <Label htmlFor="api-body">{words.body}</Label>
                            <Suspense fallback={<div className="min-h-24 rounded-control border border-input bg-field" />}>
                                <CodeEditor
                                    id="api-body"
                                    label={words.body}
                                    language="json"
                                    value={request.body ?? ''}
                                    onChange={(body) => set({ body })}
                                />
                            </Suspense>
                        </div>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <CopyButton
                            value={curlOf(base, shown, headers)}
                            showLabel
                            icon={<SquareTerminal aria-hidden />}
                            words={{ copy: words.copyCurl, copied: words.copied }}
                        />
                        {typeof actions === 'function' ? actions(shown, target) : actions}
                        <span className="min-w-0 font-mono text-xs break-all text-muted-foreground">{target}</span>
                    </div>
                </form>
            </Section>
            <Section title={words.answer} meta={sent?.answer === null || sent === null ? undefined : words.took(sent.answer.ms)}>
                {busy ? (
                    <span role="status" className="flex items-center gap-2 text-help text-muted-foreground">
                        <Spinner />
                        {words.sending}
                    </span>
                ) : sent === null ? (
                    <p className="text-help text-muted-foreground">{words.nothingSent}</p>
                ) : sent.answer === null ? (
                    <p className="text-help text-critical-ink">
                        {words.noAnswer} {sent.error}
                    </p>
                ) : (
                    <div className="flex min-w-0 flex-col gap-2">
                        <span className="flex items-center gap-2">
                            <Badge variant={sent.answer.status < 400 ? 'secondary' : 'destructive'} className="font-mono">
                                {sent.answer.status} {sent.answer.statusText}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                                {sent.request.method} {requestTarget(sent.request)}
                            </span>
                        </span>
                        <Code
                            value={sent.answer.body === '' ? words.emptyBody : sent.answer.body}
                            language={sent.answer.body === '' ? 'text' : (sent.answer.language ?? 'json')}
                            className="max-h-96 overflow-auto"
                        />
                    </div>
                )}
            </Section>
            {history.length > 0 && (
                <Section title={words.history} meta={String(history.length)} description={words.historyNote}>
                    <div className="flex min-w-0 flex-col">
                        {history.map((one, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => fill(one.request)}
                                className="flex min-w-0 items-center gap-3 rounded-control px-2 py-1.5 text-left font-mono text-xs hover:bg-hover"
                            >
                                <span className="w-12 shrink-0 font-medium">{one.request.method}</span>
                                <span className="min-w-0 flex-1 truncate">{requestTarget(one.request)}</span>
                                <span
                                    className={cn(
                                        'shrink-0',
                                        one.answer === null || one.answer.status >= 400 ? 'text-critical-ink' : 'text-muted-foreground',
                                    )}
                                >
                                    {one.answer === null ? words.noAnswer : one.answer.status}
                                </span>
                            </button>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    )
    if (presets.length === 0) return <div className={cn('min-w-0', className)}>{builder}</div>
    return (
        <FoldingRail
            title={words.presets}
            className={className}
            {...presetsRail}
            words={{ fold: words.fold, unfold: words.unfold, resize: words.resize }}
            rail={
                <ExampleList
                    groups={groups}
                    chosen={preset}
                    onChoose={(example) => {
                        const one = byId.get(example.id)
                        if (one !== undefined) fill(one)
                    }}
                />
            }
        >
            {builder}
        </FoldingRail>
    )
}

/** A parameter's name, completed from the names the path answers to as it is typed. */
function NameInput({
    label,
    value,
    hints,
    onChange,
}: {
    label: string
    value: string
    hints: readonly ApiParamHint[]
    onChange: (name: string) => void
}) {
    const look = { 'aria-label': label, placeholder: label, className: 'min-w-0 flex-1 font-mono', spellCheck: false }
    if (hints.length === 0) return <Input {...look} value={value} onChange={(event) => onChange(event.target.value)} />
    return (
        <Autocomplete.Root items={hints.map((hint) => hint.name)} value={value} onValueChange={(next) => onChange(next)}>
            <Autocomplete.Input render={<Input {...look} />} />
            <ComboboxContent>
                <ComboboxList>
                    {(name: string) => (
                        <Autocomplete.Item
                            key={name}
                            value={name}
                            className="flex w-full cursor-default flex-col rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                        >
                            <span className="font-mono">{name}</span>
                            {hints.find((hint) => hint.name === name)?.description !== undefined && (
                                <span className="text-help text-muted-foreground">
                                    {hints.find((hint) => hint.name === name)?.description}
                                </span>
                            )}
                        </Autocomplete.Item>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Autocomplete.Root>
    )
}
