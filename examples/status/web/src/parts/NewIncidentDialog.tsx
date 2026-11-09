import { CheckboxField, CheckboxList } from '@winterop-com/sokkel-ui/CheckboxField'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { useEffect, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { incidents, nextCode, type Person, SERVICES, type ServiceId, type Severity, SITES, updateId } from '../data'
import { useRows } from '../rows'
import { healthCss } from '../status'
import { PersonSelect } from './PersonSelect'

const SEVERITY_DOT: Record<Severity, string> = {
    minor: healthCss('degraded'),
    major: healthCss('outage'),
    critical: healthCss('outage'),
}

const WHERE = [{ value: 'everywhere', label: 'Everywhere' }, ...SITES.map((site) => ({ value: site.id, label: site.city }))]

/**
 * Opens an incident by hand: what is wrong, how bad, what it touches, who takes it and what the
 * status page says first. It opens on the new incident once made.
 */
export function NewIncidentDialog({
    open,
    onOpenChange,
    me,
    service,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    me: Person
    /** A service to start with ticked, from its page. */
    service?: ServiceId
}) {
    const rows = useRows()
    const onCallNow = rows.onCall?.person ?? me
    const [title, setTitle] = useState('')
    const [severity, setSeverity] = useState<Severity>('minor')
    const [services, setServices] = useState<ServiceId[]>([])
    const [where, setWhere] = useState('everywhere')
    const [assignee, setAssignee] = useState<Person>(onCallNow)
    const [message, setMessage] = useState('We are looking into it.')
    const [shown, setShown] = useState(true)
    const [busy, setBusy] = useState(false)

    // Each opening starts afresh, with the service it was opened from and whoever is on call.
    useEffect(() => {
        if (!open) return
        setTitle('')
        setSeverity('minor')
        setServices(service === undefined ? [] : [service])
        setWhere('everywhere')
        setAssignee(onCallNow)
        setMessage('We are looking into it.')
        setShown(true)
        setBusy(false)
    }, [open, service, onCallNow])

    const why =
        title.trim() === ''
            ? 'Say what is wrong first.'
            : services.length === 0 && where === 'everywhere'
              ? 'Tick a service or pick a site it touches.'
              : message.trim() === ''
                ? 'Write the first update.'
                : undefined

    const submit = () => {
        setBusy(true)
        const at = new Date().toISOString()
        void incidents
            .create({
                code: nextCode(rows.incidents ?? []),
                title: title.trim(),
                severity,
                state: 'investigating',
                services,
                sites: where === 'everywhere' ? [] : [where],
                assignee,
                opened: at,
                resolved: null,
                updates: [{ id: updateId(), at, state: 'investigating', message: message.trim(), by: me }],
                public: shown,
                cause: null,
            })
            .then((made) => {
                onOpenChange(false)
                go(`/incidents/${made.id}`)
            })
            .finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title="New incident"
            description="It opens as investigating, with your first update."
            confirm={{ label: 'Open incident', onConfirm: submit, why, busy, busyLabel: 'Opening' }}
        >
            <Stack gap="lg">
                <TextField
                    id="incident-title"
                    label="What is wrong"
                    value={title}
                    onChange={setTitle}
                    placeholder="Slow exports from storage"
                    autoFocus
                />
                <Field id="incident-severity" label="Severity">
                    <Segmented
                        id="incident-severity"
                        label="Severity"
                        value={severity}
                        onValueChange={setSeverity}
                        options={(['minor', 'major', 'critical'] as const).map((value) => ({
                            value,
                            label: value[0]?.toUpperCase() + value.slice(1),
                            dot: SEVERITY_DOT[value],
                        }))}
                    />
                </Field>
                <CheckboxList label="Services it touches">
                    <Columns count={4} min="xs" gap="none">
                        {SERVICES.map((one) => (
                            <CheckboxField
                                key={one.id}
                                label={one.id}
                                checked={services.includes(one.id)}
                                onCheckedChange={(checked) =>
                                    setServices((current) => (checked ? [...current, one.id] : current.filter((id) => id !== one.id)))
                                }
                            />
                        ))}
                    </Columns>
                </CheckboxList>
                <Columns count={2} min="sm" gap="lg">
                    <Field id="incident-where" label="Where">
                        <Select items={WHERE} value={where} onValueChange={(next) => setWhere(String(next))}>
                            <SelectTrigger id="incident-where" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WHERE.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field id="incident-assignee" label="Assignee" hint={assignee === onCallNow ? 'on call' : undefined}>
                        <PersonSelect id="incident-assignee" value={assignee} onValueChange={setAssignee} className="w-full" />
                    </Field>
                </Columns>
                <TextField id="incident-message" label="First update" multiline rows={3} value={message} onChange={setMessage} />
                <SwitchField id="incident-public" label="Show on the status page" checked={shown} onCheckedChange={setShown} />
            </Stack>
        </DialogShell>
    )
}
