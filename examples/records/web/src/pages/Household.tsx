import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SourceSheet } from '@winterop-com/sokkel-ui/SourceSheet'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { ArrowUpRight, ClipboardPlus, DoorOpen, FileJson, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { eventsOf, households, receipts } from '../data/backend'
import { formOf, PROGRAMS, questionsOf } from '../data/forms'
import { placeName, regionNameOf } from '../data/geo'
import { answerText, count, onDay, StateChip, useFoot, when } from '../ui'

const ENROLL = formOf('FRM-ENROLL')
const question = (id: string) => (ENROLL === undefined ? undefined : questionsOf(ENROLL).find((one) => one.id === id))

/** One registered household: who it is, what it told the survey, its place in the program, and every visit filed for it. */
export function Household({ id }: { id: string }) {
    const { rows, error } = useCollection(households)
    const { rows: all } = useCollection(receipts)
    const [raw, setRaw] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [busy, setBusy] = useState(false)
    const home = rows?.find((one) => one.id === id)
    const events = home === undefined ? [] : eventsOf(all ?? [], home.id)
    const registration = events.find((receipt) => receipt.formId === 'FRM-ENROLL')
    const visits = events.filter((receipt) => receipt.formId !== 'FRM-ENROLL')
    useFoot(home === undefined ? undefined : `${count(visits.length, 'visit')} · registered ${onDay(home.registeredAt)}`, undefined, [
        home?.id,
        visits.length,
    ])
    const closed = home?.status === 'completed'
    const twins = home === undefined ? [] : (rows ?? []).filter((one) => one.identifier === home.identifier && one.id !== home.id)
    const remove = () => {
        if (home === undefined) return
        setBusy(true)
        households.remove(home.id).then(
            () => {
                setBusy(false)
                setRemoving(false)
                toast.success('Household removed', {
                    description: `${home.identifier} is no longer in the register; its records stay on the server.`,
                })
                go('/people')
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not removed', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    return (
        <Page>
            <PageHeader
                title={home?.identifier ?? 'Household'}
                code={home?.id}
                onBack={() => go('/people')}
                words={{ back: 'All households' }}
                meta={
                    home === undefined ? undefined : (
                        <>
                            <StateChip state={home.status} />
                            <span>{count(home.size, 'person', 'people')}</span>
                            <span>{placeName(home.site)}</span>
                        </>
                    )
                }
                actions={
                    home === undefined ? undefined : (
                        <>
                            <ApiLink path={`/households?identifier=${home.identifier}`} />
                            <Button size="sm" variant="outline" onClick={() => setRaw(true)}>
                                <FileJson aria-hidden />
                                Raw record
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
                                <Trash2 aria-hidden />
                                Remove
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => go(`/forms/FRM-EXIT/for/${home.id}`)}
                                reason={closed ? 'The household has left the survey.' : undefined}
                            >
                                <DoorOpen aria-hidden />
                                Exit interview
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => go(`/forms/FRM-HOME/for/${home.id}`)}
                                reason={closed ? 'The household has left the survey, so it takes no more visits.' : undefined}
                            >
                                <ClipboardPlus aria-hidden />
                                Record a visit
                            </Button>
                        </>
                    )
                }
            />
            <PageState
                loading={rows === undefined && error === undefined}
                error={error ?? (rows !== undefined && home === undefined ? `No household is registered under ${id}.` : undefined)}
                status={rows !== undefined && home === undefined ? 404 : undefined}
            >
                {home !== undefined && (
                    <Stack gap="page">
                        {twins.length > 0 && (
                            <Banner tone="critical">
                                {twins.length === 1 ? 'Another household carries' : `${String(twins.length)} other households carry`} the
                                same identifier:{' '}
                                {twins.map((twin) => (
                                    <TextLink key={twin.id} href={`#/people/${twin.id}`}>
                                        {twin.id}
                                    </TextLink>
                                ))}
                                . The register refuses the second registration; remove the one registered by mistake.
                            </Banner>
                        )}
                        <Section
                            title="Identifier"
                            description="What names the household. The server gave it when the registration was filed."
                        >
                            <DescriptionList
                                columns={2}
                                layout="stacked"
                                items={[
                                    { term: 'Identifier', value: home.identifier, code: true },
                                    { term: 'Registered', value: when(home.registeredAt) },
                                    {
                                        term: 'Region',
                                        value: <TextLink href={`#/places/${home.region}`}>{regionNameOf(home.region)}</TextLink>,
                                    },
                                    { term: 'Site', value: <TextLink href={`#/places/${home.site}`}>{placeName(home.site)}</TextLink> },
                                    {
                                        term: 'Registration',
                                        value:
                                            registration === undefined ? (
                                                'Not on this server'
                                            ) : (
                                                <TextLink href={`#/responses/${registration.receipt}`}>
                                                    {registration.receipt.slice(0, 12)}
                                                </TextLink>
                                            ),
                                    },
                                ]}
                            />
                        </Section>
                        <Section
                            title="What the household told the survey"
                            description="The answers the registration holds, as the server stores them."
                        >
                            <DescriptionList
                                columns={2}
                                layout="stacked"
                                items={[
                                    { term: question('born')?.label ?? 'Born', value: String(home.born), numeric: true },
                                    { term: question('size')?.label ?? 'People', value: String(home.size), numeric: true },
                                    { term: question('source')?.label ?? 'Source', value: answerText(question('source'), home.source) },
                                    {
                                        term: question('treats')?.label ?? 'Treats water',
                                        value: home.treats === null ? 'Not answered' : home.treats ? 'Yes' : 'No',
                                    },
                                ]}
                            />
                        </Section>
                        <Section title="Program" description="The program the household is registered in.">
                            <DescriptionList
                                columns={2}
                                layout="stacked"
                                items={[
                                    { term: 'Program', value: PROGRAMS['PRG-WATER'].title },
                                    { term: 'State', value: <StateChip state={home.status} /> },
                                    { term: 'Visits', value: String(visits.length), numeric: true },
                                    {
                                        term: 'New visits',
                                        value: closed
                                            ? 'Not taken: the household has left the survey.'
                                            : 'Taken: each visit is its own record.',
                                    },
                                ]}
                            />
                        </Section>
                        <Section
                            variant="flat"
                            title="Visits"
                            meta={String(visits.length)}
                            description="Every visit filed for the household, newest first. Each opens to its answers."
                        >
                            {visits.length === 0 ? (
                                <p className="text-help text-muted-foreground">
                                    No visit has been filed for this household yet. Record one with Record a visit.
                                </p>
                            ) : (
                                <Stack gap="sm">
                                    {visits.map((visit, index) => {
                                        const form = formOf(visit.formId)
                                        return (
                                            <Unfoldable
                                                key={visit.id}
                                                defaultOpen={index === 0}
                                                heading={
                                                    <span>
                                                        {form?.title ?? visit.formId},{' '}
                                                        {visit.visitDate === null ? when(visit.receivedAt) : onDay(visit.visitDate)}
                                                    </span>
                                                }
                                                aside={<StateChip state={visit.state} />}
                                            >
                                                <Stack gap="sm">
                                                    <DescriptionList
                                                        termWidth="16rem"
                                                        items={(form === undefined ? [] : questionsOf(form))
                                                            .map((one) => ({
                                                                term: one.label,
                                                                value: answerText(one, visit.answers[one.id] ?? null),
                                                            }))
                                                            .filter((item) => item.value !== '')}
                                                    />
                                                    <span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            render={<a href={`#/responses/${visit.receipt}`} />}
                                                        >
                                                            Open the receipt
                                                            <ArrowUpRight data-icon="inline-end" aria-hidden />
                                                        </Button>
                                                    </span>
                                                </Stack>
                                            </Unfoldable>
                                        )
                                    })}
                                </Stack>
                            )}
                        </Section>
                        <SourceSheet
                            open={raw}
                            onOpenChange={setRaw}
                            title="Raw record"
                            description="The household exactly as the server stores it."
                            value={home}
                            language="json"
                        />
                        <ConfirmDialog
                            open={removing}
                            onOpenChange={setRemoving}
                            question={`Remove ${home.identifier}?`}
                            detail="The household leaves the register and takes no more visits. The records filed for it stay on the server."
                            confirm={{ label: 'Remove', onConfirm: remove, busy, busyLabel: 'Removing', destructive: true }}
                        />
                    </Stack>
                )}
            </PageState>
        </Page>
    )
}
