import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Row, Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { CheckIcon, ExternalLink, FileQuestion, PhoneCall, RotateCcw, Send } from 'lucide-react'
import { useEffect, useState } from 'react'

import { go } from 'tidevann-shared/router'
import {
    type Incident as IncidentRow,
    type IncidentState,
    incidents,
    INCIDENT_STATES,
    type Person,
    type Severity,
    SITE_BY_ID,
} from '../data'
import { postUpdate } from '../live'
import { PersonSelect } from '../parts/PersonSelect'
import { useRows } from '../rows'
import type { Settings } from '../settings'
import { formatDuration, formatMoment, INCIDENT_WORDS } from '../status'

/** What a person is likely to post next: the state after the one the incident is in. */
function nextState(state: IncidentState): IncidentState {
    return INCIDENT_STATES[Math.min(INCIDENT_STATES.indexOf(state) + 1, INCIDENT_STATES.length - 1)] ?? 'resolved'
}

/** One incident: its updates in order, a form to post the next, and its facts, each changed in place. */
export function Incident({ id, me, options }: { id: string; me: Person; options: Settings }) {
    const rows = useRows()
    const incident = rows.incidents?.find((one) => one.id === id)
    return (
        <PageState loading={rows.incidents === undefined && rows.error === undefined} error={rows.error}>
            {incident === undefined ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileQuestion aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>No such incident</EmptyTitle>
                        <EmptyDescription>It may have been removed when the demo data was reset.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button variant="outline" onClick={() => go('/incidents')}>
                            Every incident
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <IncidentView incident={incident} me={me} onCallNow={rows.onCall?.person} options={options} />
            )}
        </PageState>
    )
}

function IncidentView({
    incident,
    me,
    onCallNow,
    options,
}: {
    incident: IncidentRow
    me: Person
    onCallNow: Person | undefined
    options: Settings
}) {
    const resolved = incident.state === 'resolved'
    const [state, setState] = useState<IncidentState>(nextState(incident.state))
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)
    // A new update, from here or from the responder, moves the form on to the state after it.
    useEffect(() => setState(nextState(incident.state)), [incident.state])

    const save = (patch: Partial<Omit<IncidentRow, 'id'>>) => incidents.update(incident.id, patch).then(() => undefined)
    const post = (next: IncidentState, text: string) => {
        setBusy(true)
        return postUpdate(incident, next, text, me)
            .then(() => setMessage(''))
            .finally(() => setBusy(false))
    }
    const lasted = (incident.resolved === null ? Date.now() : new Date(incident.resolved).getTime()) - new Date(incident.opened).getTime()
    const why = message.trim() === '' ? 'Write what changed first.' : undefined

    return (
        <Stack gap="page">
            <PageHeader
                title={
                    <InlineEdit
                        variant="title"
                        label="Title"
                        value={incident.title}
                        validate={(value) => (value.trim() === '' ? 'An incident needs a title.' : null)}
                        onSave={(value) => save({ title: value.trim() })}
                    />
                }
                code={incident.code}
                onBack={() => go('/incidents')}
                meta={
                    <Row gap="xs" wrap>
                        <StatusChip status={incident.state} />
                        <StatusChip status={incident.severity} />
                        <span>
                            {resolved ? 'Lasted' : 'Open for'} {formatDuration(lasted)}
                        </span>
                        {incident.cause !== null && !resolved && <span>· the on-call responder posts until you do</span>}
                    </Row>
                }
                actions={
                    <>
                        {incident.public && (
                            <Button variant="outline" onClick={() => go('/public')}>
                                <ExternalLink aria-hidden />
                                Status page
                            </Button>
                        )}
                        <Button
                            variant={resolved ? 'outline' : 'default'}
                            onClick={() =>
                                void post(
                                    resolved ? 'investigating' : 'resolved',
                                    resolved ? 'We are looking into this again.' : 'This incident is resolved.',
                                )
                            }
                        >
                            {resolved ? <RotateCcw aria-hidden /> : <CheckIcon aria-hidden />}
                            {resolved ? 'Reopen' : 'Resolve'}
                        </Button>
                    </>
                }
            />
            <Split
                width="lg"
                aside={
                    <Section title="Details">
                        <DescriptionList
                            layout="stacked"
                            items={[
                                {
                                    term: 'Severity',
                                    value: (
                                        <Segmented
                                            label="Severity"
                                            size="sm"
                                            value={incident.severity}
                                            onValueChange={(severity: Severity) => void save({ severity })}
                                            options={[
                                                { value: 'minor', label: 'Minor' },
                                                { value: 'major', label: 'Major' },
                                                { value: 'critical', label: 'Critical' },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    term: 'Assignee',
                                    value: (
                                        <Stack gap="xs">
                                            <PersonSelect
                                                label="Assignee"
                                                value={incident.assignee}
                                                onValueChange={(assignee) => void save({ assignee })}
                                                className="w-full"
                                            />
                                            {onCallNow !== undefined && onCallNow !== incident.assignee && (
                                                <Button variant="outline" size="sm" onClick={() => void save({ assignee: onCallNow })}>
                                                    <PhoneCall aria-hidden />
                                                    Assign to {onCallNow}, on call
                                                </Button>
                                            )}
                                        </Stack>
                                    ),
                                },
                                {
                                    term: 'Touches',
                                    value: (
                                        <TagChips
                                            tags={[...incident.services, ...incident.sites.map((site) => SITE_BY_ID[site]?.city ?? site)]}
                                        />
                                    ),
                                },
                                { term: 'Opened', value: formatMoment(new Date(incident.opened), options.clock), numeric: true },
                                {
                                    term: 'Resolved',
                                    value:
                                        incident.resolved === null ? 'Not yet' : formatMoment(new Date(incident.resolved), options.clock),
                                    numeric: true,
                                },
                                {
                                    term: 'On the status page',
                                    value: (
                                        <Switch
                                            aria-label="On the status page"
                                            checked={incident.public}
                                            onCheckedChange={(shown) => void save({ public: shown })}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </Section>
                }
            >
                <Stack gap="section">
                    <Section
                        title="Post an update"
                        description="It goes on the timeline, and on the status page while the incident is shown there."
                    >
                        <Stack gap="md">
                            <Segmented
                                label="State after the update"
                                value={state}
                                onValueChange={setState}
                                options={INCIDENT_STATES.map((value) => ({ value, label: INCIDENT_WORDS[value] }))}
                            />
                            <TextField
                                id="update-message"
                                label="Update"
                                multiline
                                rows={3}
                                value={message}
                                onChange={setMessage}
                                placeholder={state === 'resolved' ? 'What fixed it.' : 'What you know now, and what happens next.'}
                            />
                            <FormBar placement="end" note={`Posted as ${me}`}>
                                <Button onClick={() => void post(state, message.trim())} disabled={busy} reason={why}>
                                    <Send aria-hidden />
                                    Post
                                </Button>
                            </FormBar>
                        </Stack>
                    </Section>
                    <Section title="Updates" meta={String(incident.updates.length)}>
                        <Timeline
                            events={incident.updates.map((update) => ({
                                id: update.id,
                                title: update.message,
                                at: <RelativeTime date={update.at} />,
                                detail: (
                                    <Row gap="2xs" inline>
                                        <PersonAvatar name={update.by} size="2xs" />
                                        {update.by} · {INCIDENT_WORDS[update.state]} · {formatMoment(new Date(update.at), options.clock)}
                                    </Row>
                                ),
                                tone: update.state,
                            }))}
                        />
                    </Section>
                </Stack>
            </Split>
        </Stack>
    )
}
