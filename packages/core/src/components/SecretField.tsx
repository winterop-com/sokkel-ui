import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type HTMLInputAutoCompleteAttribute, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { FRAME_BUTTON } from './entry'
import { describedBy, Field, type FieldWords, type RequiredMark } from './Field'
import { worst, type Issue } from './IssueMark'
import { RelativeTime } from './RelativeTime'
import { Button } from './ui/button'
import { Input } from './ui/input'

/** The words a secret field says. */
export interface SecretFieldWords extends FieldWords {
    /** Said of a secret that is set, when the app does not say when. */
    set: string
    /** Said of a secret set at a time, given that time said relative to now. */
    setWhen: (when: ReactNode) => ReactNode
    replace: string
    /** Replace's name, given the field's label, so two sealed secrets are told apart: "Replace password". */
    replaceLabel: (label: string) => string
    cancel: string
    show: string
    hide: string
}

export const SECRET_FIELD_WORDS: SecretFieldWords = {
    required: 'required',
    set: 'Set',
    setWhen: (when) => <>Set {when}</>,
    replace: 'Replace',
    // A label that opens on a capitalized word is lowercased there, as mid-sentence; "API token" stays as it is.
    replaceLabel: (label) => `Replace ${/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label}`,
    cancel: 'Cancel',
    show: 'Show',
    hide: 'Hide',
}

export interface SecretFieldProps {
    id: string
    label: string
    /** A short note beside the label: a unit, a format, a default. */
    hint?: string
    /** A sentence between the label and the input: what the question asks. */
    description?: string
    /** A sentence under the input. */
    help?: string
    required?: boolean
    /** How `required` is marked: a star in the label, or the word after it. */
    requiredMark?: RequiredMark
    /** Why the value is refused, as one critical issue. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /**
     * The new secret typed, or undefined while there is none: the one set is left as it is, or,
     * with nothing set, none is given. Never the secret already set, which is not read back.
     */
    value?: string
    onChange?: (value: string | undefined) => void
    /** A secret is already set where the app keeps it: the field shows it as set, sealed, until Replace. */
    sealed?: boolean
    /** When the secret was set, said relative to `now`. */
    setAt?: Date | string
    /** The moment `setAt` is counted from; without it, the clock. */
    now?: Date
    /** Starts open for a new secret, as if Replace was pressed. */
    defaultReplacing?: boolean
    placeholder?: string
    /**
     * What the browser may fill in: `new-password` by default, for a secret being set;
     * `current-password` for a box that asks for one already held, as a sign-in or a confirm does.
     */
    autoComplete?: HTMLInputAutoCompleteAttribute
    /** Set in the code face, as keys and tokens are. */
    mono?: boolean
    readOnly?: boolean
    disabled?: boolean
    onBlur?: () => void
    /** Classes for the field, such as its span in a grid; for the input's frame when `bare`. */
    className?: string
    /** Drawn without its label and issue mark, for a form that draws its own around it: `label` names the input. */
    bare?: boolean
    words?: Partial<SecretFieldWords>
}

/**
 * A secret a form sets but never reads back, such as a connection's token or password. With nothing
 * set it is a masked input with Show. With a secret already set (`sealed`) it says so, masked, and
 * when it was set when `setAt` is given, and leaves it as it is unless Replace is pressed: Replace
 * opens an empty input for the new secret, and Cancel (or Escape) seals it again, dropping what was
 * typed.
 *
 * The value is the new secret, or undefined for none, so a form tells a secret left unchanged from
 * a new one and leaves it out of what it sends. `SchemaForm` draws a property marked `writeOnly`
 * with it, sealed where `useSchemaForm`'s `sealed` says a secret is set.
 */
export function SecretField({
    id,
    label,
    hint,
    description,
    help,
    required,
    requiredMark,
    error,
    issues: given = [],
    issueOpen,
    onIssueOpenChange,
    value,
    onChange,
    sealed = false,
    setAt,
    now,
    defaultReplacing = false,
    placeholder,
    autoComplete = 'new-password',
    mono = true,
    readOnly = false,
    disabled = false,
    onBlur,
    className,
    bare = false,
    words: givenWords,
}: SecretFieldProps) {
    const words = { ...SECRET_FIELD_WORDS, ...givenWords }
    const [replacing, setReplacing] = useState(defaultReplacing)
    const [shown, setShown] = useState(false)
    const open = !sealed || replacing || value !== undefined
    const statusId = useId()
    const input = useRef<HTMLInputElement>(null)
    const replace = useRef<HTMLButtonElement>(null)
    // Where the focus goes as the field opens or seals, once the other control is drawn.
    const moved = useRef<'input' | 'replace' | null>(null)
    useEffect(() => {
        if (moved.current === 'input') input.current?.focus()
        if (moved.current === 'replace') replace.current?.focus()
        moved.current = null
    }, [open])

    const issues: Issue[] = [...(error === undefined || error === null ? [] : [{ tone: 'critical' as const, text: error }]), ...given]
    const tone = worst(issues)
    const editable = !readOnly && !disabled
    const seal = () => {
        moved.current = 'replace'
        setReplacing(false)
        setShown(false)
        onChange?.(undefined)
    }

    const frame = (
        <div
            data-slot="secret-field"
            onPointerDown={(event) => {
                if (!open || (event.target as HTMLElement).closest('button,input,time') !== null) return
                event.preventDefault()
                input.current?.focus()
            }}
            className={cn(
                'flex h-8 w-full min-w-0 items-center gap-1 rounded-control border border-input bg-field pr-1 pl-2.5 text-base transition-colors md:text-sm',
                open ? 'cursor-text focus-within:border-ring focus-within:ring-1 focus-within:ring-ring' : 'bg-muted/40',
                disabled && 'cursor-not-allowed bg-input/50 opacity-50',
                bare && tone === 'critical' && 'border-critical/80 focus-within:border-critical focus-within:ring-critical/25',
                bare && tone === 'warning' && 'border-warning/80 focus-within:border-warning focus-within:ring-warning/25',
                bare && className,
            )}
        >
            {open ? (
                <>
                    <Input
                        bare
                        ref={input}
                        id={id}
                        type={shown ? 'text' : 'password'}
                        value={value ?? ''}
                        placeholder={placeholder}
                        autoComplete={autoComplete}
                        spellCheck={false}
                        readOnly={readOnly}
                        disabled={disabled}
                        aria-label={bare && label !== '' ? label : undefined}
                        aria-invalid={tone === 'critical' || undefined}
                        aria-describedby={describedBy(id, { help, description })}
                        onChange={(event) => onChange?.(event.target.value === '' ? undefined : event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape' && sealed && editable) {
                                event.preventDefault()
                                seal()
                            }
                        }}
                        onBlur={onBlur}
                        className={cn('h-full min-w-0 flex-1', mono && 'font-mono')}
                    />
                    {editable && (
                        <button
                            type="button"
                            aria-label={shown ? words.hide : words.show}
                            aria-pressed={shown}
                            title={shown ? words.hide : words.show}
                            className={FRAME_BUTTON}
                            onClick={() => setShown(!shown)}
                        >
                            {shown ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                        </button>
                    )}
                    {sealed && editable && (
                        <Button type="button" variant="ghost" size="xs" onClick={seal}>
                            {words.cancel}
                        </Button>
                    )}
                </>
            ) : (
                <>
                    <KeyRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="shrink-0 font-mono tracking-widest text-muted-foreground select-none" aria-hidden>
                        ••••••••
                    </span>
                    <span id={statusId} className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {setAt === undefined ? words.set : words.setWhen(<RelativeTime date={setAt} now={now} />)}
                    </span>
                    {editable ? (
                        <Button
                            ref={replace}
                            id={id}
                            type="button"
                            variant="ghost"
                            size="xs"
                            // Named for itself, not by the field's label, which points at it.
                            aria-label={label === '' ? words.replace : words.replaceLabel(label)}
                            aria-describedby={statusId}
                            onClick={() => {
                                moved.current = 'input'
                                setReplacing(true)
                            }}
                            onBlur={onBlur}
                        >
                            {words.replace}
                        </Button>
                    ) : (
                        <span id={id} tabIndex={-1} />
                    )}
                </>
            )}
        </div>
    )
    if (bare) return frame
    return (
        <Field
            id={id}
            label={label}
            hint={hint}
            description={description}
            help={help}
            required={required}
            requiredMark={requiredMark}
            words={{ required: words.required }}
            issues={issues}
            issueOpen={issueOpen}
            onIssueOpenChange={onIssueOpenChange}
            className={className}
        >
            {frame}
        </Field>
    )
}
