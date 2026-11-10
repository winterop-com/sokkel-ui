/** The questions the studio asks in a dialog: a new file's name and place, a new name, whether to delete, and what to do with changes not saved. */

import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { useState } from 'react'

import { badName, KINDS, PROJECTS, stem, type FileKind, type Project } from './model'
import { useStudio, type Asking } from './state'

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** A new file: its project, its kind and its name. */
function NewFileDialog({ asking, onClose }: { asking: Extract<Asking, { kind: 'new' }>; onClose: () => void }) {
    const { files, createFile } = useStudio()
    const [project, setProject] = useState<Project>(asking.project)
    const [kind, setKind] = useState<FileKind>(asking.fileKind)
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)
    const [refused, setRefused] = useState<string | null>(null)
    const taken = files.filter((file) => file.project === project && file.kind === kind).map(stem)
    const issue = refused ?? badName(name, taken)
    const submit = () => {
        if (issue !== null || busy) return
        setBusy(true)
        createFile(project, kind, name.trim()).then(onClose, (error: unknown) => {
            setRefused(reason(error))
            setBusy(false)
        })
    }
    return (
        <DialogShell
            open
            onOpenChange={(open) => !open && !busy && onClose()}
            width="sm"
            phone="fit"
            title="New file"
            confirm={{ label: 'Make', onConfirm: submit, busy, busyLabel: 'Making', why: issue ?? undefined }}
        >
            <Field id="new-kind" label="Kind">
                <Segmented<FileKind>
                    id="new-kind"
                    label="Kind"
                    value={kind}
                    onValueChange={setKind}
                    options={KINDS.map((one) => ({ value: one.kind, label: one.label }))}
                    fill
                />
            </Field>
            <Field id="new-project" label="Project">
                <NativeSelect id="new-project" value={project} onChange={(event) => setProject(event.target.value as Project)}>
                    {PROJECTS.map((one) => (
                        <NativeSelectOption key={one} value={one}>
                            {one}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>
            <TextField
                id="new-name"
                label="Name"
                value={name}
                autoFocus
                description={`Saved as ${name.trim() === '' ? 'name' : name.trim()}${KINDS.find((one) => one.kind === kind)?.extension ?? ''}.`}
                error={name.trim() === '' ? null : issue}
                onChange={(next) => {
                    setName(next)
                    setRefused(null)
                }}
                onEnter={submit}
            />
        </DialogShell>
    )
}

/** A file's new name, its extension kept. */
function RenameDialog({ id, onClose }: { id: string; onClose: () => void }) {
    const { byId, files, renameFile } = useStudio()
    const file = byId.get(id)
    const [name, setName] = useState(file === undefined ? '' : stem(file))
    const [busy, setBusy] = useState(false)
    const [refused, setRefused] = useState<string | null>(null)
    if (file === undefined) return null
    const taken = files.filter((one) => one.id !== id && one.project === file.project && one.kind === file.kind).map(stem)
    const issue = refused ?? (name.trim() === stem(file) ? 'That is its name now.' : badName(name, taken))
    const submit = () => {
        if (issue !== null || busy) return
        setBusy(true)
        renameFile(id, name.trim()).then(onClose, (error: unknown) => {
            setRefused(reason(error))
            setBusy(false)
        })
    }
    return (
        <DialogShell
            open
            onOpenChange={(open) => !open && !busy && onClose()}
            width="sm"
            phone="fit"
            title={`Rename ${file.name}`}
            confirm={{ label: 'Rename', onConfirm: submit, busy, busyLabel: 'Renaming', why: issue ?? undefined }}
        >
            <TextField
                id="rename"
                label="Name"
                value={name}
                autoFocus
                error={name.trim() === '' || name.trim() === stem(file) ? null : issue}
                onChange={(next) => {
                    setName(next)
                    setRefused(null)
                }}
                onEnter={submit}
            />
        </DialogShell>
    )
}

/** Closing tabs that hold changes not saved: save them first, close without them, or keep them open. */
function CloseDialog({ ids, onClose }: { ids: readonly string[]; onClose: () => void }) {
    const { byId, dirty, save, closeNow } = useStudio()
    const [busy, setBusy] = useState(false)
    const unsaved = ids.filter((id) => dirty.has(id))
    const names = unsaved.map((id) => byId.get(id)?.name ?? id)
    const one = names.length === 1
    return (
        <DialogShell
            open
            onOpenChange={(open) => !open && !busy && onClose()}
            width="sm"
            phone="fit"
            title={one ? `Save the changes to ${names[0] ?? ''}?` : `Save the changes to ${String(names.length)} files?`}
            description={one ? 'They are lost if the tab closes without saving.' : `${names.join(', ')} hold changes that are lost if their tabs close without saving.`}
            actions={
                <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                        closeNow(ids)
                        onClose()
                    }}
                >
                    {"Don't save"}
                </Button>
            }
            confirm={{
                label: 'Save',
                busy,
                busyLabel: 'Saving',
                onConfirm: () => {
                    setBusy(true)
                    Promise.all(unsaved.map((id) => save(id))).then(
                        () => {
                            closeNow(ids)
                            onClose()
                        },
                        () => setBusy(false),
                    )
                },
            }}
        />
    )
}

/** Whichever question the studio is asking now. */
export function Dialogs() {
    const { asking, ask, byId, deleteFile, dirty } = useStudio()
    const [busy, setBusy] = useState(false)
    const close = () => ask(null)
    if (asking === null) return null
    if (asking.kind === 'new') return <NewFileDialog asking={asking} onClose={close} />
    if (asking.kind === 'rename') return <RenameDialog key={asking.id} id={asking.id} onClose={close} />
    if (asking.kind === 'close') return <CloseDialog ids={asking.ids} onClose={close} />
    const file = byId.get(asking.id)
    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => !open && !busy && close()}
            question={`Delete ${file?.name ?? 'this file'}?`}
            detail={
                dirty.has(asking.id)
                    ? 'The file and the changes not saved in it are gone for good.'
                    : 'The file is gone for good; its runs stay in Runs.'
            }
            confirm={{
                label: 'Delete',
                destructive: true,
                busy,
                busyLabel: 'Deleting',
                onConfirm: () => {
                    setBusy(true)
                    deleteFile(asking.id).then(
                        () => {
                            setBusy(false)
                            close()
                        },
                        () => setBusy(false),
                    )
                },
            }}
        />
    )
}
