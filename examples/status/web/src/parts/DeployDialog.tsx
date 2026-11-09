import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useEffect, useState } from 'react'

import { deploys, nextVersion, type Person, type ServiceId } from '../data'

const VERSION = /^v\d+\.\d+\.\d+$/

/** Deploys a new version of a service: it runs for a few seconds, slowing the service a little, then succeeds. */
export function DeployDialog({
    open,
    onOpenChange,
    service,
    running,
    me,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    service: ServiceId
    /** The version running now. */
    running: string
    me: Person
}) {
    const [version, setVersion] = useState(nextVersion(running))
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!open) return
        setVersion(nextVersion(running))
        setNote('')
        setBusy(false)
    }, [open, running])

    const why = !VERSION.test(version.trim())
        ? 'Write the version as v1.2.3.'
        : version.trim() === running
          ? `${running} is running already.`
          : undefined

    const submit = () => {
        setBusy(true)
        void deploys
            .create({ service, version: version.trim(), at: new Date().toISOString(), by: me, state: 'running', note: note.trim() })
            .then(() => onOpenChange(false))
            .finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={`Deploy ${service}`}
            description={`${running} is running now.`}
            confirm={{ label: 'Deploy', onConfirm: submit, why, busy, busyLabel: 'Starting' }}
        >
            <Stack gap="lg">
                <TextField id="deploy-version" label="Version" mono value={version} onChange={setVersion} autoFocus />
                <TextField
                    id="deploy-note"
                    label="What it changes"
                    value={note}
                    onChange={setNote}
                    placeholder="A fix for a slow validate step"
                />
            </Stack>
        </DialogShell>
    )
}
