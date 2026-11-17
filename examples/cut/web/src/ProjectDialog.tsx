import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useState } from 'react'

import type { Project } from './model'

/** Naming a new project, or renaming one. */
export function ProjectDialog({
    renaming,
    taken,
    onClose,
    onCreate,
    onRename,
}: {
    /** The project being renamed; a new one is made without it. */
    renaming?: Project
    /** The names in use, which a new name may not repeat. */
    taken: readonly string[]
    onClose: () => void
    onCreate: (name: string) => Promise<void>
    onRename: (project: Project, name: string) => Promise<void>
}) {
    const [name, setName] = useState(renaming?.name ?? '')
    const [busy, setBusy] = useState(false)
    const trimmed = name.trim()
    const clash = taken.some((one) => one.toLowerCase() === trimmed.toLowerCase() && one !== renaming?.name)
    const why = trimmed === '' ? 'A project needs a name.' : clash ? 'Another project has this name.' : undefined
    const submit = () => {
        if (why !== undefined || busy) return
        setBusy(true)
        void (renaming === undefined ? onCreate(trimmed) : onRename(renaming, trimmed)).finally(() => {
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
            title={renaming === undefined ? 'New project' : 'Rename project'}
            width="sm"
            phone="fit"
            confirm={{ label: renaming === undefined ? 'Create' : 'Rename', onConfirm: submit, why, busy }}
        >
            <TextField
                id="project-name"
                label="Name"
                value={name}
                onChange={setName}
                onEnter={submit}
                autoFocus
                error={clash ? 'Another project has this name.' : null}
            />
        </DialogShell>
    )
}
