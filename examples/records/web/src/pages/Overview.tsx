import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SortableGrid } from '@winterop-com/sokkel-ui/Sortable'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { ArrowRight, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'

import { forwardAll, inOrder, ME, preferences, receipts, SERVER, STATE_WORDS, STATES } from '../data/backend'
import { FORMS, questionCount, type Form } from '../data/forms'
import { count, KindBadge, STATE_DOT, useFoot } from '../ui'

/** What the simulated server answers: the states this app knows, a subset of what ServerMenu takes. */
export type ServerHealth = 'up' | 'down' | 'checking'

const SERVER_STATE = { up: 'succeeded', down: 'failed', checking: 'queued' } as const
const SERVER_WORDS = { up: 'answering', down: 'not answering', checking: 'checking' } as const

/** What waits for review: the responses by state, the forms a record starts from, and the server behind both. */
export function Overview({ serverState }: { serverState: ServerHealth }) {
    const { rows } = useCollection(receipts)
    const all = rows ?? []
    const waiting = all.filter((receipt) => receipt.state === 'received').length
    const { rows: prefs } = useCollection(preferences)
    // The order just dragged, held while it is kept, so a quick second move never reads a stale first.
    const [held, setHeld] = useState<readonly Form[] | null>(null)
    const forms = held ?? inOrder(prefs?.find((one) => one.id === ME)?.formOrder)
    const reorder = (from: number, to: number) => {
        const next = moveItem(forms, from, to)
        setHeld(next)
        const formOrder = next.map((form) => form.id)
        const kept = prefs?.some((one) => one.id === ME) === true
        void (kept ? preferences.update(ME, { formOrder }) : preferences.create({ formOrder }, ME)).finally(() => setHeld(null))
    }
    useFoot(`${count(all.length, 'response')} · ${count(FORMS.length, 'form')} served`, undefined, [all.length])

    const sendOn = () =>
        forwardAll().then(
            ({ taken, refused }) =>
                toast.success(`${String(taken + refused)} sent on to the register`, {
                    description: refused === 0 ? 'The register took them all.' : `${String(refused)} refused; each receipt says why.`,
                }),
            (failure: unknown) =>
                toast.error('Nothing was sent on', { description: failure instanceof Error ? failure.message : String(failure) }),
        )

    return (
        <Page>
            <PageHeader
                title="Overview"
                description="What the server holds right now: the responses not yet sent on to the register, the forms a record starts from, and the server behind both."
                actions={
                    <Button size="sm" disabled={waiting === 0} onClick={() => void sendOn()}>
                        <Send aria-hidden />
                        Send on {waiting === 0 ? '' : String(waiting)}
                    </Button>
                }
            />
            <Section
                variant="flat"
                title="Responses"
                description="Every response the server stored, and where each one is now. Each tile opens the list of them."
            >
                <Columns count={4} min="xs" gap="md">
                    {STATES.map((state) => (
                        <Stat
                            key={state}
                            variant="tile"
                            dot={STATE_DOT[state]}
                            label={STATE_WORDS[state].label}
                            value={all.filter((receipt) => receipt.state === state).length}
                            note={STATE_WORDS[state].note}
                            href={`#/responses/in/${state}`}
                            emphasis={state === 'received' && waiting > 0}
                            size={state === 'received' && waiting > 0 ? 'lg' : 'md'}
                        />
                    ))}
                </Columns>
            </Section>
            <Section
                variant="flat"
                title="Start a record"
                meta={String(FORMS.length)}
                description="Every form the server serves is one you can fill in and file. A registration registers a household for the follow-ups under it. Drag a form to put the ones you file most first."
                actions={
                    <Button size="sm" variant="outline" render={<a href="#/forms" />}>
                        All forms
                        <ArrowRight data-icon="inline-end" aria-hidden />
                    </Button>
                }
            >
                <SortableGrid
                    label="Forms to start a record from"
                    items={forms}
                    itemKey={(form) => form.id}
                    itemLabel={(form) => form.title}
                    minItemWidth="14rem"
                    onMove={reorder}
                    renderItem={(form) => (
                        <ItemCard
                            title={form.title}
                            code={form.id}
                            href={`#/forms/${form.id}`}
                            status={
                                <>
                                    <KindBadge form={form} />
                                    <span>{count(questionCount(form), 'question')}</span>
                                </>
                            }
                        />
                    )}
                />
            </Section>
            <Section
                title="This server"
                actions={
                    <Button size="sm" variant="outline" render={<a href="#/server" />}>
                        What this server offers
                        <ArrowRight data-icon="inline-end" aria-hidden />
                    </Button>
                }
            >
                <Stack gap="md">
                    <DescriptionList
                        columns={2}
                        layout="stacked"
                        items={[
                            { term: 'Name', value: SERVER.name },
                            { term: 'Version', value: SERVER.version, code: true },
                            { term: 'Address', value: SERVER.base, code: true },
                            { term: 'State', value: <StatusChip status={SERVER_STATE[serverState]} label={SERVER_WORDS[serverState]} /> },
                        ]}
                    />
                </Stack>
            </Section>
        </Page>
    )
}
