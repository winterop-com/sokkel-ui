import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { OPERATORS, runRule, validationRules, type ValidationRule } from '../data/backend'
import { check } from '../data/check'
import { DE, PERIODS, ROOT, sitesUnder, uid } from '../data/metadata'
import { count, describeItems, useFoot, useVersion, verdict } from '../ui'

const SITES = sitesUnder(ROOT).map((site) => site.id)

/** The validation rules the server holds, each checked against its version and run over every site and month. */
export function ValidationRules() {
    const version = useVersion()
    const { rows, error } = useCollection(validationRules)
    const [query, setQuery] = useState('')

    const worked = useMemo(
        () =>
            (rows ?? []).map((one) => {
                const left = check(one.left, 'expression', { version })
                const right = check(one.right, 'expression', { version })
                const state = verdict(left, right)
                const violations =
                    left.node !== null && right.node !== null && state !== 'invalid'
                        ? runRule(one, left.node, right.node, SITES, PERIODS).violations.length
                        : null
                return { ...one, state, violations }
            }),
        [rows, version],
    )
    type Row = (typeof worked)[number]
    const asked = query.trim().toLowerCase()
    const shown = worked.filter((one) => asked === '' || `${one.name} ${one.code} ${one.id}`.toLowerCase().includes(asked))
    const total = worked.reduce((sum, one) => sum + (one.violations ?? 0), 0)
    useFoot(`${count(total, 'violation')} across ${count(SITES.length, 'site')} and ${count(PERIODS.length, 'month')}`, undefined, [total])

    const columns: DataColumn<Row>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(13rem,1fr)',
            cell: (one) => (
                <span>
                    <span className="font-medium">{one.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{one.id}</span>
                </span>
            ),
            sortValue: (one) => one.name,
            stack: 'lead',
        },
        {
            id: 'importance',
            header: 'Importance',
            width: '7rem',
            cell: (one) => <StatusChip status={one.importance} />,
            sortValue: (one) => one.importance,
        },
        {
            id: 'rule',
            header: 'Rule',
            width: 'minmax(16rem,2fr)',
            cell: (one) => (
                <span className="text-muted-foreground">
                    {describeItems(one.left)} <span className="font-mono text-foreground">{OPERATORS[one.operator].sign}</span>{' '}
                    {describeItems(one.right)}
                </span>
            ),
            stack: 'secondary',
        },
        { id: 'state', header: 'Check', width: '7rem', cell: (one) => <StatusChip status={one.state} />, sortValue: (one) => one.state },
        {
            id: 'violations',
            header: 'Violations',
            width: '7rem',
            align: 'end',
            cell: (one) =>
                one.violations === null ? (
                    '–'
                ) : (
                    <span className={one.violations > 0 ? 'font-medium text-critical-ink tabular-nums' : 'tabular-nums'}>
                        {one.violations}
                    </span>
                ),
            sortValue: (one) => one.violations ?? -1,
        },
    ]

    const create = () => {
        const made = (worked.length + 1).toString().padStart(3, '0')
        const code = `VR_NEW_${made}`
        validationRules
            .create(
                {
                    code,
                    name: `New rule ${made}`,
                    instruction: '',
                    importance: 'medium',
                    left: `#{${DE.referrals.id}}`,
                    operator: 'less_than_or_equal_to',
                    right: `#{${DE.visits.id}}`,
                    leftStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
                    rightStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
                },
                uid(`vr:${code}:${Date.now().toString(36)}`),
            )
            .then(
                (one: ValidationRule) => go(`/validation-rules/${one.id}`),
                (failure: unknown) =>
                    toast.error('Not created', { description: failure instanceof Error ? failure.message : String(failure) }),
            )
    }

    return (
        <Page className="h-full">
            <PageHeader
                title="Validation rules"
                description={`A left side compared with a right side, each an expression over the data. Every rule is checked against the server's version, ${version}, and run for each site and month the server holds.`}
                actions={
                    <>
                        <ApiLink path="/api/validationRules" />
                        <Button size="sm" onClick={create}>
                            <Plus aria-hidden />
                            New
                        </Button>
                    </>
                }
            />
            <DataTable
                loading={rows === undefined && error === undefined}
                error={error}
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                columns={columns}
                rows={shown}
                rowKey={(one) => one.id}
                onOpen={(one) => go(`/validation-rules/${one.id}`)}
                chevron
                minWidth="52rem"
                rowHeight="auto"
                words={asked === '' ? undefined : { empty: 'No rule matches the search.' }}
            />
        </Page>
    )
}
