import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { BarList } from '@winterop-com/sokkel-ui/BarList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { households } from '../data/backend'
import { checkMetadata, coverage, SEVERITY, type Finding, type Severity } from '../data/health'
import { count, useFoot } from '../ui'

const COLUMNS: DataColumn<Finding>[] = [
    {
        id: 'object',
        header: 'Object',
        width: 'minmax(10rem,1fr)',
        cell: (finding) => (
            <span>
                <span className="font-medium">{finding.object}</span>
                <span className="block font-mono text-xs text-muted-foreground">{finding.objectId}</span>
            </span>
        ),
        sortValue: (finding) => finding.object,
    },
    { id: 'field', header: 'Field', width: '7rem', cell: (finding) => <span className="font-mono text-xs">{finding.field}</span> },
    { id: 'problem', header: 'Problem', width: 'minmax(12rem,1.4fr)', cell: (finding) => finding.problem, stack: 'primary' },
    { id: 'cost', header: 'What it costs', width: 'minmax(12rem,1.4fr)', cell: (finding) => finding.cost, stack: 'secondary' },
]

const ORDER: Severity[] = ['error', 'warning', 'note']

/** What the metadata holds that a record cannot carry cleanly, by how bad it is and the kind of object, and how far the forms are translated. */
export function Health() {
    const [findings, setFindings] = useState<Finding[] | undefined>(undefined)
    const [busy, setBusy] = useState(false)
    const [query, setQuery] = useState('')
    const run = (said: boolean) => {
        setBusy(true)
        households.list().then(
            (all) => {
                const found = checkMetadata(all)
                setFindings(found)
                setBusy(false)
                if (said) toast('Checked again', { description: count(found.length, 'finding') })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not checked', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }
    useEffect(() => run(false), [])

    const asked = query.trim().toLowerCase()
    const shown = (findings ?? []).filter(
        (finding) => asked === '' || `${finding.object} ${finding.objectId}`.toLowerCase().includes(asked),
    )
    useFoot(`Showing ${String(shown.length)} of ${count(findings?.length ?? 0, 'finding')}`, undefined, [shown.length, findings?.length])
    const languages = coverage()

    return (
        <Page>
            <PageHeader
                title="Metadata health"
                description="What the server's metadata holds that a record cannot carry cleanly, and how far the forms are translated. Each finding opens the object it is about."
                actions={
                    <>
                        <ApiLink path="/health" />
                        <Button size="sm" variant="outline" onClick={() => run(true)} disabled={busy}>
                            <RefreshCw aria-hidden className={busy ? 'animate-spin' : undefined} />
                            Check again
                        </Button>
                    </>
                }
            />
            <Columns count={3} min="xs" gap="md">
                {ORDER.map((severity) => (
                    <Stat
                        key={severity}
                        variant="tile"
                        dot={SEVERITY[severity].dot}
                        label={SEVERITY[severity].label}
                        value={findings === undefined ? '…' : findings.filter((finding) => finding.severity === severity).length}
                        note={
                            severity === 'error'
                                ? 'refused by the register'
                                : severity === 'warning'
                                  ? 'filed, but degraded'
                                  : 'worth a look'
                        }
                        emphasis={severity === 'error' && (findings ?? []).some((finding) => finding.severity === 'error')}
                    />
                ))}
            </Columns>
            <Section
                title="Translations"
                description="Each language's share of the strings the forms say: titles, questions and their help."
            >
                <BarList
                    label="Strings translated, by language"
                    items={languages.map((language) => ({
                        id: language.language,
                        label: `${language.name} (${language.language})`,
                        value: language.translated / language.total,
                        note: `${language.translated.toLocaleString('en-US')} of ${language.total.toLocaleString('en-US')} strings`,
                    }))}
                    format={(value) => `${String(Math.round(value * 100))}%`}
                />
            </Section>
            <Stack gap="md">
                <SearchField value={query} onChange={setQuery} placeholder="Object name or id" className="max-w-md" />
                {findings !== undefined && shown.length === 0 && (
                    <p className="text-help text-muted-foreground">
                        {asked === ''
                            ? 'Every name and code is one a record can carry as it stands.'
                            : `No object matches. ${count(findings.length, 'finding')} in all.`}
                    </p>
                )}
                {ORDER.map((severity) => {
                    const these = shown.filter((finding) => finding.severity === severity)
                    if (these.length === 0) return null
                    return (
                        <Unfoldable
                            key={severity}
                            defaultOpen={severity === 'error' || severity === 'warning'}
                            forced={asked !== '' || undefined}
                            heading={
                                <Row as="span" gap="sm">
                                    <Dot color={SEVERITY[severity].dot} />
                                    {SEVERITY[severity].label}
                                </Row>
                            }
                            aside={count(these.length, 'finding')}
                        >
                            <DataTable
                                variant="list"
                                columns={COLUMNS}
                                rows={these}
                                rowKey={(finding) => finding.id}
                                groupBy="kind"
                                onOpen={(finding) => finding.href !== undefined && go(finding.href.slice(1))}
                                chevron
                                rowHeight="auto"
                                minWidth="auto"
                            />
                        </Unfoldable>
                    )
                })}
            </Stack>
        </Page>
    )
}
