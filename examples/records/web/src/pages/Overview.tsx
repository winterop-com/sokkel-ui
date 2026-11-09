import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import type { ServerState } from '@winterop-com/sokkel-ui/ServerMenu'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { ArrowRight, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'

import { forwardAll, receipts, SERVER, STATE_WORDS, STATES } from '../data/backend'
import { FORMS, questionCount } from '../data/forms'
import { count, KindBadge, STATE_DOT, useFoot } from '../ui'

const SERVER_STATE = { up: 'succeeded', down: 'failed', checking: 'queued' } as const
const SERVER_WORDS = { up: 'answering', down: 'not answering', checking: 'checking' } as const

/** What waits for review: the responses by state, the forms a record starts from, and the server behind both. */
export function Overview({ serverState }: { serverState: ServerState }) {
    const { rows } = useCollection(receipts)
    const all = rows ?? []
    const waiting = all.filter((receipt) => receipt.state === 'received').length
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
                description="Every form the server serves is one you can fill in and file. A registration registers a household for the follow-ups under it."
                actions={
                    <Button size="sm" variant="outline" render={<a href="#/forms" />}>
                        All forms
                        <ArrowRight data-icon="inline-end" aria-hidden />
                    </Button>
                }
            >
                <Columns count={4} min="md" gap="md">
                    {FORMS.map((form) => (
                        <ItemCard
                            key={form.id}
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
                    ))}
                </Columns>
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
