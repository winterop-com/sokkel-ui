import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { download, fileName } from '@winterop-com/sokkel-ui/lib/download'
import { LoadingBar } from '@winterop-com/sokkel-ui/Loaders'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useEffect, useRef, useState } from 'react'

import { canEncode, exportEdit } from '../export'
import { EXPORT_SIZES, FPS, lengthOf, timecode, type Edit, type ExportSize } from '../model'

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`

/**
 * Exports the edit: its file's name and resolution, then every frame drawn and encoded with the
 * progress and the frames counted as they go, ending in a toast that downloads the file.
 */
export function ExportDialog({ name, edit, size, onClose }: { name: string; edit: Edit; size: ExportSize; onClose: () => void }) {
    const [file, setFile] = useState(fileName(name, 'webm', 'edit'))
    const [chosen, setChosen] = useState<ExportSize>(size)
    const [progress, setProgress] = useState<{ share: number; frames: number } | null>(null)
    const running = useRef<AbortController | null>(null)
    const length = lengthOf(edit)
    const total = Math.round(length * FPS)
    const trimmed = file.trim()

    // Stops an export still running when the dialog goes.
    useEffect(() => () => running.current?.abort(), [])

    const start = () => {
        if (progress !== null) return
        const controller = new AbortController()
        running.current = controller
        setProgress({ share: 0, frames: 0 })
        const named = trimmed.endsWith('.webm') ? trimmed : `${trimmed}.webm`
        exportEdit(edit, chosen, (share, frames) => setProgress({ share, frames }), controller.signal).then(
            (done) => {
                running.current = null
                onClose()
                const seconds = (done.took / 1000).toFixed(1)
                if (done.file === undefined) {
                    toast.add({
                        type: 'warning',
                        title: `Drew ${String(done.frames)} frames in ${seconds} s`,
                        description: 'This browser has no video encoder, so no file was made.',
                    })
                    return
                }
                const made = done.file
                toast.add({
                    type: 'success',
                    title: `${named} exported`,
                    description: `${String(done.frames)} frames at ${EXPORT_SIZES[chosen].label}, ${megabytes(made.size)}, in ${seconds} s.`,
                    actionProps: { children: 'Download', onClick: () => download(named, made) },
                })
            },
            (failure: unknown) => {
                running.current = null
                if (failure instanceof DOMException && failure.name === 'AbortError') {
                    toast.add({ title: 'Export stopped' })
                    return
                }
                setProgress(null)
                toast.add({
                    type: 'error',
                    title: 'The export failed',
                    description: failure instanceof Error ? failure.message : String(failure),
                })
            },
        )
    }

    const why = length === 0 ? 'The edit has nothing in it to export.' : trimmed === '' ? 'The file needs a name.' : undefined
    return (
        <DialogShell
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            title="Export"
            description={
                canEncode
                    ? 'Drawn frame by frame and encoded as WebM in this browser.'
                    : 'This browser has no video encoder: the frames are drawn and counted, and no file is made.'
            }
            width="sm"
            phone="fit"
            confirm={{
                label: 'Export',
                onConfirm: start,
                why,
                busy: progress !== null,
                busyLabel: 'Exporting',
                onStopWaiting: () => running.current?.abort(),
            }}
            busyRelease={0}
        >
            <Stack gap="lg">
                <TextField id="export-name" label="File name" value={file} onChange={setFile} disabled={progress !== null} mono />
                <Segmented<ExportSize>
                    label="Resolution"
                    value={chosen}
                    onValueChange={setChosen}
                    disabled={progress !== null}
                    options={(Object.keys(EXPORT_SIZES) as ExportSize[]).map((one) => ({ value: one, label: EXPORT_SIZES[one].label }))}
                />
                <DescriptionList
                    size="sm"
                    items={[
                        { term: 'Length', value: timecode(length), numeric: true },
                        { term: 'Frames', value: `${String(total)} at ${String(FPS)} a second`, numeric: true },
                        {
                            term: 'Size',
                            value: `${String(EXPORT_SIZES[chosen].width)} by ${String(EXPORT_SIZES[chosen].height)}`,
                            numeric: true,
                        },
                    ]}
                />
                {progress !== null && (
                    <Stack gap="xs">
                        <LoadingBar value={Math.round(progress.share * 100)} label="Export" />
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {progress.share >= 0.9 && progress.frames >= total
                                ? 'Mixing the sound and writing the file'
                                : `Frame ${String(progress.frames)} of ${String(total)}`}
                        </p>
                    </Stack>
                )}
            </Stack>
        </DialogShell>
    )
}
