import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useState } from 'react'

import { PRESETS, type Dashboard } from './model'

const STARTS = [
    { value: 'empty', label: 'Empty' },
    ...PRESETS.map((preset) => ({ value: preset.id, label: `A copy of ${preset.name} as it comes` })),
]

/** Naming a new dashboard and what it starts with, or renaming one. */
export function DashboardDialog({
    renaming,
    taken,
    onClose,
    onCreate,
    onRename,
}: {
    /** The dashboard being renamed; a new one is made without it. */
    renaming?: Dashboard
    /** The names in use, which a new name may not repeat. */
    taken: readonly string[]
    onClose: () => void
    onCreate: (name: string, from: string) => Promise<void>
    onRename: (board: Dashboard, name: string) => Promise<void>
}) {
    const [name, setName] = useState(renaming?.name ?? '')
    const [from, setFrom] = useState('empty')
    const [busy, setBusy] = useState(false)
    const trimmed = name.trim()
    const clash = taken.some((one) => one.toLowerCase() === trimmed.toLowerCase() && one !== renaming?.name)
    const why = trimmed === '' ? 'A dashboard needs a name.' : clash ? 'Another dashboard has this name.' : undefined
    const submit = () => {
        if (why !== undefined || busy) return
        setBusy(true)
        void (renaming === undefined ? onCreate(trimmed, from) : onRename(renaming, trimmed)).finally(() => {
            setBusy(false)
            onClose()
        })
    }
    return (
        <DialogShell
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            title={renaming === undefined ? 'New dashboard' : 'Rename dashboard'}
            width="sm"
            phone="fit"
            confirm={{ label: renaming === undefined ? 'Create' : 'Rename', onConfirm: submit, why, busy }}
        >
            <Stack gap="lg">
                <TextField
                    id="dashboard-name"
                    label="Name"
                    value={name}
                    onChange={setName}
                    onEnter={submit}
                    autoFocus
                    error={clash ? 'Another dashboard has this name.' : null}
                />
                {renaming === undefined && (
                    <SelectField id="dashboard-from" label="Starts as" options={STARTS} value={from} onChange={setFrom} />
                )}
            </Stack>
        </DialogShell>
    )
}
