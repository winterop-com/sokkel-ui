import { IconButton } from '../IconButton'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Banner } from '../Banner'
import { Field, type RequiredMark } from '../Field'
import { IssueMarks } from '../IssueMarks'
import { ISSUE_EDGE, IssueCount, IssueMark, worst, type Issue, type IssueAction, type IssueEntry } from '../IssueMark'
import { NumberField } from '../NumberField'
import { RepeatedGroup } from '../RepeatedGroup'
import { SecretField, type SecretFieldWords } from '../SecretField'
import { SwitchField } from '../SwitchField'
import { Button } from '../ui/button'
import { PlainCheckbox } from '../ui/checkbox-look'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { MapField } from './MapField'
import { childSchema, literal, resolve, type JsonSchema } from './read'
import { loadedSay, loadedValidate, loadValidate } from './checker'
import {
    fieldSchema,
    given,
    pointer,
    shiftKey,
    shiftRecord,
    readScalar,
    scalarUnion,
    shiftSet,
    types,
    valueAt,
    withoutDeferred,
    type DeferredValue,
    type Path,
    type SchemaIssue,
} from './issues'

/** What a server said about a value it refused, at the path it concerns. */
export interface ServerIssue {
    path: Path
    text: string
    detail?: string
    tone?: Issue['tone']
    actions?: readonly IssueAction[]
}

/** A secret already set where the app keeps it, at a `writeOnly` property: never read back, only replaced. */
export interface SealedSecret {
    path: Path
    /** When it was set. */
    setAt?: Date | string
}

export interface SchemaFormWords {
    /** An issue in words: the message, and what to do when the message alone does not say it. */
    say: (issue: SchemaIssue, schema: JsonSchema) => { text: string; detail?: string }
    /** The action that puts in the value a fix offers. */
    use: (fix: unknown) => string
    add: string
    remove: string
    choose: string
    none: string
    notJson: string
    item: (index: number) => string
    moveUp: string
    moveDown: string
    /** Drawn after a required field's label when the form marks them with `requiredMark="word"`. */
    required: string
    /** What applies when a field with a schema `default` is left empty, for a form drawn with `fallbacks`. */
    fallback: (value: unknown) => string
    /** Marks the value an unset field shows as its schema `default`, which applies until one is chosen. */
    default: string
    /** A map's column heads, and its rows' names by place. */
    key: string
    value: string
    /** Said at a map that has a key twice; the second is not taken. */
    repeatedKey: string
    /** The disclosure of a folded form's other fields, and its words once open. */
    more: (count: number) => string
    fewer: string
    /** The words of a `writeOnly` field's `SecretField`: Set, Replace and the rest. */
    secret?: Partial<SecretFieldWords>
}

/**
 * An issue in plain English, from `./issue-words` once the checker has loaded with it; until then
 * only the issues known without it are said: text that does not read as a number, and a checker
 * that cannot be fetched.
 */
function say(issue: SchemaIssue, schema: JsonSchema): { text: string; detail?: string } {
    const later = loadedSay()
    if (later !== undefined) return later(issue, schema)
    if (issue.kind === 'unchecked') return { text: 'The values cannot be checked, so the form cannot be sent', detail: issue.reason }
    return { text: issue.kind === 'type' && issue.expected === 'integer' ? 'Enter a whole number' : 'Enter a number' }
}

const WORDS: SchemaFormWords = {
    say,
    use: (fix) => (Array.isArray(fix) ? 'Use the list without the extras' : `Use ${typeof fix === 'string' ? fix : literal(fix)}`),
    add: 'Add',
    remove: 'Remove',
    choose: 'Choose',
    none: 'None',
    notJson: 'Not valid JSON',
    item: (index) => `Item ${String(index + 1)}`,
    moveUp: 'Move up',
    moveDown: 'Move down',
    required: 'required',
    fallback: (value) => `Default is ${typeof value === 'string' ? value : literal(value)}`,
    default: 'default',
    key: 'Key',
    value: 'Value',
    repeatedKey: 'Each key only once',
    more: (count) => `${String(count)} more ${count === 1 ? 'field' : 'fields'}`,
    fewer: 'Fewer fields',
}

/**
 * A form's value with every nested object in place, and the schema defaults a field cannot show
 * itself: an object's or a list's, and a required field's. An optional field with a plain default
 * is left unset and shows the default as what applies.
 */
export function initialValue(schema: JsonSchema, root: JsonSchema = schema, keep = true): unknown {
    const at = fieldSchema(schema, root)
    if (at.default !== undefined && (keep || (at.default !== null && typeof at.default === 'object'))) return structuredClone(at.default)
    if (at.const !== undefined) return at.const
    if (at.properties !== undefined) {
        const out: Record<string, unknown> = {}
        for (const [key, child] of Object.entries(at.properties)) {
            const value = initialValue(child, root, at.required?.includes(key))
            if (value !== undefined) out[key] = value
        }
        return out
    }
    if (types(at).main[0] === 'array') return []
    return undefined
}

/** The value with the one at a path replaced; an undefined value takes the key out of its object. */
function setAt(value: unknown, path: Path, next: unknown): unknown {
    if (path.length === 0) return next
    const [head, ...rest] = path
    if (Array.isArray(value)) {
        const copy = [...value]
        copy[head as number] = setAt(copy[head as number], rest, next)
        return copy
    }
    const copy: Record<string, unknown> = { ...(value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}) }
    const child = setAt(copy[head], rest, next)
    if (child === undefined) delete copy[head]
    else copy[head] = child
    return copy
}

const NONE: readonly ServerIssue[] = []
const NO_SECRETS: readonly SealedSecret[] = []

/**
 * Loads the schema checker (ajv) once, and resolves when it is ready. `useSchemaForm` calls it
 * itself when a form is first drawn; an app that knows a form is coming can call it ahead, so the
 * first one checks at once.
 */
export function loadSchemaChecks(): Promise<void> {
    return loadValidate().then(() => undefined)
}

/**
 * What the schema finds wrong with the value: undefined while the checker loads, and one
 * `unchecked` issue at the root when it cannot be fetched, so the form fails closed.
 */
function useChecked(schema: JsonSchema, value: unknown, deferred?: DeferredValue): readonly SchemaIssue[] | undefined {
    const [check, setCheck] = useState(loadedValidate)
    const [failed, setFailed] = useState<string | null>(null)
    useEffect(() => {
        if (check !== undefined) return
        let live = true
        loadValidate().then(
            (loaded) => {
                if (live) setCheck(() => loaded)
            },
            (error: unknown) => {
                if (live) setFailed(error instanceof Error ? error.message : String(error))
            },
        )
        return () => {
            live = false
        }
    }, [check])
    return useMemo((): readonly SchemaIssue[] | undefined => {
        if (check !== undefined) return withoutDeferred(check(schema, value), value, deferred)
        if (failed !== null) return [{ kind: 'unchecked', reason: failed, path: [], tone: 'critical' }]
        return undefined
    }, [check, failed, schema, value, deferred])
}

/** Everything a form holds: the value, what has been touched, what the server said, and which issue is open. */
export interface SchemaFormState {
    schema: JsonSchema
    value: unknown
    setValue: (value: unknown) => void
    set: (path: Path, value: unknown) => void
    /** The text typed into a field that holds JSON, kept while it does not parse. */
    draft: (path: Path) => string | undefined
    setDraft: (path: Path, text: string | undefined) => void
    /** Marks a number field whose typed text is not a number, which is said and stops the submit until it is one. */
    setUnread: (path: Path, unread: boolean) => void
    /** A field's own refusal of what was typed, such as a map's key given twice: said at the field and stopping the submit until cleared with undefined. */
    hold: (path: Path, text: string | undefined) => void
    /** Marks a field as left, so its issues show from now on. */
    touch: (path: Path) => void
    /** The issues a field shows now, worst first. */
    shown: (path: Path) => Issue[]
    /** How many shown issues stop the submit, and how many are warnings. */
    count: { critical: number; warning: number }
    /**
     * Shows every issue; true when nothing stops the submit, else focuses the first field that does.
     * False while the checker is still loading, with every issue shown once it has.
     */
    submit: () => boolean
    /** Whether the schema checker is still loading, so no issue is known yet. */
    checking: boolean
    /**
     * Whether the value has an issue that stops the submit, shown yet or not, or the checker is
     * still loading: a verb can be shut quietly while it is true.
     */
    blocking: boolean
    /** Focuses the first field with an issue and opens what it says. */
    goToFirst: () => void
    /** Every shown issue with its field's title, in the order the fields are drawn, for the count's list. */
    list: IssueEntry[]
    open: string | null
    setOpen: (at: string | null) => void
    /** The id of a field's control. */
    id: (path: Path) => string
    /**
     * Takes an item out of a list, the marks kept by place (a field left, a draft, a refused value
     * changed) moving with the items after it, so none lands on the wrong item.
     */
    removeItem: (path: Path, index: number) => void
    /** Moves a list's item to another place, its marks with it. */
    moveItem: (path: Path, from: number, to: number) => void
    /** A key per item of the list at `path` that stays with the item as items are removed and moved. */
    itemKeys: (path: Path, length: number) => readonly string[]
    /** The secret already set at a path, if one is. */
    sealed: (path: Path) => SealedSecret | undefined
    /** The moment a sealed secret's `setAt` is counted from; without it, the clock. */
    now?: Date
    words: SchemaFormWords
}

/**
 * The state of a form drawn from a JSON Schema. A field's issues show once it has been left with
 * a value, or once the form has been submitted, and each goes the moment the value is put right.
 * What the server refused, passed as `issues`, shows at its field until that field is changed. The
 * checker, ajv, loads when the first form is drawn: the form takes input at once, and its issues
 * show as soon as the checker is there.
 */
export function useSchemaForm(
    schema: JsonSchema,
    {
        initial,
        issues: server = NONE,
        defaultSubmitted = false,
        defaultOpen,
        deferred,
        sealed = NO_SECRETS,
        now,
        words: given_,
        value: outside,
        onChange,
    }: {
        initial?: unknown
        /**
         * Holds the value from outside, as a document edited elsewhere too: the form draws it and
         * says each change through `onChange` rather than keeping its own. Leave it undefined for a
         * form that holds its own value from `initial`.
         */
        value?: unknown
        /** Hears each change to the value, held from outside or not. */
        onChange?: (value: unknown) => void
        issues?: readonly ServerIssue[]
        /** Starts as if submitted once, every issue shown. */
        defaultSubmitted?: boolean
        /** The field whose issues start open. */
        defaultOpen?: Path
        /**
         * Leaves a value unchecked, and anything inside it, such as one holding a reference filled in
         * later (`${steps.fetch.rows}` where a number goes). Keep it the same function between renders.
         */
        deferred?: DeferredValue
        /**
         * The secrets already set, by path: each `writeOnly` property among them shows as set and
         * stays out of the value until it is replaced, so what is sent leaves it as it is. A
         * required secret that is set asks for nothing more.
         */
        sealed?: readonly SealedSecret[]
        /** The moment a sealed secret's `setAt` is counted from; without it, the clock. */
        now?: Date
        words?: Partial<SchemaFormWords>
    } = {},
): SchemaFormState {
    const words = { ...WORDS, ...given_ }
    const base = useId()
    const [own, setOwn] = useState<unknown>(() => initial ?? initialValue(schema))
    const value = outside === undefined ? own : outside
    // The value as of the last change, so changes made in one event build on each other.
    const latest = useRef(value)
    latest.current = value
    const setValue = (next: unknown) => {
        latest.current = typeof next === 'function' ? (next as (current: unknown) => unknown)(latest.current) : next
        if (outside === undefined) setOwn(latest.current)
        onChange?.(latest.current)
    }
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [unread, setUnread] = useState<ReadonlySet<string>>(new Set())
    const [held, setHeld] = useState<Record<string, string>>({})
    const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
    const [submitted, setSubmitted] = useState(defaultSubmitted)
    const [open, setOpen] = useState<string | null>(defaultOpen === undefined ? null : pointer(defaultOpen))
    const [seen, setSeen] = useState(server)
    const [changed, setChanged] = useState<ReadonlySet<string>>(new Set())
    // The removals and moves made since the server's issues came, which carry each issue to its item's place now.
    const [moves, setMoves] = useState<readonly { list: string; map: (index: number) => number | null }[]>([])
    if (seen !== server) {
        setSeen(server)
        setChanged(new Set())
        setMoves([])
    }

    const rowKeys = useRef(new Map<string, string[]>())
    const rowCount = useRef(0)
    const keysAt = (at: string, length: number): string[] => {
        const held = rowKeys.current.get(at) ?? []
        while (held.length < length) held.push(`row-${String((rowCount.current += 1))}`)
        held.length = length
        rowKeys.current.set(at, held)
        return held
    }
    const reorder = (path: Path, map: (index: number) => number | null, items: unknown[]) => {
        const at = pointer(path)
        const keys = keysAt(at, items.length)
        const nextKeys: string[] = []
        const nextItems: unknown[] = []
        items.forEach((item, index) => {
            const to = map(index)
            if (to === null) return
            nextKeys[to] = keys[index]
            nextItems[to] = item
        })
        // The keys of lists inside the items move with their items, as the items' own keys do.
        const nextRows = new Map<string, string[]>()
        for (const [list, held] of rowKeys.current) {
            if (list === at) continue
            const moved = shiftKey(list, at, map)
            if (moved !== null) nextRows.set(moved, held)
        }
        nextRows.set(at, nextKeys)
        rowKeys.current = nextRows
        setMoves((current) => [...current, { list: at, map }])
        setValue((current: unknown) => setAt(current, path, nextItems))
        setTouched((current) => shiftSet(current, at, map))
        setUnread((current) => shiftSet(current, at, map))
        setChanged((current) => new Set([...shiftSet(current, at, map), at]))
        setDrafts((current) => shiftRecord(current, at, map))
        setHeld((current) => shiftRecord(current, at, map))
        setOpen((current) => (current === null ? null : shiftKey(current, at, map)))
    }

    const checked = useChecked(schema, value, deferred)
    const found = checked ?? []
    const id = (path: Path) => `${base}-f${pointer(path).replace(/[^a-zA-Z0-9_-]/g, '_')}`

    const set = (path: Path, next: unknown) => {
        setValue((current: unknown) => setAt(current, path, next))
        const at = pointer(path)
        setDrafts(({ [at]: _gone, ...rest }) => rest)
        setChanged((current) => new Set(current).add(at))
    }
    const focus = (at: string) => {
        const element = document.getElementById(`${base}-f${at.replace(/[^a-zA-Z0-9_-]/g, '_')}`)
        element?.scrollIntoView({ block: 'nearest' })
        element?.focus({ preventScroll: true })
    }

    const asIssue = (issue: SchemaIssue): Issue => {
        const said = words.say(issue, fieldSchema(schemaAt(schema, issue.path), schema))
        const actions: IssueAction[] = []
        if (issue.fix !== undefined)
            actions.push({
                label: words.use(issue.fix),
                onClick: () => {
                    set(issue.path, issue.fix)
                    focus(pointer(issue.path))
                },
            })
        return { tone: issue.tone, ...said, actions }
    }

    const sealedAt = new Map(sealed.map((secret) => [pointer(secret.path), secret]))
    const all = new Map<string, Issue[]>()
    const add = (at: string, issue: Issue) => all.set(at, [...(all.get(at) ?? []), issue])
    for (const issue of found) {
        const at = pointer(issue.path)
        if (issue.kind === 'required' && ((drafts[at] ?? '').trim() !== '' || unread.has(at) || sealedAt.has(at))) continue
        add(at, asIssue(issue))
    }
    // Text typed into a number or JSON field that does not parse leaves the value as it was, and says so.
    for (const at of unread) {
        const field = schemaAt(schema, parsePointer(at))
        add(at, { tone: 'critical', ...words.say({ kind: 'type', expected: types(field).main[0], path: [], tone: 'critical' }, field) })
    }
    for (const [at, text] of Object.entries(held)) add(at, { tone: 'critical', text })
    for (const [at, text] of Object.entries(drafts)) {
        if (text.trim() === '' || kindOf(schemaAt(schema, parsePointer(at)), schema) !== 'json') continue
        try {
            JSON.parse(text)
        } catch {
            add(at, { tone: 'critical', text: words.notJson })
        }
    }
    // Each refusal at its item's place now, gone with an item that was taken out.
    const refused = server.flatMap((issue) => {
        let at: string | null = pointer(issue.path)
        for (const move of moves) at = at === null ? null : shiftKey(at, move.list, move.map)
        return at === null ? [] : [{ issue, at }]
    })
    const refusedAt = (at: string): Issue[] =>
        changed.has(at)
            ? []
            : refused
                  .filter((one) => one.at === at)
                  .map(({ issue }) => ({ tone: issue.tone ?? 'critical', text: issue.text, detail: issue.detail, actions: issue.actions }))
    const pending = (at: string): Issue[] =>
        [...refusedAt(at), ...(all.get(at) ?? [])].sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'critical' ? -1 : 1))
    // What is wrong with the form as a whole, such as a schema that cannot be checked, shows at once.
    const shownAt = (at: string): Issue[] => (at === '' || submitted || touched.has(at) ? pending(at) : refusedAt(at))
    const places = [...new Set([...all.keys(), ...refused.map((one) => one.at)])]
    const count = { critical: 0, warning: 0 }
    for (const at of places) for (const issue of shownAt(at)) count[issue.tone] += 1
    /** The first place, in the order the fields are drawn, whose issues pass the test. */
    const first = (test: (issues: Issue[]) => boolean): string | undefined => {
        const drawn = [...document.querySelectorAll(`[id^="${base}-f"]`)].map((element) => element.id)
        const rank = (at: string) => {
            const index = drawn.indexOf(id(parsePointer(at)))
            return index === -1 ? Number.MAX_SAFE_INTEGER : index
        }
        return places.filter((at) => test(pending(at))).sort((a, b) => rank(a) - rank(b))[0]
    }
    const critical = (issues: Issue[]) => issues.some((issue) => issue.tone === 'critical')
    /** A field's title from its schema, or its key when the schema gives none. */
    const titleAt = (at: string): string => {
        let node: JsonSchema | undefined = schema
        const keys = parsePointer(at)
        for (const key of keys) {
            const here: JsonSchema = resolve(node ?? {}, schema)
            node = typeof key === 'number' ? (childSchema(here, schema) ?? undefined) : here.properties?.[key]
        }
        const found = node === undefined ? undefined : resolve(node, schema).title
        return found ?? String(keys[keys.length - 1] ?? '')
    }

    return {
        schema,
        value,
        setValue,
        set,
        draft: (path) => drafts[pointer(path)],
        setDraft: (path, text) =>
            setDrafts(({ [pointer(path)]: _gone, ...rest }) => (text === undefined ? rest : { ...rest, [pointer(path)]: text })),
        setUnread: (path, now) =>
            setUnread((current) => {
                const at = pointer(path)
                if (current.has(at) === now) return current
                const next = new Set(current)
                if (now) next.add(at)
                else next.delete(at)
                return next
            }),
        hold: (path, text) =>
            setHeld(({ [pointer(path)]: _gone, ...rest }) => (text === undefined ? rest : { ...rest, [pointer(path)]: text })),
        touch: (path) => {
            const at = pointer(path)
            if (given(valueAt(value, path)) || drafts[at] !== undefined || unread.has(at)) setTouched((current) => new Set(current).add(at))
        },
        shown: (path) => shownAt(pointer(path)),
        count,
        submit: () => {
            setSubmitted(true)
            if (checked === undefined) return false
            const blocking = first(critical)
            if (blocking === undefined) return true
            focus(blocking)
            return false
        },
        list: places
            .flatMap((at) => shownAt(at).map((issue) => ({ at, issue })))
            .map(({ at, issue }) => ({
                label: titleAt(at),
                issue,
                target: `${base}-f${at.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                onGo: () => {
                    focus(at)
                    setOpen(at)
                },
            })),
        goToFirst: () => {
            const at = first(count.critical > 0 ? critical : (issues) => issues.length > 0)
            if (at === undefined) return
            focus(at)
            setOpen(at)
        },
        checking: checked === undefined,
        blocking: checked === undefined || places.some((at) => critical(pending(at))),
        open,
        setOpen,
        id,
        removeItem: (path, index) => {
            const items = valueAt(value, path)
            if (!Array.isArray(items)) return
            reorder(path, (at) => (at === index ? null : at > index ? at - 1 : at), items)
        },
        moveItem: (path, from, to) => {
            const items = valueAt(value, path)
            if (!Array.isArray(items) || from === to || to < 0 || to >= items.length) return
            reorder(
                path,
                (at) => (at === from ? to : from < to && at > from && at <= to ? at - 1 : from > to && at >= to && at < from ? at + 1 : at),
                items,
            )
        },
        itemKeys: (path, length) => keysAt(pointer(path), length),
        sealed: (path) => sealedAt.get(pointer(path)),
        now,
        words,
    }
}

function parsePointer(at: string): Path {
    return at === ''
        ? []
        : at
              .slice(1)
              .split('/')
              .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
              .map((part) => (/^\d+$/.test(part) ? Number(part) : part))
}

/** The schema that describes the value at a path. */
function schemaAt(schema: JsonSchema, path: Path, root: JsonSchema = schema): JsonSchema {
    let at = fieldSchema(schema, root)
    for (const part of path) {
        const next =
            typeof part === 'number'
                ? at.items
                : (at.properties?.[part] ?? (typeof at.additionalProperties === 'object' ? at.additionalProperties : undefined))
        if (next === undefined) return {}
        at = fieldSchema(next, root)
    }
    return at
}

type Kind = 'object' | 'records' | 'list' | 'choices' | 'map' | 'enum' | 'boolean' | 'number' | 'scalars' | 'text' | 'longtext' | 'json'

function kindOf(at: JsonSchema, root: JsonSchema): Kind {
    const main = types(at).main
    if (at.properties !== undefined) return 'object'
    if (main[0] === 'array' && at.items !== undefined) {
        const items = fieldSchema(at.items, root)
        if (items.enum !== undefined) return 'choices'
        if (items.properties !== undefined) return 'records'
        const kind = kindOf(items, root)
        return kind === 'json' || kind === 'object' || kind === 'map' ? 'json' : 'list'
    }
    // An object of any keys whose values are each one scalar, such as headers or environment variables.
    if (typeof at.additionalProperties === 'object' && (main.length === 0 || main[0] === 'object')) {
        const kind = kindOf(fieldSchema(at.additionalProperties, root), root)
        return kind === 'enum' || kind === 'boolean' || kind === 'number' || kind === 'scalars' || kind === 'text' ? 'map' : 'json'
    }
    if (at.enum !== undefined) return 'enum'
    if (scalarUnion(at, root) !== undefined) return 'scalars'
    if (main.length > 1) return 'json'
    switch (main[0]) {
        case 'boolean':
            return 'boolean'
        case 'number':
        case 'integer':
            return 'number'
        case 'string':
            return (at.maxLength ?? 0) > 200 || at.format === 'markdown' || at.contentMediaType !== undefined ? 'longtext' : 'text'
        default:
            return 'json'
    }
}

/** Whether a field takes half a row: numbers, choices, switches, dates and short text. */
function short(at: JsonSchema, kind: Kind): boolean {
    if (kind === 'number' || kind === 'enum' || kind === 'boolean' || kind === 'scalars') return true
    if (kind !== 'text') return false
    return at.format === 'date' || at.format === 'email' || (at.maxLength !== undefined && at.maxLength <= 64) || at.pattern !== undefined
}

/** A control's frame: the input, and the mark at its end once it has something to say. */
function Marked({ form, path, children, top = false }: { form: SchemaFormState; path: Path; children: ReactNode; top?: boolean }) {
    const at = pointer(path)
    return (
        <div className="relative min-w-0">
            {children}
            <IssueMark
                issues={form.shown(path)}
                open={form.open === at}
                onOpenChange={(open) => form.setOpen(open ? at : null)}
                className={top ? 'top-1 bottom-auto my-0' : undefined}
            />
        </div>
    )
}

function edge(form: SchemaFormState, path: Path): string | undefined {
    const tone = worst(form.shown(path))
    return tone === null ? undefined : cn('pr-9', ISSUE_EDGE[tone])
}

/** The schema default an unset field shows as what applies, or undefined when it has none to show. */
function shownDefault(at: JsonSchema, value: unknown): unknown {
    return value === undefined && at.default !== null ? at.default : undefined
}

/** What an app's own control for a schema field is given: where it is, what it holds, and how to change it. */
export interface SchemaFieldControl {
    path: Path
    /** The field's schema, its references followed. */
    schema: JsonSchema
    value: unknown
    set: (value: unknown) => void
    /** Marks the field as left, so its issues show; call it on blur. */
    touch: () => void
    /** The id the field's label points at; give it to the control's input. */
    id: string
    invalid: boolean
    readOnly: boolean
    /** The field's name, for a control drawn without its own label, such as a list's item. */
    label?: string
}

/**
 * An app's own field in parts: the `control` the issue mark sits at the end of, a row `below` it
 * (a preview, a hint the app draws), and a `note` beside the label.
 */
export interface SchemaFieldParts {
    control: ReactNode
    below?: ReactNode
    note?: ReactNode
}

/** An app's own control for a field, or its parts, or undefined to draw the form's own. */
export type SchemaFieldRenderer = (field: SchemaFieldControl) => ReactNode | SchemaFieldParts | undefined

/** An app's answer as parts, a bare control taken as the control alone. */
function partsOf(answer: ReactNode | SchemaFieldParts): SchemaFieldParts {
    return answer !== null && typeof answer === 'object' && 'control' in answer ? answer : { control: answer }
}

const FieldRendererContext = createContext<SchemaFieldRenderer | undefined>(undefined)

/** How the form marks its fields: required ones by a star or the word, and whether a default is said under its field. */
interface FieldLook {
    requiredMark: RequiredMark
    fallbacks: boolean
    /** The word a required field is marked by. */
    required: string
}

const FieldLookContext = createContext<FieldLook>({ requiredMark: 'star', fallbacks: false, required: WORDS.required })

function Control({
    form,
    path,
    at,
    label,
    name,
    held,
    ask = true,
    required = false,
}: {
    form: SchemaFormState
    path: Path
    at: JsonSchema
    label?: string
    /** The field's name where its label is drawn apart, for a control that names a button by it (a secret's Replace). */
    name?: string
    /** The value and its setter where they are held outside the form's value, as a map's row is while its key is unsettled. */
    held?: { value: unknown; set: (value: unknown) => void }
    /** The control says it is required, as its label's mark shows. */
    required?: boolean
    /** Whether to ask the app's `field` for this field, false where its property already did. */
    ask?: boolean
}) {
    const kind = kindOf(at, form.schema)
    const value = held === undefined ? valueAt(form.value, path) : held.value
    const set = held === undefined ? (next: unknown) => form.set(path, next) : held.set
    const id = form.id(path)
    const invalid = worst(form.shown(path)) === 'critical' || undefined
    const renderer = useContext(FieldRendererContext)
    const custom = (ask ? renderer : undefined)?.({
        path,
        schema: at,
        value,
        set,
        touch: () => form.touch(path),
        id,
        invalid: invalid === true,
        readOnly: at.readOnly === true,
        label,
    })
    if (custom !== undefined && custom !== null) {
        const { control, below } = partsOf(custom)
        return (
            <>
                <Marked form={form} path={path}>
                    {control}
                </Marked>
                {below}
            </>
        )
    }
    const fallback = shownDefault(at, value)
    // An unset field with a default shows it, muted, as what applies: "normal (default)".
    const placeholder =
        fallback === undefined ? undefined : `${typeof fallback === 'string' ? fallback : literal(fallback)} (${form.words.default})`
    const common = {
        id,
        'aria-label': label,
        'aria-invalid': invalid,
        'aria-required': required || undefined,
        onBlur: () => form.touch(path),
        readOnly: at.readOnly === true,
        placeholder,
    }
    switch (kind) {
        case 'enum': {
            const items = [
                ...(types(at).nullable || at.default === undefined ? [{ value: '', label: form.words.none }] : []),
                ...(at.enum ?? []).map((one) => ({ value: JSON.stringify(one), label: typeof one === 'string' ? one : literal(one) })),
            ]
            return (
                <Marked form={form} path={path}>
                    <Select
                        items={items}
                        // Unset with a default, the trigger shows the default as its placeholder.
                        value={given(value) ? JSON.stringify(value) : fallback === undefined ? '' : null}
                        onValueChange={(next) => {
                            set(next === '' || next === null ? undefined : (JSON.parse(next as string) as unknown))
                            form.touch(path)
                        }}
                        disabled={at.readOnly === true}
                    >
                        <SelectTrigger
                            id={id}
                            aria-label={label}
                            aria-invalid={invalid}
                            aria-required={required || undefined}
                            className={cn('w-full', edge(form, path))}
                        >
                            <SelectValue placeholder={placeholder ?? form.words.choose} />
                        </SelectTrigger>
                        <SelectContent>
                            {items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Marked>
            )
        }
        case 'number': {
            // The field reads, writes and steps within the bounds; a value past them is said by the schema's checks, with their fix.
            const said = (expected: string) => form.words.say({ kind: 'type', expected, path, tone: 'critical' }, at).text
            const unreadable = [said('number'), said('integer')]
            return (
                <Marked form={form} path={path}>
                    <NumberField
                        bare
                        id={id}
                        label={label ?? ''}
                        required={required}
                        issues={form.shown(path)}
                        value={typeof value === 'number' ? value : null}
                        onValueChange={(next) => set(next ?? undefined)}
                        onIssueChange={(issue) => form.setUnread(path, issue !== null && unreadable.includes(issue.text))}
                        integer={types(at).main[0] === 'integer'}
                        min={at.minimum}
                        max={at.maximum}
                        step={typeof at.multipleOf === 'number' ? at.multipleOf : undefined}
                        readOnly={at.readOnly === true}
                        placeholder={placeholder}
                        onBlur={() => form.touch(path)}
                        className={edge(form, path)}
                        words={{ unreadable: unreadable[0], whole: unreadable[1] }}
                    />
                </Marked>
            )
        }
        case 'longtext':
            return (
                <Marked form={form} path={path} top>
                    <Textarea
                        {...common}
                        rows={4}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => set(event.target.value === '' ? undefined : event.target.value)}
                        className={edge(form, path)}
                    />
                </Marked>
            )
        case 'scalars': {
            // Typed text is the narrowest value it reads as, kept as typed while that writes back otherwise ("1." for 1).
            const allowed = scalarUnion(at, form.schema) ?? []
            return (
                <Marked form={form} path={path}>
                    <Input
                        {...common}
                        value={form.draft(path) ?? (given(value) ? String(value) : '')}
                        onChange={(event) => {
                            set(readScalar(event.target.value, allowed))
                            form.setDraft(path, event.target.value)
                        }}
                        className={edge(form, path)}
                    />
                </Marked>
            )
        }
        case 'json': {
            const text = form.draft(path) ?? (value === undefined ? '' : JSON.stringify(value, null, 2))
            return (
                <Marked form={form} path={path} top>
                    <Textarea
                        {...common}
                        placeholder={undefined}
                        rows={4}
                        spellCheck={false}
                        value={text}
                        onChange={(event) => {
                            const raw = event.target.value
                            try {
                                set(raw.trim() === '' ? undefined : (JSON.parse(raw) as unknown))
                            } catch {
                                // The text stays as typed and says it does not parse.
                            }
                            form.setDraft(path, raw)
                        }}
                        className={cn('font-mono text-xs', edge(form, path))}
                    />
                </Marked>
            )
        }
        default: {
            if (at.writeOnly === true) {
                const secret = form.sealed(path)
                return (
                    <Marked form={form} path={path}>
                        <SecretField
                            bare
                            id={id}
                            label={label ?? name ?? ''}
                            issues={form.shown(path)}
                            value={typeof value === 'string' && value !== '' ? value : undefined}
                            onChange={set}
                            sealed={secret !== undefined}
                            setAt={secret?.setAt}
                            now={form.now}
                            readOnly={at.readOnly === true}
                            onBlur={() => form.touch(path)}
                            className={edge(form, path)}
                            words={form.words.secret}
                        />
                    </Marked>
                )
            }
            const mono = at.pattern !== undefined || at.format === 'uri' || at.format === 'uuid' || at.format === 'hostname'
            return (
                <Marked form={form} path={path}>
                    <Input
                        {...common}
                        type={at.format === 'date' ? 'date' : 'text'}
                        value={typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)}
                        onChange={(event) => set(event.target.value === '' ? undefined : event.target.value)}
                        className={cn(mono && 'font-mono', edge(form, path))}
                    />
                </Marked>
            )
        }
    }
}

/** The label a field is drawn with: its title, else its key in mono; the key beside a title that does not already say it. */
function labelOf(at: JsonSchema, name: string): { label: string; mono: boolean; hint?: string } {
    if (at.title === undefined) return { label: name, mono: true }
    const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
    return { label: at.title, mono: false, hint: plain(at.title) === plain(name) ? undefined : name }
}

/** A list's head: its label, the mark for what is wrong with the list as a whole, and Add. */
function ListHead({ form, path, title, onAdd }: { form: SchemaFormState; path: Path; title: ReactNode; onAdd?: () => void }) {
    const at = pointer(path)
    return (
        <div className="flex min-h-7 items-center gap-2">
            <div id={form.id(path)} tabIndex={-1} className="min-w-0 truncate text-sm font-medium outline-none">
                {title}
            </div>
            <span className="relative flex size-7 shrink-0 items-center">
                <IssueMark
                    issues={form.shown(path)}
                    open={form.open === at}
                    onOpenChange={(open) => form.setOpen(open ? at : null)}
                    className="inset-0 right-0"
                />
            </span>
            {onAdd !== undefined && (
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onAdd}>
                    <Plus aria-hidden />
                    {form.words.add}
                </Button>
            )}
        </div>
    )
}

function Title({ label, mono, hint, required }: { label: string; mono: boolean; hint?: string; required: boolean }) {
    const look = useContext(FieldLookContext)
    return (
        <span className="flex min-w-0 items-baseline gap-2">
            <span className={cn(mono && 'font-mono')}>
                {label}
                {required && look.requiredMark === 'star' && (
                    <span className="text-critical-ink" aria-hidden>
                        {' '}
                        *
                    </span>
                )}
            </span>
            {required && look.requiredMark === 'word' && <span className="text-xs font-normal text-muted-foreground">{look.required}</span>}
            {hint !== undefined && <span className="font-mono text-xs font-normal text-muted-foreground">{hint}</span>}
        </span>
    )
}

/** A read-only schema's own properties marked read-only too, so a locked object or item locks what it holds. */
function lock(schema: JsonSchema): JsonSchema {
    const properties =
        schema.properties === undefined
            ? undefined
            : Object.fromEntries(Object.entries(schema.properties).map(([name, child]) => [name, { ...child, readOnly: true }]))
    return { ...schema, readOnly: true, properties }
}

/** One property of an object: its label, its help, and the control or the fields it opens into. */
function Property({
    form,
    path,
    schema,
    name,
    required,
}: {
    form: SchemaFormState
    path: Path
    schema: JsonSchema
    name: string
    required: boolean
}) {
    const at = fieldSchema(schema, form.schema)
    const kind = kindOf(at, form.schema)
    const { label, mono, hint } = labelOf(at, name)
    const span = short(at, kind) ? undefined : '@lg:col-span-2'
    const value = valueAt(form.value, path)
    const locked = at.readOnly === true
    const look = useContext(FieldLookContext)
    const fallback = look.fallbacks && at.default !== undefined && at.default !== null ? form.words.fallback(at.default) : undefined

    // The app's own control for any field, a whole object, list or choice among them, in the form's frame.
    const custom = useContext(FieldRendererContext)?.({
        path,
        schema: at,
        value,
        set: (next) => form.set(path, next),
        touch: () => form.touch(path),
        id: form.id(path),
        invalid: worst(form.shown(path)) === 'critical',
        readOnly: locked,
        label,
    })
    if (custom !== undefined && custom !== null) {
        const { control, below, note } = partsOf(custom)
        return (
            <Field
                id={form.id(path)}
                label={label}
                mono={mono}
                hint={hint}
                keyHint={hint !== undefined}
                note={note}
                required={required}
                requiredMark={look.requiredMark}
                help={at.description}
                fallback={fallback}
                className={span}
                words={{ required: form.words.required }}
            >
                <Marked form={form} path={path}>
                    {control}
                </Marked>
                {below}
            </Field>
        )
    }

    if (kind === 'object')
        return (
            <fieldset className={cn('flex min-w-0 flex-col gap-3 rounded-surface border border-border p-3', '@lg:col-span-2')}>
                <legend className="px-1 text-sm font-medium">
                    <Title label={label} mono={mono} hint={hint} required={required} />
                </legend>
                {at.description !== undefined && <p className="-mt-1 text-xs text-muted-foreground">{at.description}</p>}
                <Fields form={form} path={path} schema={locked ? lock(at) : at} />
            </fieldset>
        )

    if (kind === 'boolean')
        return (
            <div className={cn('flex min-w-0 items-center gap-2', span)}>
                <div className="min-w-0 flex-1">
                    <SwitchField
                        id={form.id(path)}
                        label={label}
                        explain={at.description}
                        checked={value === undefined ? at.default === true : value === true}
                        note={value === undefined && typeof at.default === 'boolean' ? form.words.default : undefined}
                        onCheckedChange={(checked) => form.set(path, checked)}
                        disabled={at.readOnly === true}
                    />
                </div>
                {form.shown(path).length > 0 && (
                    <span className="relative flex size-7 shrink-0">
                        <IssueMark
                            issues={form.shown(path)}
                            open={form.open === pointer(path)}
                            onOpenChange={(open) => form.setOpen(open ? pointer(path) : null)}
                            className="inset-0 right-0"
                        />
                    </span>
                )}
            </div>
        )

    const items = Array.isArray(value) ? value : []
    const item = kind === 'map' ? at.additionalProperties : at.items
    const resolvedItem = typeof item === 'object' ? fieldSchema(item, form.schema) : {}
    const itemSchema = locked ? lock(resolvedItem) : resolvedItem

    if (kind === 'choices')
        return (
            <div className={cn('flex min-w-0 flex-col gap-2', span)}>
                <ListHead form={form} path={path} title={<Title label={label} mono={mono} hint={hint} required={required} />} />
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {(itemSchema.enum ?? []).map((one) => {
                        const key = JSON.stringify(one)
                        const on = items.some((item) => JSON.stringify(item) === key)
                        return (
                            <label key={key} className="flex items-center gap-2 text-sm">
                                <PlainCheckbox
                                    checked={on}
                                    disabled={locked}
                                    onCheckedChange={(checked) => {
                                        form.set(path, checked ? [...items, one] : items.filter((item) => JSON.stringify(item) !== key))
                                        form.touch(path)
                                    }}
                                />
                                {typeof one === 'string' ? one : literal(one)}
                            </label>
                        )
                    })}
                </div>
                {at.description !== undefined && <p className="text-xs text-muted-foreground">{at.description}</p>}
            </div>
        )

    if (kind === 'records') {
        const keys = form.itemKeys(path, items.length)
        const indexOf = (key: string) => keys.indexOf(key)
        return (
            <RepeatedGroup
                id={form.id(path)}
                label={<Title label={label} mono={mono} hint={hint} required={false} />}
                required={required}
                requiredMark={look.requiredMark}
                description={at.description}
                issues={form.shown(path)}
                issueOpen={form.open === pointer(path)}
                onIssueOpenChange={(open) => form.setOpen(open ? pointer(path) : null)}
                rows={keys.map((key) => ({ key }))}
                onAdd={() => form.set(path, [...items, initialValue(at.items ?? {}, form.schema)])}
                onRemove={(key) => form.removeItem(path, indexOf(key))}
                onMove={(key, by) => form.moveItem(path, indexOf(key), indexOf(key) + by)}
                readOnly={locked}
                words={{
                    add: form.words.add,
                    remove: form.words.remove,
                    moveUp: form.words.moveUp,
                    moveDown: form.words.moveDown,
                    item: form.words.item,
                    required: form.words.required,
                }}
                className="@lg:col-span-2"
            >
                {(_, index) => <Fields form={form} path={[...path, index]} schema={itemSchema} />}
            </RepeatedGroup>
        )
    }

    if (kind === 'map') {
        const head = (onAdd?: () => void) => (
            <>
                <ListHead
                    form={form}
                    path={path}
                    title={<Title label={label} mono={mono} hint={hint} required={required} />}
                    onAdd={onAdd}
                />
                {at.description !== undefined && <p className="-mt-1 text-xs text-muted-foreground">{at.description}</p>}
            </>
        )
        return (
            <div className="flex min-w-0 flex-col gap-2 @lg:col-span-2">
                <MapField
                    form={form}
                    path={path}
                    at={at}
                    readOnly={locked}
                    head={head}
                    control={(where, held, name) => <Control form={form} path={where} at={itemSchema} label={name} held={held} />}
                />
            </div>
        )
    }

    if (kind === 'list') {
        const addOne = () => form.set(path, [...items, initialValue(at.items ?? {}, form.schema)])
        const removeAt = (index: number) => form.removeItem(path, index)
        const keys = form.itemKeys(path, items.length)
        const moves = (index: number) =>
            locked || items.length < 2 ? null : (
                <>
                    <IconButton
                        label={`${form.words.moveUp}: ${form.words.item(index)}`}
                        type="button"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => form.moveItem(path, index, index - 1)}
                    >
                        <ArrowUp aria-hidden />
                    </IconButton>
                    <IconButton
                        label={`${form.words.moveDown}: ${form.words.item(index)}`}
                        type="button"
                        size="icon"
                        disabled={index === items.length - 1}
                        onClick={() => form.moveItem(path, index, index + 1)}
                    >
                        <ArrowDown aria-hidden />
                    </IconButton>
                </>
            )
        return (
            <div className="flex min-w-0 flex-col gap-2 @lg:col-span-2">
                <ListHead
                    form={form}
                    path={path}
                    title={<Title label={label} mono={mono} hint={hint} required={required} />}
                    onAdd={locked ? undefined : addOne}
                />
                {at.description !== undefined && <p className="-mt-1 text-xs text-muted-foreground">{at.description}</p>}
                {items.map((_, index) => (
                    <div key={keys[index]} className="flex min-w-0 items-center gap-1.5">
                        <div className="min-w-0 flex-1">
                            <Control form={form} path={[...path, index]} at={itemSchema} label={`${label} ${String(index + 1)}`} />
                        </div>
                        {moves(index)}
                        {!locked && (
                            <IconButton
                                label={`${form.words.remove} ${form.words.item(index)}`}
                                type="button"
                                size="icon"
                                onClick={() => removeAt(index)}
                            >
                                <X aria-hidden />
                            </IconButton>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Field
            id={form.id(path)}
            label={label}
            mono={mono}
            hint={hint}
            keyHint={hint !== undefined}
            required={required}
            requiredMark={look.requiredMark}
            help={at.description}
            fallback={fallback}
            className={span}
            words={{ required: form.words.required }}
        >
            <Control form={form} path={path} at={at} name={label} ask={false} required={required} />
        </Field>
    )
}

/** An object's properties laid out in rows: half-width fields pair up when the form is wide enough. */
function Fields({ form, path, schema: raw, fold = false }: { form: SchemaFormState; path: Path; schema: JsonSchema; fold?: boolean }) {
    // A read-only object, the form's root or a list's item among them, locks every field it holds.
    const schema = raw.readOnly === true ? lock(raw) : raw
    const required = new Set(schema.required ?? [])
    const entries = Object.entries(schema.properties ?? {})
    // Folded, the fields that are neither required nor set when the form is first drawn wait behind one disclosure.
    const [folded] = useState(() =>
        fold ? entries.map(([name]) => name).filter((name) => !required.has(name) && !given(valueAt(form.value, [...path, name]))) : [],
    )
    const [open, setOpen] = useState(false)
    const at = (name: string) => form.id([...path, name])
    // A folded field with an issue to show opens the fold, so the count and a submit can reach it.
    const opened =
        open || form.list.some(({ target = '' }) => folded.some((name) => target === at(name) || target.startsWith(`${at(name)}_`)))
    return (
        <div className="@container">
            <div className="grid gap-x-5 gap-y-4 @lg:grid-cols-2">
                {entries
                    .filter(([name]) => opened || !folded.includes(name))
                    .map(([name, child]) => (
                        <Property key={name} form={form} path={[...path, name]} schema={child} name={name} required={required.has(name)} />
                    ))}
                {folded.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={opened}
                        className="-ml-2.5 justify-self-start @lg:col-span-2"
                        onClick={() => setOpen(!opened)}
                    >
                        {opened ? form.words.fewer : form.words.more(folded.length)}
                    </Button>
                )}
            </div>
        </div>
    )
}

export interface SchemaFormProps {
    form: SchemaFormState
    /** Marks each issue on a strip along the scroll area's edge while the form scrolls (`IssueMarks`). */
    marks?: boolean
    /**
     * An app's own control for a field, such as a file, a typed date, a searchable choice or code
     * by its `contentMediaType`: called for each field, it answers a control or undefined for the
     * form's own. The form keeps the label, the help and the issue marks around it.
     */
    field?: SchemaFieldRenderer
    /** How required fields are marked: a star in the label, or the word after it (`words.required`). */
    requiredMark?: RequiredMark
    /** Says a field's schema `default` under it, as what applies when it is left empty (`words.fallback`). */
    fallbacks?: boolean
    /**
     * Shows the required fields and those already set when the form is first drawn, and puts the
     * rest behind one disclosure ("3 more fields", `words.more`), opened by itself when one of them
     * has an issue to show.
     */
    fold?: boolean
    className?: string
}

/**
 * A form drawn from a JSON Schema and held by `useSchemaForm`: a field for each property, in the
 * schema's order, labeled by its title with the key beside it (or by the key alone in mono), its
 * description as help. Strings, numbers, enums, booleans, nested objects, lists of values, lists of
 * objects, sets of choices, maps of scalars (a key and a value per row) and choices of scalar types
 * (one text box, read as the narrowest type it parses as) each get their own control; anything else
 * is edited as JSON. An unset field with a schema `default` shows it, muted, as what applies.
 *
 * What is wrong is checked against the schema, and said the way every form here says it: a colored
 * edge and a mark at the end of the input, which opens the message and a fix when one is plain.
 * Nothing is inserted between fields, so the form keeps its height. Put `SchemaIssueCount` beside
 * the submit verb. While the form scrolls, a strip along the scroll area's edge marks where each
 * issue sits.
 *
 * `requiredMark="word"` marks each required field with the word after its label rather than a star
 * in it, and `fallbacks` says each field's schema `default` under it, as what applies when it is
 * left empty.
 */
export function SchemaForm({
    form,
    marks = true,
    field,
    requiredMark = 'star',
    fallbacks = false,
    fold = false,
    className,
}: SchemaFormProps) {
    const root = fieldSchema(form.schema, form.schema)
    const whole = form.shown([])
    const look = useMemo(() => ({ requiredMark, fallbacks, required: form.words.required }), [requiredMark, fallbacks, form.words.required])
    return (
        <div className={cn('flex min-w-0 flex-col gap-4', className)}>
            {marks && <IssueMarks list={form.list} />}
            {whole.length > 0 && (
                <Banner tone="critical">
                    {whole.map((issue) => (
                        <p key={issue.text}>
                            {issue.text}
                            {issue.detail !== undefined && <span className="block text-xs opacity-80">{issue.detail}</span>}
                        </p>
                    ))}
                </Banner>
            )}
            <FieldLookContext value={look}>
                <FieldRendererContext value={field}>
                    <Fields form={form} path={[]} schema={root} fold={fold} />
                </FieldRendererContext>
            </FieldLookContext>
        </div>
    )
}

export interface SchemaIssueCountProps {
    form: SchemaFormState
}

/** How many things stop the submit, for the footer beside the verb; pressing it opens the first. */
export function SchemaIssueCount({ form }: SchemaIssueCountProps) {
    return <IssueCount critical={form.count.critical} warning={form.count.warning} list={form.list} />
}
