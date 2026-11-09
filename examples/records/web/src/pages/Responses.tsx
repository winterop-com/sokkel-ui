import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DetailSheet } from '@winterop-com/sokkel-ui/DetailSheet'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem } from '@winterop-com/sokkel-ui/StatusLine'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { ArrowUpRight, Copy, RefreshCw, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { forward, forwardAll, receipts, STATE_WORDS, STATES, withdraw, type Receipt, type ReceiptState } from '../data/backend'
import { formOf, FORMS, isAnswered } from '../data/forms'
import { placeName } from '../data/geo'
import { count, KindBadge, STATE_DOT, StateChip, useFoot, when } from '../ui'
import { ReceiptActions, ReceiptBody } from './Receipt'

const answersOf = (receipt: Receipt) => Object.values(receipt.answers).filter(isAnswered).length

const COLUMNS: DataColumn<Receipt>[] = [
    {
        id: 'form',
        header: 'Form',
        width: 'minmax(10rem,1fr)',
        cell: (receipt) => <span className="font-medium">{formOf(receipt.formId)?.title ?? receipt.formId}</span>,
        sortValue: (receipt) => formOf(receipt.formId)?.title ?? receipt.formId,
    },
    {
        id: 'received',
        header: 'Received',
        width: '12.5rem',
        cell: (receipt) => <span className="tabular-nums">{when(receipt.receivedAt)}</span>,
        sortValue: (receipt) => receipt.receivedAt,
    },
    {
        id: 'kind',
        header: 'Kind',
        width: '9rem',
        cell: (receipt) => {
            const form = formOf(receipt.formId)
            return form === undefined ? null : <KindBadge form={form} />
        },
    },
    {
        id: 'place',
        header: 'Place',
        width: '9rem',
        cell: (receipt) => placeName(receipt.place),
        sortValue: (receipt) => placeName(receipt.place),
    },
    {
        id: 'state',
        header: 'State',
        width: '7rem',
        cell: (receipt) => <StateChip state={receipt.state} />,
        sortValue: (receipt) => receipt.state,
    },
    { id: 'answers', header: 'Answers', width: '5.5rem', align: 'end', cell: answersOf, sortValue: answersOf },
    {
        id: 'receipt',
        header: 'Receipt',
        width: '9rem',
        cell: (receipt) => <span className="font-mono text-xs text-muted-foreground">{receipt.receipt.slice(0, 12)}</span>,
    },
]

/** Every response the server stored, filtered by its state and form, the chosen one open in a sheet beside the list. */
export function Responses({ state }: { state?: string }) {
    const { rows, error } = useCollection(receipts)
    const [forms, setForms] = useState<string[]>([])
    const [query, setQuery] = useState('')
    const [opened, setOpened] = useState<string | null>(null)
    const [sheetWidth, setSheetWidth] = useStored('response-sheet-width', 576)
    const [busy, setBusy] = useState(false)
    const all = rows ?? []
    const chosen = (STATES as readonly string[]).includes(state ?? '') ? (state as ReceiptState) : 'all'
    const shown = all.filter(
        (receipt) =>
            (chosen === 'all' || receipt.state === chosen) &&
            (forms.length === 0 || forms.includes(receipt.formId)) &&
            (query.trim() === '' ||
                `${receipt.receipt} ${formOf(receipt.formId)?.title ?? ''} ${placeName(receipt.place)}`
                    .toLowerCase()
                    .includes(query.trim().toLowerCase())),
    )
    const open = all.find((receipt) => receipt.receipt === opened)
    const openForm = formOf(open?.formId)
    const waiting = all.filter((receipt) => receipt.state === 'received').length
    useFoot(
        `Showing ${String(shown.length)} of ${count(all.length, 'response')}`,
        chosen === 'all' ? undefined : <StatusItem label="state">{STATE_WORDS[chosen].label}</StatusItem>,
        [shown.length, all.length, chosen],
    )

    const reload = () => {
        setBusy(true)
        receipts.list().then(
            (fresh) => {
                setBusy(false)
                toast('Read again', { description: `${count(fresh.length, 'response')} on the server.` })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not read', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    const sendOn = () =>
        forwardAll().then(
            ({ taken, refused }) =>
                toast.success(`${String(taken + refused)} sent on to the register`, {
                    description: refused === 0 ? 'The register took them all.' : `${String(refused)} refused; each receipt says why.`,
                }),
            (failure: unknown) =>
                toast.error('Nothing was sent on', { description: failure instanceof Error ? failure.message : String(failure) }),
        )

    const actions = (receipt: Receipt): DataAction[] => [
        { id: 'page', label: 'Open the full page', icon: <ArrowUpRight />, onSelect: () => go(`/responses/${receipt.receipt}`) },
        {
            id: 'copy',
            label: 'Copy the receipt ID',
            icon: <Copy />,
            onSelect: () =>
                void navigator.clipboard.writeText(receipt.receipt).then(
                    () => toast('Copied', { description: receipt.receipt }),
                    () => toast.error('The browser did not let the page copy'),
                ),
        },
        ...(receipt.state === 'received' || receipt.state === 'rejected'
            ? [
                  { id: 'line', separator: true } as const,
                  {
                      id: 'send',
                      label: 'Send on',
                      icon: <Send />,
                      onSelect: () =>
                          void forward(receipt).then(
                              (next) =>
                                  next.state === 'rejected'
                                      ? toast.error('Refused by the register', { description: next.refusal ?? undefined })
                                      : toast.success('Sent on', { description: 'The register took the record.' }),
                              (failure: unknown) =>
                                  toast.error('Not sent on', { description: failure instanceof Error ? failure.message : String(failure) }),
                          ),
                  },
              ]
            : []),
        ...(receipt.state === 'forwarded'
            ? [
                  { id: 'line', separator: true } as const,
                  {
                      id: 'withdraw',
                      label: 'Withdraw',
                      icon: <Undo2 />,
                      destructive: true,
                      onSelect: () =>
                          void withdraw(receipt, 'Taken back from the list.').then(
                              () => toast.success('Withdrawn', { description: 'The register keeps the record, no longer active.' }),
                              (failure: unknown) =>
                                  toast.error('Not withdrawn', {
                                      description: failure instanceof Error ? failure.message : String(failure),
                                  }),
                          ),
                  },
              ]
            : []),
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="Responses"
                description="Every record the server stored, and where each one is now."
                actions={
                    <>
                        <ApiLink path={chosen === 'all' ? '/responses' : `/responses?state=${chosen}`} />
                        <Button size="sm" variant="outline" onClick={reload} disabled={busy}>
                            <RefreshCw aria-hidden className={busy ? 'animate-spin' : undefined} />
                            Reload
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => void sendOn()}
                            disabled={waiting === 0}
                            reason={waiting === 0 ? 'Nothing waits to be sent on.' : undefined}
                        >
                            <Send aria-hidden />
                            Send on
                        </Button>
                    </>
                }
            />
            <Toolbar>
                <Segmented
                    label="State"
                    value={chosen}
                    onValueChange={(next) => go(next === 'all' ? '/responses' : `/responses/in/${next}`)}
                    options={[
                        { value: 'all', label: 'All', count: all.length },
                        ...STATES.map((one) => ({
                            value: one,
                            label: STATE_WORDS[one].label,
                            count: all.filter((receipt) => receipt.state === one).length,
                            dot: STATE_DOT[one],
                        })),
                    ]}
                />
            </Toolbar>
            <PageState
                loading={rows === undefined && error === undefined}
                error={error}
                status={error === undefined ? undefined : 'unreachable'}
                empty={all.length === 0}
                emptyMessage="The server has stored no response yet. One arrives here the moment a form is filed: open a form and submit it."
            >
                <DataTable
                    className="min-h-0 flex-1"
                    search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                    toolbar={
                        <FilterChip
                            facet="Form"
                            multiple
                            options={FORMS.map((form) => ({ value: form.id, label: form.title }))}
                            selected={forms}
                            onSelectedChange={setForms}
                        />
                    }
                    columns={COLUMNS}
                    rows={shown}
                    rowKey={(receipt) => receipt.receipt}
                    onOpen={(receipt) => setOpened(receipt.receipt)}
                    opened={(receipt) => receipt.receipt === opened}
                    rowActions={actions}
                    total={all.length}
                    minWidth="52rem"
                    defaultSort={{ column: 'received', direction: 'desc' }}
                />
            </PageState>
            {open !== undefined && (
                <DetailSheet
                    open
                    onOpenChange={(next) => !next && setOpened(null)}
                    code={open.receipt}
                    title={openForm?.title ?? open.formId}
                    size={sheetWidth}
                    onSizeChange={setSheetWidth}
                    chips={
                        <>
                            {openForm !== undefined && <KindBadge form={openForm} />}
                            <StateChip state={open.state} />
                        </>
                    }
                    actions={
                        <>
                            <Button size="sm" variant="outline" render={<a href={`#/responses/${open.receipt}`} />}>
                                Open the full page
                                <ArrowUpRight data-icon="inline-end" aria-hidden />
                            </Button>
                            <ApiLink path={`/responses/${open.receipt}`} />
                        </>
                    }
                    foot={<ReceiptActions receipt={open} />}
                >
                    <ReceiptBody receipt={open} />
                </DetailSheet>
            )}
        </Page>
    )
}
