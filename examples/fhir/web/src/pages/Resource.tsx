import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { CodeEditor, type CodeMark, type CodeProblem } from '@winterop-com/sokkel-ui/CodeEditor'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem } from '@winterop-com/sokkel-ui/StatusLine'
import { Braces, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { Refused, type Issue } from '../data/model'
import { template } from '../data/seed'
import { create, parse, remove, resources, SERVER, update } from '../data/server'
import { schemaFor, typeDef } from '../data/types'
import { reveals, setAnswer, setDraft, useAnswer, useDraft } from '../editing'
import { stateOf, titleOf, useFoot, usePrefs, when } from '../ui'

const TONE = { error: 'error', warning: 'warning', information: 'info' } as const

/** The server's findings as marks on the values they are about. */
export function issueMarks(issues: readonly Issue[]): CodeMark[] {
    return issues.map((issue) => ({
        ...(issue.path === undefined || issue.path.length === 0 ? { line: 1 } : { path: issue.path }),
        tone: TONE[issue.severity],
        message: issue.message,
    }))
}

/**
 * One resource as its JSON, checked against its type as it is typed (the elements it knows, their
 * types, required ones and value sets) and saved to the server, which checks it again, references
 * included, and keeps it as a new version. `id` is `new` for a resource not yet on the server.
 */
export function ResourcePage({
    type,
    id,
    onProblems,
}: {
    type: string
    id: string
    onProblems: (problems: readonly CodeProblem[]) => void
}) {
    const { rows, error } = useCollection(resources)
    const [prefs] = usePrefs()
    const making = id === 'new'
    const key = `${type}/${id}`
    const stored = making ? undefined : rows?.find((row) => row.id === key)
    const base = useMemo(
        () => JSON.stringify(making ? template(type) : (stored?.resource ?? {}), null, 2),
        [making, type, stored?.resource],
    )
    const draft = useDraft(key)
    const answer = useAnswer(key)
    const reveal = useStore(reveals)
    const text = draft?.text ?? base
    const version = Number(stored?.resource.meta?.versionId ?? '0')
    const dirty = making ? draft !== undefined : draft !== undefined && draft.text !== base
    const behind = draft !== undefined && !making && draft.readAt !== version
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const schema = useMemo(() => schemaFor(type), [type])
    const def = typeDef(type)
    useFoot(
        making
            ? `A new ${type}, not yet on the server`
            : stored === undefined
              ? undefined
              : `Version ${String(version)} · saved ${when(stored.resource.meta?.lastUpdated)}`,
        dirty ? <StatusItem label="edit">unsaved</StatusItem> : undefined,
        [key, version, dirty, making, stored === undefined],
    )

    const edit = (next: string) => {
        if (!making && next === base) setDraft(key, undefined)
        else setDraft(key, { text: next, readAt: draft?.readAt ?? version })
    }

    const refused = (failure: unknown, verb: string) => {
        if (failure instanceof Refused) {
            setAnswer(key, failure.issues)
            toast.error(`Not ${verb}`, { description: `${String(failure.status)}: ${failure.message}` })
        } else toast.error(`Not ${verb}`, { description: failure instanceof Error ? failure.message : String(failure) })
    }

    const save = () => {
        if (saving) return
        setSaving(true)
        const run = async () => {
            const value = parse(text)
            if (making) {
                const made = await create(type, value)
                setDraft(key, undefined)
                setAnswer(key, [])
                setAnswer(`${type}/${made.resource.id}`, made.warnings)
                toast.success(`${type}/${made.resource.id} created`, { description: 'Saved as version 1.' })
                go(`/resources/${type}/${made.resource.id}`)
                return
            }
            const kept = await update(type, id, value, draft?.readAt ?? version)
            setDraft(key, undefined)
            setAnswer(key, kept.warnings)
            const same = kept.resource.meta?.versionId === String(version)
            if (same) toast('Nothing changed', { description: 'The server kept the version it had.' })
            else toast.success(`Saved as version ${kept.resource.meta?.versionId ?? ''}`, { description: `${key} on ${SERVER.name}` })
        }
        run().then(
            () => setSaving(false),
            (failure: unknown) => {
                setSaving(false)
                refused(failure, making ? 'created' : 'saved')
            },
        )
    }

    const removeIt = () => {
        setSaving(true)
        remove(key).then(
            () => {
                setSaving(false)
                setDeleting(false)
                setDraft(key, undefined)
                toast.success(`${key} deleted`, { description: 'Its versions stay in the history.' })
                go(`/resources/${type}`)
            },
            (failure: unknown) => {
                setSaving(false)
                setDeleting(false)
                refused(failure, 'deleted')
            },
        )
    }

    const state = stored === undefined ? undefined : stateOf(stored.resource)
    const missing = !making && rows !== undefined && stored === undefined

    return (
        <Page className="h-full">
            <PageHeader
                title={making ? `New ${type}` : stored === undefined ? key : titleOf(stored.resource)}
                code={making ? undefined : key}
                onBack={() => go(`/resources/${type}`)}
                words={{ back: `All ${type} resources` }}
                meta={
                    stored === undefined ? (
                        def?.about
                    ) : (
                        <>
                            {state !== undefined && <StatusChip status={state} />}
                            <span>Version {String(version)}</span>
                            <span>{when(stored.resource.meta?.lastUpdated)}</span>
                        </>
                    )
                }
                actions={
                    missing ? undefined : (
                        <>
                            {!making && <ApiLink method="PUT" path={`/${key}`} copyValue={`${SERVER.base}/${key}`} />}
                            {!making && (
                                <Button size="sm" variant="outline" onClick={() => go(`/fhirpath/${key}`)}>
                                    <Braces aria-hidden />
                                    FHIRPath
                                </Button>
                            )}
                            {!making && (
                                <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                                    <Trash2 aria-hidden />
                                    Delete
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDraft(key, undefined)}
                                reason={dirty ? undefined : 'Nothing to revert.'}
                            >
                                <RotateCcw aria-hidden />
                                Revert
                            </Button>
                            <Button size="sm" onClick={save} busy={saving} reason={dirty || making ? undefined : 'Nothing changed.'}>
                                <Save aria-hidden />
                                {making ? 'Create' : 'Save'}
                            </Button>
                        </>
                    )
                }
            />
            <PageState
                loading={rows === undefined && error === undefined}
                error={
                    error ??
                    (missing ? `The server holds no ${key}. It may have been deleted; its versions stay in the history.` : undefined)
                }
                status={missing ? 404 : undefined}
            >
                <CodeEditor
                    key={key}
                    label={making ? `New ${type}` : key}
                    language="json"
                    value={text}
                    onChange={edit}
                    schema={schema}
                    marks={issueMarks(
                        behind
                            ? [
                                  ...answer,
                                  {
                                      severity: 'warning',
                                      code: 'conflict',
                                      message: `This edit started from version ${String(draft.readAt)}; the server has version ${String(version)} now.`,
                                  },
                              ]
                            : answer,
                    )}
                    reveal={reveal}
                    onProblems={onProblems}
                    keys={{ 'Mod-s': save }}
                    lineNumbers={prefs.lineNumbers}
                    wrap={prefs.wrap}
                    size={prefs.size}
                    folding
                    bracketColors
                    search
                    className="min-h-0 flex-1"
                />
            </PageState>
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${key}?`}
                detail="The server refuses while other resources point at it. Its versions stay in the history."
                confirm={{ label: 'Delete', onConfirm: removeIt, busy: saving, busyLabel: 'Deleting', destructive: true }}
            />
        </Page>
    )
}
