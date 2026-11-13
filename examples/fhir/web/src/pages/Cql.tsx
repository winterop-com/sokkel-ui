import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { CodeEditor, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem } from '@winterop-com/sokkel-ui/StatusLine'
import { Plus, RotateCcw, Save, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { fromBase64, Refused, toBase64, type Resource } from '../data/model'
import { LIBRARY_BASE } from '../data/seed'
import { create, history, resources, SERVER, update, type Stored, type Version } from '../data/server'
import { cqlHeader } from '../data/validate'
import { setDraft, useDraft } from '../editing'
import { Pane } from '../pane'
import { count, useFoot, usePrefs, when } from '../ui'
import { issueMarks } from './Resource'

/** A Library's CQL, or nothing when it carries none. */
export function cqlOf(resource: Resource | null | undefined): string | undefined {
    const content = (resource?.content as { contentType?: string; data?: string }[] | undefined)?.find(
        (one) => one.contentType === 'text/cql',
    )
    return content?.data === undefined ? undefined : fromBase64(content.data)
}

const COLUMNS: DataColumn<Stored>[] = [
    {
        id: 'title',
        header: 'Title',
        width: 'minmax(12rem,2fr)',
        cell: (row) => String(row.resource.title ?? row.resource.name ?? row.resource.id),
        sortValue: (row) => String(row.resource.title ?? ''),
    },
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(10rem,1fr)',
        cell: (row) => <span className="font-mono">{String(row.resource.name ?? '')}</span>,
        sortValue: (row) => String(row.resource.name ?? ''),
    },
    {
        id: 'version',
        header: 'Version',
        width: '6rem',
        cell: (row) => <span className="font-mono">{String(row.resource.version ?? '')}</span>,
    },
    {
        id: 'status',
        header: 'State',
        width: '7rem',
        cell: (row) => <StatusChip status={String(row.resource.status ?? 'unknown')} />,
        sortValue: (row) => String(row.resource.status ?? ''),
    },
    { id: 'lines', header: 'Lines', width: '5rem', align: 'end', cell: (row) => (cqlOf(row.resource) ?? '').split('\n').length },
    {
        id: 'updated',
        header: 'Updated',
        width: '11rem',
        cell: (row) => when(row.resource.meta?.lastUpdated),
        sortValue: (row) => row.resource.meta?.lastUpdated ?? '',
    },
]

/** The server's CQL libraries, each opening in the editor. */
export function CqlLibraries() {
    const { rows, error } = useCollection(resources)
    const [busy, setBusy] = useState(false)
    const libraries = (rows ?? []).filter((row) => row.type === 'Library')
    useFoot(count(libraries.length, 'library', 'libraries'), undefined, [libraries.length])
    const make = () => {
        setBusy(true)
        const taken = new Set(libraries.map((row) => String(row.resource.name ?? '')))
        let n = 1
        while (taken.has(`NewLibrary${String(n)}`)) n += 1
        const name = `NewLibrary${String(n)}`
        const cql = `library ${name} version '0.1.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n\ndefine "In Population":\n  true\n`
        create('Library', {
            resourceType: 'Library',
            url: `${LIBRARY_BASE}/${name}`,
            version: '0.1.0',
            name,
            title: `New library ${String(n)}`,
            status: 'draft',
            type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/library-type', code: 'logic-library' }] },
            content: [{ contentType: 'text/cql', data: toBase64(cql) }],
        }).then(
            (made) => {
                setBusy(false)
                go(`/cql/${made.resource.id}`)
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not created', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }
    return (
        <Page className="h-full">
            <PageHeader
                title="CQL"
                description="Clinical Quality Language libraries, kept on the server as Library resources. Each save is a new version, and any two can be compared."
                actions={
                    <>
                        <ApiLink path="/Library" copyValue={`${SERVER.base}/Library`} />
                        <Button size="sm" onClick={make} busy={busy}>
                            <Plus aria-hidden />
                            New
                        </Button>
                    </>
                }
            />
            <PageState loading={rows === undefined && error === undefined} error={error}>
                <DataTable
                    className="min-h-0 flex-1"
                    columns={COLUMNS}
                    rows={libraries}
                    rowKey={(row) => row.id}
                    onOpen={(row) => go(`/cql/${row.resource.id}`)}
                    chevron
                    minWidth="44rem"
                    empty="The server holds no libraries. New makes one."
                />
            </PageState>
        </Page>
    )
}

const VERSION_COLUMNS: DataColumn<Version>[] = [
    { id: 'v', header: 'Version', width: '3rem', stack: 'lead', cell: (row) => <span className="font-mono">v{row.versionId}</span> },
    {
        id: 'status',
        header: 'State',
        width: '9rem',
        stack: 'primary',
        cell: (row) =>
            row.resource === null ? (
                <StatusChip status="delete" />
            ) : (
                <>
                    <span className="font-mono">{String(row.resource.version ?? '')}</span>{' '}
                    <StatusChip status={String(row.resource.status ?? '')} />
                </>
            ),
    },
    { id: 'when', header: 'Saved', width: 'minmax(10rem,1fr)', stack: 'secondary', cell: (row) => `${row.by}, ${when(row.at)}` },
]

/**
 * One CQL library in the editor with the `fhir` plugin's CQL language. Saving checks that the
 * library declares itself, keeps its name and version on the Library from the declaration, and
 * refuses to change an active library without a new version; the versions list compares any one
 * with the text in the editor.
 */
export function CqlEditor({ id }: { id: string }) {
    const { rows, error } = useCollection(resources)
    const { rows: versions } = useCollection(history)
    const [prefs] = usePrefs()
    const key = `Library/${id}`
    const draftKey = `${key}#cql`
    const stored = rows?.find((row) => row.id === key)
    const base = useMemo(() => cqlOf(stored?.resource) ?? '', [stored?.resource])
    const draft = useDraft(draftKey)
    const text = draft?.text ?? base
    const version = Number(stored?.resource.meta?.versionId ?? '0')
    const dirty = draft !== undefined && draft.text !== base
    const [saving, setSaving] = useState(false)
    const [marks, setMarks] = useState<CodeMark[]>([])
    const own = (versions ?? []).filter((row) => row.key === key).sort((left, right) => right.versionId - left.versionId)
    const [compared, setCompared] = useState<number | undefined>(undefined)
    const against = own.find((row) => row.versionId === compared) ?? own[1] ?? own[0]
    const header = cqlHeader(text)
    const status = String(stored?.resource.status ?? '')
    const frozen = status === 'active' && header?.version === stored?.resource.version && text !== base
    useFoot(
        stored === undefined
            ? undefined
            : `${String(stored.resource.name ?? '')} ${String(stored.resource.version ?? '')} · saved as version ${String(version)}`,
        dirty ? <StatusItem label="edit">unsaved</StatusItem> : undefined,
        [key, version, dirty],
    )

    const liveMarks: CodeMark[] = [
        ...(header === undefined
            ? [{ line: 1, tone: 'error' as const, message: "A library starts by declaring itself: library Name version '1.0.0'." }]
            : []),
        ...(frozen && header !== undefined
            ? [
                  {
                      line: header.line,
                      tone: 'warning' as const,
                      message: `${String(stored?.resource.version ?? '')} is active, so its content is fixed. Raise the version to save a change.`,
                  },
              ]
            : []),
        ...marks,
    ]

    const edit = (next: string) => {
        setMarks([])
        setDraft(draftKey, next === base ? undefined : { text: next, readAt: draft?.readAt ?? version })
    }

    const save = (nextStatus?: string) => {
        if (stored === undefined || saving) return
        if (header === undefined) {
            toast.error('Not saved', { description: 'The library does not declare itself on its first line.' })
            return
        }
        if (frozen && nextStatus === undefined) {
            toast.error('Not saved', {
                description: `Version ${String(stored.resource.version ?? '')} is active, so its content is fixed. Raise the version in the declaration.`,
            })
            return
        }
        const raised = header.version !== stored.resource.version
        const resource: Resource = {
            ...stored.resource,
            name: header.name,
            ...(header.version === undefined ? {} : { version: header.version }),
            url: `${LIBRARY_BASE}/${header.name}`,
            // A new version of an active library starts as a draft, to be published again.
            status: nextStatus ?? (raised && status === 'active' ? 'draft' : status),
            date: new Date().toISOString(),
            content: [{ contentType: 'text/cql', data: toBase64(text) }],
        }
        setSaving(true)
        update('Library', id, resource, draft?.readAt ?? version).then(
            (kept) => {
                setSaving(false)
                setDraft(draftKey, undefined)
                toast.success(
                    nextStatus === 'active'
                        ? `${header.name} ${header.version ?? ''} published`
                        : `Saved as version ${kept.resource.meta?.versionId ?? ''}`,
                    {
                        description: `${key} on ${SERVER.name}`,
                    },
                )
            },
            (failure: unknown) => {
                setSaving(false)
                if (failure instanceof Refused) {
                    setMarks(
                        issueMarks(failure.issues).map((mark) =>
                            mark.path === undefined ? mark : { line: header.line, tone: mark.tone, message: mark.message },
                        ),
                    )
                    toast.error('Not saved', { description: failure.message })
                } else toast.error('Not saved', { description: String(failure) })
            },
        )
    }

    const missing = rows !== undefined && stored === undefined

    return (
        <Page className="h-full">
            <PageHeader
                title={String(stored?.resource.title ?? stored?.resource.name ?? key)}
                code={stored === undefined ? undefined : `${String(stored.resource.name ?? '')}|${String(stored.resource.version ?? '')}`}
                onBack={() => go('/cql')}
                words={{ back: 'All libraries' }}
                meta={
                    stored === undefined ? undefined : (
                        <>
                            <StatusChip status={status} />
                            <span>Version {String(version)}</span>
                            <span>{when(stored.resource.meta?.lastUpdated)}</span>
                        </>
                    )
                }
                actions={
                    missing ? undefined : (
                        <>
                            <ApiLink path={`/${key}`} copyValue={`${SERVER.base}/${key}`} />
                            <Button size="sm" variant="outline" onClick={() => go(`/resources/${key}`)}>
                                Library resource
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDraft(draftKey, undefined)}
                                reason={dirty ? undefined : 'Nothing to revert.'}
                            >
                                <RotateCcw aria-hidden />
                                Revert
                            </Button>
                            {status === 'draft' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => save('active')}
                                    reason={header === undefined ? 'The library does not declare itself.' : undefined}
                                >
                                    <Upload aria-hidden />
                                    Publish
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => save()}
                                busy={saving}
                                reason={
                                    dirty
                                        ? frozen
                                            ? 'An active version is fixed: raise the version first.'
                                            : undefined
                                        : 'Nothing changed.'
                                }
                            >
                                <Save aria-hidden />
                                Save
                            </Button>
                        </>
                    )
                }
            />
            <PageState
                loading={rows === undefined && error === undefined}
                error={error ?? (missing ? `The server holds no ${key}.` : undefined)}
                status={missing ? 404 : undefined}
            >
                <SplitPane
                    id="cql-split"
                    className="min-h-0 flex-1"
                    direction="across"
                    defaultShare={0.6}
                    minShare={0.35}
                    maxShare={0.8}
                    first={
                        <Pane title={`${header?.name ?? 'Library'}.cql`} meta={dirty ? 'Unsaved changes' : 'Saved'}>
                            <CodeEditor
                                key={key}
                                label={`${key} CQL`}
                                language="cql"
                                variant="pane"
                                value={text}
                                onChange={edit}
                                marks={liveMarks}
                                keys={{ 'Mod-s': () => save() }}
                                lineNumbers={prefs.lineNumbers}
                                wrap={prefs.wrap}
                                size={prefs.size}
                                bracketColors
                                search
                            />
                        </Pane>
                    }
                    second={
                        <SplitPane
                            id="cql-versions"
                            direction="down"
                            defaultShare={0.35}
                            minShare={0.2}
                            maxShare={0.7}
                            first={
                                <Pane title="Versions" meta={count(own.length, 'version')}>
                                    <DataTable
                                        className="h-full min-h-0"
                                        variant="list"
                                        framed={false}
                                        bar={false}
                                        columnHeads={false}
                                        resizable={false}
                                        minWidth="auto"
                                        columns={VERSION_COLUMNS}
                                        rows={own}
                                        rowKey={(row) => row.id}
                                        onOpen={(row) => setCompared(row.versionId)}
                                        opened={(row) => row.versionId === against?.versionId}
                                    />
                                </Pane>
                            }
                            second={
                                <Pane title={against === undefined ? 'Compare' : `Version ${String(against.versionId)} against the editor`}>
                                    {against !== undefined && (
                                        <DiffView
                                            size="sm"
                                            before={cqlOf(against.resource) ?? ''}
                                            after={text}
                                            words={{ unchanged: 'The editor holds this version.' }}
                                        />
                                    )}
                                </Pane>
                            }
                        />
                    }
                />
            </PageState>
        </Page>
    )
}
