import { AppBar } from '@winterop-com/sokkel-ui/AppBar'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CheckboxField, CheckboxList } from '@winterop-com/sokkel-ui/CheckboxField'
import { ChoiceList } from '@winterop-com/sokkel-ui/ChoiceList'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { BellRing, LayoutDashboard } from 'lucide-react'
import { useRef, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { dateOfMoment, type Incident, SERVICES, type ServiceId, SITE_BY_ID, type Subscriber, subscribers } from '../data'
import { inWindow, useLive, worstOf } from '../live'
import { UptimeList } from '../parts/UptimeList'
import { useUptime } from '../parts/uptime'
import { useRows } from '../rows'
import { DEFAULT_SETTINGS, settings } from '../settings'
import { formatClock, formatLongDay, formatMoment, type Health, OVERALL_WORDS, INCIDENT_WORDS } from '../status'

const TONE: Record<Health, 'good' | 'warning' | 'critical' | 'info'> = {
    operational: 'good',
    maintenance: 'info',
    degraded: 'warning',
    outage: 'critical',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DAY = 24 * 60 * 60 * 1000

/** An incident's updates as its timeline shows them on the page, newest first. */
function updatesOf(incident: Incident, clock: 12 | 24) {
    return incident.updates.map((update) => ({
        id: update.id,
        title: update.message,
        at: formatMoment(new Date(update.at), clock),
        detail: INCIDENT_WORDS[update.state],
        tone: update.state,
    }))
}

/** What an incident touches, said for a customer. */
function affects(incident: Incident): string {
    const parts = [...incident.services, ...incident.sites.map((id) => SITE_BY_ID[id]?.city ?? id)]
    return parts.length === 0 ? '' : `Affects ${parts.join(', ')}`
}

/**
 * What customers see: one line on how everything is, the incidents going on with their updates,
 * the maintenance ahead, each service with its last ninety days, what happened lately, and a form
 * to hear of incidents by email.
 */
export function PublicPage({ frame }: { frame: Frame }) {
    const options = { ...DEFAULT_SETTINGS, ...useStore(settings) }
    const state = useLive()
    const rows = useRows()
    const uptime = useUptime()
    const subscribe = useRef<HTMLDivElement>(null)
    const overall = worstOf(Object.values(state.health))
    const shown = (rows.incidents ?? []).filter((incident) => incident.public)
    const going = shown.filter((incident) => incident.state !== 'resolved')
    const now = state.at
    const ahead = (rows.maintenance ?? [])
        .filter((window) => !window.cancelled && dateOfMoment(window.ends).getTime() > now)
        .sort((left, right) => left.starts.localeCompare(right.starts))
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const days = Array.from({ length: options.historyDays }, (_, index) => {
        const start = today.getTime() - index * DAY
        const happened = shown.filter((incident) => {
            const opened = new Date(incident.opened).getTime()
            return opened >= start && opened < start + DAY
        })
        return { start, happened }
    })

    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <AppBar
                desktop={frame.desktop}
                mark={<TidevannMark />}
                trail={[{ label: options.pageTitle }]}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => subscribe.current?.scrollIntoView({ behavior: 'smooth' })}>
                            <BellRing aria-hidden />
                            Subscribe
                        </Button>
                        <IconButton label="Open the board" onClick={() => go('/')}>
                            <LayoutDashboard aria-hidden />
                        </IconButton>
                    </>
                }
            />
            <Banner tone={TONE[overall]}>
                {OVERALL_WORDS[overall]}, as of {formatClock(new Date(now), options.clock)}
            </Banner>
            <main className="min-h-0 flex-1 overflow-y-auto">
                <Stack gap="xl" className="mx-auto w-full max-w-3xl px-4 py-8">
                    {going.map((incident) => (
                        <Section
                            key={incident.id}
                            title={incident.title}
                            description={affects(incident)}
                            actions={<StatusChip status={incident.state} />}
                        >
                            <Timeline events={updatesOf(incident, options.clock)} />
                        </Section>
                    ))}
                    {ahead.length > 0 && (
                        <Section title="Scheduled maintenance">
                            <Timeline
                                events={ahead.map((window) => ({
                                    id: window.id,
                                    title: window.title,
                                    at: inWindow(window, now) ? 'now' : formatMoment(dateOfMoment(window.starts), options.clock),
                                    detail: `${window.service}, until ${formatMoment(dateOfMoment(window.ends), options.clock)}`,
                                    tone: inWindow(window, now) ? 'maintenance' : 'scheduled',
                                }))}
                            />
                        </Section>
                    )}
                    <Section title="Services" meta={options.showUptime ? 'the last 90 days' : undefined}>
                        {options.showUptime ? (
                            <UptimeList services={SERVICES} health={state.health} uptime={uptime} />
                        ) : (
                            <Stack gap="sm">
                                {SERVICES.map((service) => (
                                    <Row key={service.id} justify="between">
                                        <span>{service.id}</span>
                                        <StatusChip status={state.health[service.id]} />
                                    </Row>
                                ))}
                            </Stack>
                        )}
                    </Section>
                    <Section title="Past incidents" meta={`the last ${String(options.historyDays)} days`}>
                        <Timeline
                            events={days.map(({ start, happened }) => ({
                                id: String(start),
                                title: formatLongDay(new Date(start)),
                                detail: happened.length === 0 ? 'No incidents reported.' : undefined,
                                tone:
                                    happened.length === 0
                                        ? 'neutral'
                                        : happened.some((one) => one.severity !== 'minor')
                                          ? 'outage'
                                          : 'degraded',
                                content:
                                    happened.length === 0 ? undefined : (
                                        <Stack gap="md">
                                            {happened.map((incident) => (
                                                <Stack key={incident.id} gap="2xs">
                                                    <Row gap="xs" wrap>
                                                        <span className="font-medium">{incident.title}</span>
                                                        <StatusChip status={incident.state} />
                                                    </Row>
                                                    <MetaLine items={[incident.updates[0]?.message, affects(incident)]} />
                                                </Stack>
                                            ))}
                                        </Stack>
                                    ),
                            }))}
                        />
                    </Section>
                    <div ref={subscribe}>
                        <SubscribeForm />
                    </div>
                    <MetaLine items={['Times are in your own time zone', `${String(SERVICES.length)} services`]} />
                </Stack>
            </main>
        </Stack>
    )
}

/** Subscribes an address to every service or some: kept by the backend and listed in the board's settings. */
function SubscribeForm() {
    const [email, setEmail] = useState('')
    const [which, setWhich] = useState<'all' | 'some'>('all')
    const [picked, setPicked] = useState<ServiceId[]>([])
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState<Subscriber | null>(null)
    const rows = useRows()

    const submit = () => {
        const address = email.trim().toLowerCase()
        if (!EMAIL.test(address)) {
            setError('Write an address such as you@example.org.')
            return
        }
        if ((rows.subscribers ?? []).some((one) => one.email === address)) {
            setError(`${address} is subscribed already.`)
            return
        }
        if (which === 'some' && picked.length === 0) {
            setError('Tick at least one service, or choose every service.')
            return
        }
        setBusy(true)
        void subscribers
            .create({ email: address, services: which === 'all' ? [] : picked, at: new Date().toISOString() })
            .then((made) => {
                setDone(made)
                setEmail('')
                setPicked([])
            })
            .finally(() => setBusy(false))
    }

    if (done !== null) {
        return (
            <Section title="Get notified" description={`${done.email} hears of every new incident and update by email.`}>
                <Row gap="sm" wrap>
                    <StatusChip status="succeeded" label="subscribed" />
                    <MetaLine items={[done.services.length === 0 ? 'every service' : done.services.join(', ')]} />
                </Row>
                <FormBar placement="end">
                    <Button variant="ghost" onClick={() => void subscribers.remove(done.id).then(() => setDone(null))}>
                        Unsubscribe
                    </Button>
                    <Button variant="outline" onClick={() => setDone(null)}>
                        Subscribe another
                    </Button>
                </FormBar>
            </Section>
        )
    }

    return (
        <Section title="Get notified" description="An email when an incident opens, with each update until it is resolved.">
            <Stack gap="lg">
                <TextField
                    id="subscribe-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(value) => {
                        setEmail(value)
                        setError(null)
                    }}
                    placeholder="you@example.org"
                    error={error}
                />
                <ChoiceList
                    label="Hear about"
                    value={which}
                    onValueChange={(value) => {
                        setWhich(value)
                        setError(null)
                    }}
                    options={[
                        { value: 'all', label: 'Every service' },
                        { value: 'some', label: 'Some services', description: 'Only the ones ticked below.' },
                    ]}
                />
                {which === 'some' && (
                    <CheckboxList label="Services">
                        <Columns count={4} min="xs" gap="none">
                            {SERVICES.map((service) => (
                                <CheckboxField
                                    key={service.id}
                                    label={service.id}
                                    checked={picked.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                        setError(null)
                                        setPicked((current) =>
                                            checked ? [...current, service.id] : current.filter((id) => id !== service.id),
                                        )
                                    }}
                                />
                            ))}
                        </Columns>
                    </CheckboxList>
                )}
                <FormBar placement="end" note="No more than one email an update. Unsubscribe from any of them.">
                    <Button onClick={submit} disabled={busy}>
                        Subscribe
                    </Button>
                </FormBar>
            </Stack>
        </Section>
    )
}
