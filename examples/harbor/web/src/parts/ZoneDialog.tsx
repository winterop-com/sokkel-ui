import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { MapTone } from '@winterop-com/sokkel-ui-maps/tone'
import type { ZoneEdge, ZoneFill } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { useEffect, useState } from 'react'

import { entries, ME, zones, type ZoneRow } from '../data'

/** The tones a zone is drawn in, as the watch names them. */
export const TONES: readonly { value: MapTone; label: string }[] = [
    { value: 'hostile', label: 'Hostile' },
    { value: 'friend', label: 'Friend' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'unknown', label: 'Unknown' },
    { value: 'pending', label: 'Pending' },
    { value: 'plain', label: 'Plain' },
]

export const FILLS: readonly { value: ZoneFill; label: string }[] = [
    { value: 'solid', label: 'Wash' },
    { value: 'hatched', label: 'Lines' },
    { value: 'none', label: 'Edge only' },
]

export const EDGES: readonly { value: ZoneEdge; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
]

/** Edits a zone: its name, what it is for, its tone, how it is drawn and whether the maps show it. */
export function ZoneDialog({
    zone,
    onOpenChange,
    now,
}: {
    /** The zone edited; closed while none. */
    zone: ZoneRow | undefined
    onOpenChange: (open: boolean) => void
    now: number
}) {
    const [label, setLabel] = useState('')
    const [note, setNote] = useState('')
    const [tone, setTone] = useState<MapTone>('plain')
    const [fill, setFill] = useState<ZoneFill>('solid')
    const [edge, setEdge] = useState<ZoneEdge>('solid')
    const [visible, setVisible] = useState(true)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (zone === undefined) return
        setLabel(zone.label)
        setNote(zone.note)
        setTone(zone.tone)
        setFill(zone.fill)
        setEdge(zone.edge)
        setVisible(zone.visible)
        setBusy(false)
    }, [zone])

    const submit = () => {
        if (zone === undefined) return
        setBusy(true)
        void zones
            .update(zone.id, { label: label.trim(), note: note.trim(), tone, fill, edge, visible })
            .then(() => entries.create({ at: now, kind: 'zone', name: label.trim(), detail: `Edited the zone ${label.trim()}`, by: ME }))
            .then(() => onOpenChange(false))
            .finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={zone !== undefined}
            onOpenChange={onOpenChange}
            width="md"
            title={zone === undefined ? 'Edit zone' : `Edit ${zone.label}`}
            confirm={{
                label: 'Save',
                onConfirm: submit,
                why: label.trim() === '' ? 'Give the zone a name.' : undefined,
                busy,
                busyLabel: 'Saving',
            }}
        >
            <Stack gap="lg">
                <TextField id="zone-label" label="Name" value={label} onChange={setLabel} autoFocus />
                <TextField id="zone-note" label="What it is for" multiline rows={2} value={note} onChange={setNote} />
                <SelectField id="zone-tone" label="Tone" options={TONES} value={tone} onChange={(next) => setTone(next as MapTone)} />
                <Columns count={2} min="xs" gap="lg">
                    <Field id="zone-fill" label="Inside">
                        <Segmented id="zone-fill" label="Inside" value={fill} onValueChange={setFill} options={FILLS} />
                    </Field>
                    <Field id="zone-edge" label="Edge">
                        <Segmented id="zone-edge" label="Edge" value={edge} onValueChange={setEdge} options={EDGES} />
                    </Field>
                </Columns>
                <SwitchField id="zone-visible" label="Shown on the maps" checked={visible} onCheckedChange={setVisible} />
            </Stack>
        </DialogShell>
    )
}
