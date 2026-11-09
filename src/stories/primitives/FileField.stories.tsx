import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { FileField, checkFiles } from '@winterop-com/sokkel-ui/FileField'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { useAttachmentField } from '@winterop-com/sokkel-ui/hooks/use-attachment-field'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { PICKED_FILES, PICKED_LIMIT, useFakeUploader } from '../fixtures/uploader'

/**
 * A field that takes files: a zone to drop them on with a button that opens the picker, the limits
 * under it, the files refused with why, and the files taken with their sizes and a remove button.
 */
const meta: Meta = { title: 'Primitives/Inputs/File field', parameters: { frame: 'column' } }
export default meta

/** A picture of the harbor at dusk as an image file, so a chosen image shows its preview. */
const PICTURE = new File(
    [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600"><rect width="400" height="300" fill="#f4845f"/><circle cx="290" cy="150" r="38" fill="#fde4a6"/><rect y="168" width="400" height="132" fill="#355070"/></svg>',
    ],
    'harbor-dusk.svg',
    { type: 'image/svg+xml' },
)

const MEGABYTE = 1_000_000

function Live({
    initial = [],
    ...props
}: { initial?: readonly File[] } & Omit<React.ComponentProps<typeof FileField>, 'value' | 'onChange'>) {
    const [files, setFiles] = useState<File[]>([...initial])
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-xl">
                <FileField {...props} value={files} onChange={setFiles} />
            </Stack>
        </TooltipProvider>
    )
}

/** An empty field: the zone with its button, and the limits it holds files to under it. */
export const Empty: StoryObj = {
    render: () => (
        <Live
            id="empty-orders"
            label="Orders"
            accept=".csv,.yaml"
            maxSize={10 * MEGABYTE}
            maxFiles={5}
            help="The rows are checked by validate before the next nightly-export."
        />
    ),
}

/** Files taken, each with its size and a remove button, an image with its picture. */
export const Chosen: StoryObj = {
    render: () => (
        <Live
            id="chosen-orders"
            label="Attachments"
            accept=".csv,.yaml,image/*"
            maxSize={10 * MEGABYTE}
            maxFiles={5}
            initial={[PICKED_FILES[0], PICKED_FILES[1], PICTURE]}
        />
    ),
}

/** One file at most: a file chosen takes the place of the one held. */
export const Single: StoryObj = {
    render: () => <Live id="single-cover" label="Cover" accept="image/*" maxSize={2 * MEGABYTE} maxFiles={1} initial={[PICTURE]} />,
}

/** Files refused as they came: one of a type not taken and one too large, each with why, until dismissed. */
export const Refused: StoryObj = {
    render: () => (
        <Live
            id="refused-orders"
            label="Orders"
            accept=".csv,.yaml"
            maxSize={PICKED_LIMIT}
            maxFiles={5}
            initial={checkFiles(PICKED_FILES, { accept: '.csv,.yaml', maxSize: PICKED_LIMIT }).taken}
            defaultRefused={checkFiles(PICKED_FILES, { accept: '.csv,.yaml', maxSize: PICKED_LIMIT }).refused}
        />
    ),
}

const SHARES = new Map<File, number>([
    [PICKED_FILES[0], 0.42],
    [PICTURE, 1],
])

/** Files the app is sending as they are chosen: one on its way up with its share, one up. */
export const Uploading: StoryObj = {
    render: () => (
        <Live
            id="uploading-orders"
            label="Attachments"
            accept=".csv,.yaml,image/*"
            maxSize={10 * MEGABYTE}
            initial={[PICKED_FILES[0], PICTURE]}
            progress={(file) => SHARES.get(file)}
        />
    ),
}

/** The two files a record of runs holds already, as stored on the server. */
const STORED = [
    { id: 'att-1', name: 'orders-2026-10.csv', size: 48_213 },
    { id: 'att-2', name: 'validate-report.yaml', size: 2_940 },
]

function Editing() {
    const uploader = useFakeUploader()
    const attachments = useAttachmentField({ stored: STORED, upload: uploader.upload, accept: '.csv,.yaml,image/*', maxFiles: 4 })
    const { kept, removed, added } = attachments.changes
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-xl">
                <FileField id="editing-attachments" label="Attachments" {...attachments.field} />
                <Row gap="sm">
                    <Button size="sm" variant="outline" onClick={uploader.step}>
                        Move uploads on
                    </Button>
                    <Button size="sm" variant="outline" onClick={uploader.failOne}>
                        Fail one
                    </Button>
                    <Button size="sm" variant="outline" disabled={!attachments.failed} onClick={attachments.retry}>
                        Retry
                    </Button>
                </Row>
                <p className="text-sm text-muted-foreground">
                    {attachments.busy
                        ? 'Saving waits for the uploads.'
                        : `To save: keep ${String(kept.length)}, remove ${String(removed.length)}, add ${String(added.length)}.`}
                </p>
            </Stack>
        </TooltipProvider>
    )
}

/**
 * A record's attachments being edited (`useAttachmentField`): the two files it holds already come
 * first and can be taken out, and new files go up as they are chosen, cancelled with their upload
 * aborted, or failed and said in place of their size. What to save is counted under the buttons,
 * which move the pretend uploads on, fail one and send failed ones again.
 */
export const Editing_: StoryObj = { name: 'Editing stored files', render: () => <Editing /> }

/** In a form beside a text field, required and left empty after a submit: its zone takes the issue's edge and mark. */
export const InForm: StoryObj = {
    name: 'In a form',
    render: function Render() {
        const [files, setFiles] = useState<File[]>([])
        return (
            <TooltipProvider>
                <Stack gap="lg" className="max-w-xl">
                    <TextField id="form-job" label="Job" mono defaultValue="import-orders" />
                    <FileField
                        id="form-orders"
                        label="Orders"
                        required
                        accept=".csv"
                        maxSize={10 * MEGABYTE}
                        error={files.length === 0 ? 'Add the orders to import.' : null}
                        value={files}
                        onChange={setFiles}
                    />
                </Stack>
            </TooltipProvider>
        )
    },
}
