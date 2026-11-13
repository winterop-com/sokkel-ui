import { CircleAlert, CloudUpload, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useFileDrop } from '../hooks/use-file-drop'
import { cn } from '../lib/cn'
import { acceptList, checkFiles, type CheckedRefusal, type RefusalReason } from '../lib/uploads'
import { AttachmentList, type AttachmentListWords } from './AttachmentList'
import { Field, FIELD_WORDS, describedBy, type FieldWords } from './Field'
import { formatSize } from './FileList'
import type { Issue } from './IssueMark'
import { Button } from './ui/button'

export { checkFiles, type CheckedFiles, type CheckedRefusal, type RefusalReason } from '../lib/uploads'

/** A file the field did not take, and why. */
export interface FileRefusal {
    file: File
    reason: RefusalReason
    /** The reason said in words, as the field says it: "too large: 12 MB, at most 10 MB". */
    message: string
}

/** The words a file field says. */
export interface FileFieldWords extends FieldWords {
    /** The button that opens the picker, by how many files the field takes. */
    choose: (many: boolean) => string
    /** What the zone says it takes, by how many files the field takes. */
    drop: (many: boolean) => string
    /** Said over the zone while files are dragged over it. */
    dropping: string
    /** A family of types in `accept`, such as `image/*`: "image files". */
    family: (family: string) => string
    /** The accepted types as one phrase: "CSV or YAML". */
    either: (types: readonly string[]) => string
    /** The size limit under the zone, each file's when the field takes several. */
    sizeLimit: (limit: string, each: boolean) => string
    /** The count limit under the zone. */
    countLimit: (limit: number) => string
    /** A file of a type not taken. */
    type: (types: string) => string
    /** A file larger than the limit, with its size and the limit. */
    size: (size: string, limit: string) => string
    /** A file past the count limit. */
    count: (limit: number) => string
    /** The button that forgets a refused file, once read. */
    dismiss: (name: string) => string
    /** The chosen files' words: remove, cancel and uploading. */
    files: Partial<AttachmentListWords>
}

const listFormat = new Intl.ListFormat('en-US', { type: 'disjunction' })

export const FILE_FIELD_WORDS: FileFieldWords = {
    ...FIELD_WORDS,
    choose: (many) => (many ? 'Choose files' : 'Choose a file'),
    drop: (many) => (many ? 'Drop files here' : 'Drop a file here'),
    dropping: 'Drop to add',
    family: (family) => `${family} files`,
    either: (types) => listFormat.format(types),
    sizeLimit: (limit, each) => (each ? `up to ${limit} each` : `up to ${limit}`),
    countLimit: (limit) => (limit === 1 ? 'one file' : `at most ${String(limit)} files`),
    type: (types) => `wrong type: ${types} only`,
    size: (size, limit) => `too large: ${size}, at most ${limit}`,
    count: (limit) => `too many: at most ${String(limit)} ${limit === 1 ? 'file' : 'files'}`,
    dismiss: (name) => `Dismiss ${name}`,
    files: {},
}

/**
 * The accepted types as a reader names them: an extension or a MIME type's subtype in capitals
 * (`.csv` and `text/csv` are "CSV"), a family by `words.family` ("image files"), each once.
 */
export function typeNames(
    accept: string | readonly string[] | undefined,
    words: Pick<FileFieldWords, 'family'> = FILE_FIELD_WORDS,
): string[] {
    const names = acceptList(accept).map((part) => {
        if (part.startsWith('.')) return part.slice(1).toUpperCase()
        if (part.endsWith('/*')) return words.family(part.slice(0, -2))
        return (part.split('/')[1] ?? part).replace(/^x-/, '').toUpperCase()
    })
    return [...new Set(names)]
}

/** The limits the field holds files to. */
export interface FileLimits {
    /** The accepted types as said, such as "CSV or YAML". */
    types?: string
    maxSize?: number
    maxFiles?: number
}

/** Why a file is refused, said as the field says it: "too large: 12 MB, at most 10 MB". */
export function refusalText(
    reason: RefusalReason,
    file: { size: number },
    limits: FileLimits,
    words: Pick<FileFieldWords, 'type' | 'size' | 'count'> = FILE_FIELD_WORDS,
): string {
    if (reason === 'type') return words.type(limits.types ?? '')
    if (reason === 'size') return words.size(formatSize(file.size), formatSize(limits.maxSize ?? 0))
    return words.count(limits.maxFiles ?? 0)
}

/** The limits said in one line under the zone, starting with a capital: "CSV or YAML · up to 10 MB each · at most 5 files". */
export function limitsText(limits: FileLimits, words: Pick<FileFieldWords, 'sizeLimit' | 'countLimit'> = FILE_FIELD_WORDS): string {
    const many = limits.maxFiles !== 1
    const line = [
        limits.types,
        limits.maxSize === undefined ? undefined : words.sizeLimit(formatSize(limits.maxSize), many),
        limits.maxFiles === undefined ? undefined : words.countLimit(limits.maxFiles),
    ]
        .filter((part) => part !== undefined && part !== '')
        .join(' · ')
    return line.charAt(0).toUpperCase() + line.slice(1)
}

/** Pictures of the image files among `files`, made once per file and let go when the file leaves or the field unmounts. */
function usePreviews(files: readonly File[], on: boolean): ReadonlyMap<File, string> {
    const made = useRef(new Map<File, string>())
    const [previews, setPreviews] = useState<ReadonlyMap<File, string>>(new Map())
    useEffect(() => {
        const kept = made.current
        let changed = false
        for (const [file, url] of kept) {
            if (on && files.includes(file)) continue
            URL.revokeObjectURL(url)
            kept.delete(file)
            changed = true
        }
        if (on) {
            for (const file of files) {
                if (!file.type.startsWith('image/') || kept.has(file)) continue
                kept.set(file, URL.createObjectURL(file))
                changed = true
            }
        }
        if (changed) setPreviews(new Map(kept))
    }, [files, on])
    useEffect(() => {
        const kept = made.current
        return () => {
            for (const url of kept.values()) URL.revokeObjectURL(url)
            kept.clear()
        }
    }, [])
    return previews
}

/** A stable id per file, for the list's keys and its remove buttons. */
function useFileIds() {
    const [ids] = useState(() => ({ of: new WeakMap<File, string>(), count: 0 }))
    return (file: File) => {
        let id = ids.of.get(file)
        if (id === undefined) {
            ids.count += 1
            id = `file-${String(ids.count)}`
            ids.of.set(file, id)
        }
        return id
    }
}

/** A file the field already holds on the server, such as an attachment of a record being edited. */
export interface StoredFile {
    id: string
    name: string
    /** Its size in bytes, said beside its name. */
    size?: number
    /** A picture of it, for an image. */
    image?: string
}

export interface FileFieldProps {
    id: string
    label: string
    /** A short note beside the label. */
    hint?: string
    /** A sentence between the label and the zone: what the question asks. */
    description?: ReactNode
    /** A sentence under the zone. */
    help?: ReactNode
    required?: boolean
    /** Why the files are refused, as one critical issue, such as a required field left empty. */
    error?: string | null
    issues?: readonly Issue[]
    issueOpen?: boolean
    onIssueOpenChange?: (open: boolean) => void
    /** The files chosen. */
    value: readonly File[]
    onChange: (files: File[]) => void
    /**
     * What is taken, as a file input's `accept` says it: MIME types (`image/png`), families
     * (`image/*`) and extensions (`.csv`), as a list or comma-separated. Everything without it.
     */
    accept?: string | readonly string[]
    /** How the accepted types are said under the zone and in a refusal; made from `accept` without it. */
    types?: string
    /** The largest file taken, in bytes. */
    maxSize?: number
    /** The most files held at once; with 1, a file chosen takes the place of the one held. */
    maxFiles?: number
    /** How much of a file has gone up, from 0 to 1, while the app sends it; undefined for one not under way. */
    progress?: (file: File) => number | undefined
    /** Shows a picture of each image file chosen. On by default. */
    previews?: boolean
    /** Hears the files refused by a pick or a drop, with why. */
    onRefuse?: (refused: FileRefusal[]) => void
    /** Files the field holds already, listed before the new ones and counted against `maxFiles`. */
    stored?: readonly StoredFile[]
    /** Takes a stored file out; with `maxFiles` of 1, a new file chosen takes it out too. */
    onRemoveStored?: (id: string) => void
    /** Stops a file going up, its upload aborted, in place of removing it. */
    onCancel?: (file: File) => void
    /** Why a file failed to go up, said in place of its size; nothing while it has not. */
    failed?: (file: File) => string | undefined
    /** Files said as refused on the first render, for a still view of a refusal. */
    defaultRefused?: readonly CheckedRefusal[]
    /**
     * The files said as refused, held from outside with `onRefusedChange`, as when a page-wide
     * `DropZone` hands the field a drop with what it refused.
     */
    refused?: readonly CheckedRefusal[]
    /** Hears the refused files change: a pick or a drop on the field, or one dismissed. */
    onRefusedChange?: (refused: CheckedRefusal[]) => void
    disabled?: boolean
    /** Classes for the field, such as its span in a grid. */
    className?: string
    words?: Partial<FileFieldWords>
}

/**
 * A field that takes files: a zone they are dropped on, with a button that opens the picker, and
 * under it the limits it holds them to (the types in `accept`, `maxSize` and `maxFiles`). A file
 * that breaks a limit is not taken, and is said under the zone with why ("too large: 12 MB, at most
 * 10 MB") until it is dismissed or the next files come; the files taken are listed under that, each
 * with its size, a picture when it is an image, and a remove button.
 *
 * It sits in a `Field` as the other inputs do, with its label, description, help and issue mark;
 * the label names the button. With `maxFiles` of 1 a file chosen takes the place of the one held.
 *
 * The field holds `File`s and sends none: an app that sends them as they are chosen says how far
 * each has got through `progress`, and the list draws a ring for it, its button then cancelling
 * (`onCancel`); `useUploads` runs such uploads, and `useAttachmentField` ties both to the field.
 * Files held already, as when a record is edited, come as `stored`, listed first and removed
 * through `onRemoveStored`. `refused` with `onRefusedChange` holds the refused files from outside,
 * so files dropped on a page-wide `DropZone` with the field's limits reach it with what it refused.
 */
export function FileField({
    id,
    label,
    hint,
    description,
    help,
    required,
    error,
    issues = [],
    issueOpen,
    onIssueOpenChange,
    value,
    onChange,
    accept,
    types: givenTypes,
    maxSize,
    maxFiles,
    progress,
    previews: showPreviews = true,
    onRefuse,
    stored = [],
    onRemoveStored,
    onCancel,
    failed,
    defaultRefused = [],
    refused: refusedProp,
    onRefusedChange,
    disabled = false,
    className,
    words: given,
}: FileFieldProps) {
    const words = { ...FILE_FIELD_WORDS, ...given }
    const picker = useRef<HTMLInputElement>(null)
    const [ownRefused, setOwnRefused] = useState<readonly CheckedRefusal[]>(defaultRefused)
    const refused = refusedProp ?? ownRefused
    const setRefused = (next: CheckedRefusal[]) => {
        if (refusedProp === undefined) setOwnRefused(next)
        onRefusedChange?.(next)
    }
    const previews = usePreviews(value, showPreviews)
    const idOf = useFileIds()
    const many = maxFiles !== 1
    const names = typeNames(accept, words)
    const limits: FileLimits = { types: givenTypes ?? (names.length === 0 ? undefined : words.either(names)), maxSize, maxFiles }
    const note = limitsText(limits, words)

    const add = (list: readonly File[]) => {
        if (disabled || list.length === 0) return
        const checked = checkFiles(list, { accept, maxSize, maxFiles }, many ? value.length + stored.length : 0)
        setRefused(checked.refused)
        if (checked.refused.length > 0) {
            onRefuse?.(checked.refused.map((one) => ({ ...one, message: refusalText(one.reason, one.file, limits, words) })))
        }
        if (checked.taken.length === 0) return
        if (!many) for (const held of stored) onRemoveStored?.(held.id)
        onChange(many ? [...value, ...checked.taken] : checked.taken)
    }
    const STORED = 'stored:'
    const remove = (fileId: string) => {
        if (fileId.startsWith(STORED)) onRemoveStored?.(fileId.slice(STORED.length))
        else onChange(value.filter((file) => idOf(file) !== fileId))
    }
    const cancel = (fileId: string) => {
        const file = value.find((one) => idOf(one) === fileId)
        if (file !== undefined && onCancel !== undefined) onCancel(file)
        else remove(fileId)
    }
    const drop = useFileDrop(add, !disabled)
    const over = drop.over

    return (
        <div className={cn('flex min-w-0 flex-col gap-2', className)}>
            <Field
                id={id}
                label={label}
                hint={hint}
                description={description}
                help={help}
                required={required}
                words={words}
                error={error}
                issues={issues}
                issueOpen={issueOpen}
                onIssueOpenChange={onIssueOpenChange}
            >
                <div
                    data-slot="file-field-zone"
                    data-over={over || undefined}
                    onClick={(event) => {
                        // A press anywhere on the zone opens the picker, as its button does.
                        if (!disabled && event.target === event.currentTarget) picker.current?.click()
                    }}
                    {...drop.handlers}
                    className={cn(
                        'relative flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-dashed border-border-strong bg-field px-3 py-3 transition-colors',
                        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-hover',
                        over && 'border-primary bg-primary/5',
                    )}
                >
                    <CloudUpload
                        aria-hidden
                        className={cn('pointer-events-none size-5 shrink-0', over ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className="pointer-events-none flex min-w-0 flex-1 basis-32 flex-col">
                        <span className="text-sm font-medium">{over ? words.dropping : words.drop(many)}</span>
                        {note !== '' && <span className="text-help text-muted-foreground">{note}</span>}
                    </span>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        aria-describedby={describedBy(id, { help, description })}
                        onClick={() => picker.current?.click()}
                    >
                        {words.choose(many)}
                    </Button>
                    <input
                        ref={picker}
                        type="file"
                        hidden
                        tabIndex={-1}
                        multiple={many}
                        accept={acceptList(accept).join(',') || undefined}
                        disabled={disabled}
                        onChange={(event) => {
                            add([...(event.target.files ?? [])])
                            event.target.value = ''
                        }}
                    />
                </div>
            </Field>
            {refused.length > 0 && (
                <ul role="alert" className="flex min-w-0 flex-col gap-1">
                    {refused.map((one, index) => (
                        <li key={`${one.file.name}-${String(index)}`} className="flex min-w-0 items-start gap-2 text-help">
                            <CircleAlert aria-hidden className="mt-0.75 size-3.5 shrink-0 text-critical-ink" />
                            <span className="min-w-0 flex-1 text-pretty">
                                <span className="font-medium break-all text-foreground">{one.file.name}</span>{' '}
                                <span className="text-critical-ink">{refusalText(one.reason, one.file, limits, words)}</span>
                            </span>
                            <button
                                type="button"
                                aria-label={words.dismiss(one.file.name)}
                                title={words.dismiss(one.file.name)}
                                onClick={() => setRefused(refused.filter((other) => other !== one))}
                                className="-my-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                                <X aria-hidden className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {value.length + stored.length > 0 && (
                <AttachmentList
                    files={[
                        ...stored.map((held) => ({
                            id: `${STORED}${held.id}`,
                            name: held.name,
                            detail: held.size === undefined ? undefined : formatSize(held.size),
                            image: held.image,
                        })),
                        ...value.map((file) => {
                            const share = progress?.(file)
                            const uploading = share !== undefined && share < 1
                            return {
                                id: idOf(file),
                                name: file.name,
                                detail: failed?.(file) ?? formatSize(file.size),
                                image: previews.get(file),
                                uploading,
                                progress: uploading ? share : undefined,
                            }
                        }),
                    ]}
                    onRemove={disabled ? undefined : remove}
                    onCancel={disabled ? undefined : cancel}
                    words={words.files}
                />
            )}
        </div>
    )
}
